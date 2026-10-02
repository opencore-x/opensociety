import type { BatchItem } from 'drizzle-orm/batch'
import { and, eq, gt, inArray, lte, sql } from 'drizzle-orm'
import { pushDevices, pushDeliveries, users, maintenanceBills, type Database } from '@opensociety/db'
import { pushMessageSchema, type PushMessage } from '@opensociety/shared'
import { getExpoReceipts, isRetryablePushError, PushTransportError, pushRetryAt, sendExpoMessages, type ExpoResult } from './expo-push'

const MAX_ATTEMPTS = 5
const BATCH_SIZE = 100
type Delivery = typeof pushDeliveries.$inferSelect

export type PushEvent = { userIds: string[]; eventKey: string; message: PushMessage }

export async function enqueuePush(db: Database, userIds: string[], eventKey: string, message: PushMessage, now = new Date()) {
  return enqueuePushBatch(db, [{ userIds, eventKey, message }], now)
}

export async function enqueuePushBatch(db: Database, events: PushEvent[], now = new Date()) {
  const recipients = [...new Set(events.flatMap((event) => event.userIds))]
  if (!recipients.length) return
  const validated = events.map((event) => ({ ...event, message: pushMessageSchema.parse(event.message) }))
  const devices = await db.select({ token: pushDevices.token, userId: pushDevices.userId })
    .from(pushDevices).innerJoin(users, eq(users.id, pushDevices.userId))
    .where(and(inArray(pushDevices.userId, recipients), eq(users.status, 'APPROVED'), eq(users.isActive, true),
      gt(pushDevices.updatedAt, new Date(now.getTime() - 30 * 86400_000))))
  const byUser = new Map<string, typeof devices>()
  for (const device of devices) byUser.set(device.userId, [...(byUser.get(device.userId) ?? []), device])
  const deliveries = validated.flatMap((event) => [...new Set(event.userIds)].flatMap((userId) =>
    (byUser.get(userId) ?? []).map((device) => ({
      ...device, eventKey: event.eventKey, message: event.message, createdAt: now, nextAttemptAt: now,
      expiresAt: new Date(now.getTime() + 86400_000),
    }))))
  for (let i = 0; i < deliveries.length; i += BATCH_SIZE) {
    await db.insert(pushDeliveries).values(deliveries.slice(i, i + BATCH_SIZE)).onConflictDoNothing()
  }
}

function updateDelivery(db: Database, row: Delivery, values: Partial<typeof pushDeliveries.$inferInsert>) {
  // Only the worker holding this lease may settle the row.
  return db.update(pushDeliveries).set(values).where(and(
    eq(pushDeliveries.id, row.id), eq(pushDeliveries.attempts, row.attempts),
    eq(pushDeliveries.nextAttemptAt, row.nextAttemptAt),
  ))
}

function failed(db: Database, row: Delivery, code: string, retryable: boolean, now: Date) {
  const retry = retryable && row.attempts < MAX_ATTEMPTS && row.expiresAt > now
  return updateDelivery(db, row, {
    status: retry ? 'queued' : 'failed', lastError: code, ticketId: null,
    nextAttemptAt: pushRetryAt(row.attempts, now),
  })
}

function settleResult(db: Database, row: Delivery, result: ExpoResult, receipt: boolean, now: Date) {
  if (result.status === 'ok') {
    return [updateDelivery(db, row, {
      status: receipt ? 'delivered' : 'receipt', ticketId: result.id ?? row.ticketId,
      nextAttemptAt: new Date(now.getTime() + 15 * 60_000), lastError: null,
    })]
  }
  const code = result.details?.error ?? 'unknown_expo_error'
  const changes: Settlement[] = [failed(db, row, code, isRetryablePushError(code), now)]
  if (code === 'DeviceNotRegistered') {
    changes.push(db.delete(pushDevices).where(and(eq(pushDevices.token, row.token), eq(pushDevices.userId, row.userId), lte(pushDevices.updatedAt, row.createdAt))))
  }
  return changes
}

type Settlement = BatchItem<'pg'>
async function settleBatch(db: Database, changes: Settlement[]) {
  const [first, ...rest] = changes
  if (first) await db.batch([first, ...rest])
}

export async function processPushQueue(db: Database, accessToken?: string, now = new Date()) {
  // Bound background work to leave time for receipt processing within waitUntil.
  const deadline = Date.now() + 10_000
  for (let batch = 0; batch < 5; batch++) {
    // A single statement claims a batch across overlapping cron/HTTP workers.
    // Time-sensitive gate traffic takes precedence over large broadcasts.
    const claimed = await db.update(pushDeliveries).set({
      status: 'sending', attempts: sql`${pushDeliveries.attempts} + 1`, nextAttemptAt: new Date(now.getTime() + 60_000),
    }).where(sql`${pushDeliveries.id} in (
      select id from push_deliveries
      where status in ('queued', 'sending') and next_attempt_at <= ${now.toISOString()}
        and expires_at > ${now.toISOString()} and attempts < ${MAX_ATTEMPTS}
      order by case when message->'data'->>'screen' in ('visitors', 'gate') then 0 else 1 end,
        next_attempt_at, id limit ${BATCH_SIZE} for update skip locked
    )`).returning()
    if (!claimed.length) break

    const current = await db.select({ token: pushDevices.token, userId: pushDevices.userId }).from(pushDevices)
      .innerJoin(users, eq(users.id, pushDevices.userId))
      .where(and(inArray(pushDevices.token, claimed.map((r) => r.token)), eq(users.isActive, true), eq(users.status, 'APPROVED')))
    const owners = new Map(current.map((r) => [r.token, r.userId]))
    const billId = (row: Delivery) => /^bill:([0-9a-f-]{36}):reminder:/.exec(row.eventKey)?.[1]
    const billIds = [...new Set(claimed.flatMap((row) => billId(row) ? [billId(row)!] : []))]
    const payableBills = billIds.length ? await db.select({ id: maintenanceBills.id }).from(maintenanceBills).where(and(
      inArray(maintenanceBills.id, billIds), inArray(maintenanceBills.status, ['ISSUED', 'PARTIALLY_PAID']),
      sql`${maintenanceBills.totalAmount} > coalesce((select sum(amount) from payments where bill_id = ${maintenanceBills.id}), 0)`,
    )) : []
    const payable = new Set(payableBills.map((bill) => bill.id))
    const sendable: (Delivery & { message: PushMessage })[] = []
    const changes: Settlement[] = []
    for (const row of claimed) {
      const parsed = pushMessageSchema.safeParse(row.message)
      if (owners.get(row.token) !== row.userId || !parsed.success) {
        changes.push(failed(db, row, 'recipient_or_payload_changed', false, now))
      } else if (billId(row) && !payable.has(billId(row)!)) {
        changes.push(failed(db, row, 'bill_no_longer_payable', false, now))
      } else sendable.push({ ...row, message: parsed.data })
    }
    let transportFailed = false
    if (sendable.length) {
      try {
        const results = await sendExpoMessages(sendable.map((r) => ({ ...r.message, to: r.token })), accessToken)
        sendable.forEach((row, i) => changes.push(...settleResult(db, row, results[i], false, now)))
      } catch (error) {
        const failure = error instanceof PushTransportError ? error : new PushTransportError('transport_error', true)
        changes.push(...sendable.map((row) => failed(db, row, failure.code, failure.retryable, now)))
        transportFailed = true
      }
    }
    // Neon executes the changes in one transaction/HTTP request, including dead-token cleanup.
    await settleBatch(db, changes)
    if (transportFailed || claimed.length < BATCH_SIZE || Date.now() >= deadline) break
  }

  const receipts = await db.update(pushDeliveries).set({ nextAttemptAt: new Date(now.getTime() + 60_000) })
    .where(sql`${pushDeliveries.id} in (
      select id from push_deliveries where status = 'receipt'
        and next_attempt_at <= ${now.toISOString()} and expires_at > ${now.toISOString()}
      order by next_attempt_at, id limit ${BATCH_SIZE * 5} for update skip locked
    )`).returning()
  if (receipts.length) {
    const results = await getExpoReceipts(receipts.flatMap((r) => r.ticketId ? [r.ticketId] : []), accessToken)
    const changes = receipts.flatMap((row) => {
      const result = row.ticketId ? results[row.ticketId] : undefined
      return result ? settleResult(db, row, result, true, now)
        : [updateDelivery(db, row, { nextAttemptAt: new Date(now.getTime() + 15 * 60_000) })]
    })
    await settleBatch(db, changes)
  }

  await db.update(pushDeliveries).set({ status: 'failed', lastError: 'expired_or_attempts_exhausted' }).where(sql`
    ${pushDeliveries.status} in ('queued', 'sending', 'receipt') and (
      ${pushDeliveries.expiresAt} <= ${now.toISOString()} or (${pushDeliveries.status} = 'sending' and ${pushDeliveries.attempts} >= ${MAX_ATTEMPTS} and ${pushDeliveries.nextAttemptAt} <= ${now.toISOString()})
    )`)
  await db.delete(pushDeliveries).where(lte(pushDeliveries.createdAt, new Date(now.getTime() - 7 * 86400_000)))
}
