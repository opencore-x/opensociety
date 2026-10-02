import { and, eq, gt, inArray, lte, sql } from 'drizzle-orm'
import { pushDevices, pushDeliveries, users, type Database } from '@opensociety/db'
import { pushMessageSchema, type PushMessage } from '@opensociety/shared'
import { getExpoReceipts, isRetryablePushError, PushTransportError, pushRetryAt, sendExpoMessages, type ExpoResult } from './expo-push'

const MAX_ATTEMPTS = 5
const BATCH_SIZE = 100
type Delivery = typeof pushDeliveries.$inferSelect

export async function enqueuePush(db: Database, userIds: string[], eventKey: string, message: PushMessage, now = new Date()) {
  const recipients = [...new Set(userIds)]
  if (!recipients.length) return
  const validated = pushMessageSchema.parse(message)
  const devices = await db.select({ token: pushDevices.token, userId: pushDevices.userId })
    .from(pushDevices).innerJoin(users, eq(users.id, pushDevices.userId))
    .where(and(inArray(pushDevices.userId, recipients), eq(users.status, 'APPROVED'), eq(users.isActive, true),
      gt(pushDevices.updatedAt, new Date(now.getTime() - 30 * 86400_000))))
  for (let i = 0; i < devices.length; i += BATCH_SIZE) {
    await db.insert(pushDeliveries).values(devices.slice(i, i + BATCH_SIZE).map((device) => ({
      ...device, eventKey, message: validated, expiresAt: new Date(now.getTime() + 86400_000),
    }))).onConflictDoNothing()
  }
}

async function updateDelivery(db: Database, row: Delivery, values: Partial<typeof pushDeliveries.$inferInsert>) {
  // Only the worker holding this lease may settle the row.
  await db.update(pushDeliveries).set(values).where(and(
    eq(pushDeliveries.id, row.id), eq(pushDeliveries.attempts, row.attempts),
    eq(pushDeliveries.nextAttemptAt, row.nextAttemptAt),
  ))
}

async function failed(db: Database, row: Delivery, code: string, retryable: boolean, now: Date) {
  const retry = retryable && row.attempts < MAX_ATTEMPTS && row.expiresAt > now
  await updateDelivery(db, row, {
    status: retry ? 'queued' : 'failed', lastError: code, ticketId: null,
    nextAttemptAt: pushRetryAt(row.attempts, now),
  })
}

async function settleResult(db: Database, row: Delivery, result: ExpoResult, receipt: boolean, now: Date) {
  if (result.status === 'ok') {
    await updateDelivery(db, row, {
      status: receipt ? 'delivered' : 'receipt', ticketId: result.id ?? row.ticketId,
      nextAttemptAt: new Date(now.getTime() + 15 * 60_000), lastError: null,
    })
    return
  }
  const code = result.details?.error ?? 'unknown_expo_error'
  if (code === 'DeviceNotRegistered') {
    await db.delete(pushDevices).where(and(eq(pushDevices.token, row.token), eq(pushDevices.userId, row.userId), lte(pushDevices.updatedAt, row.createdAt)))
    await failed(db, row, code, false, now)
    return
  }
  await failed(db, row, code, isRetryablePushError(code), now)
}

export async function processPushQueue(db: Database, accessToken?: string, now = new Date()) {
  // A single statement claims a bounded batch across overlapping cron/HTTP workers.
  const claimed = await db.update(pushDeliveries).set({
    status: 'sending', attempts: sql`${pushDeliveries.attempts} + 1`, nextAttemptAt: new Date(now.getTime() + 60_000),
  }).where(sql`${pushDeliveries.id} in (
    select id from push_deliveries
    where status in ('queued', 'sending') and next_attempt_at <= ${now}
      and expires_at > ${now} and attempts < ${MAX_ATTEMPTS}
    order by next_attempt_at, id limit ${BATCH_SIZE} for update skip locked
  )`).returning()

  const sendable: (Delivery & { message: PushMessage })[] = []
  if (claimed.length) {
    const current = await db.select({ token: pushDevices.token, userId: pushDevices.userId }).from(pushDevices)
      .innerJoin(users, eq(users.id, pushDevices.userId))
      .where(and(inArray(pushDevices.token, claimed.map((r) => r.token)), eq(users.isActive, true), eq(users.status, 'APPROVED')))
    const owners = new Map(current.map((r) => [r.token, r.userId]))
    for (const row of claimed) {
      const parsed = pushMessageSchema.safeParse(row.message)
      if (owners.get(row.token) !== row.userId || !parsed.success) {
        await failed(db, row, 'recipient_or_payload_changed', false, now)
      } else sendable.push({ ...row, message: parsed.data })
    }
  }
  if (sendable.length) {
    let results: ExpoResult[]
    try { results = await sendExpoMessages(sendable.map((r) => ({ ...r.message, to: r.token })), accessToken) }
    catch (error) {
      const failure = error instanceof PushTransportError ? error : new PushTransportError('transport_error', true)
      for (const row of sendable) await failed(db, row, failure.code, failure.retryable, now)
      return
    }
    for (let i = 0; i < sendable.length; i++) await settleResult(db, sendable[i], results[i], false, now)
  }

  const receipts = await db.update(pushDeliveries).set({ nextAttemptAt: new Date(now.getTime() + 60_000) })
    .where(sql`${pushDeliveries.id} in (
      select id from push_deliveries where status = 'receipt'
        and next_attempt_at <= ${now} and expires_at > ${now}
      order by next_attempt_at, id limit ${BATCH_SIZE} for update skip locked
    )`).returning()
  if (receipts.length) {
    const results = await getExpoReceipts(receipts.flatMap((r) => r.ticketId ? [r.ticketId] : []), accessToken)
    for (const row of receipts) {
      const result = row.ticketId ? results[row.ticketId] : undefined
      if (result) await settleResult(db, row, result, true, now)
      else await updateDelivery(db, row, { nextAttemptAt: new Date(now.getTime() + 15 * 60_000) })
    }
  }
  await db.update(pushDeliveries).set({ status: 'failed', lastError: 'expired_or_attempts_exhausted' }).where(sql`
    ${pushDeliveries.status} in ('queued', 'sending', 'receipt') and (
      ${pushDeliveries.expiresAt} <= ${now} or (${pushDeliveries.status} = 'sending' and ${pushDeliveries.attempts} >= ${MAX_ATTEMPTS} and ${pushDeliveries.nextAttemptAt} <= ${now})
    )`)
  await db.delete(pushDeliveries).where(lte(pushDeliveries.createdAt, new Date(now.getTime() - 7 * 86400_000)))
}
