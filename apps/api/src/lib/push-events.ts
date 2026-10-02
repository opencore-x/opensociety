import type { Context } from 'hono'
import { and, eq, isNull } from 'drizzle-orm'
import { residencies, users, type Database } from '@opensociety/db'
import type { PushMessage } from '@opensociety/shared'
import type { AppEnv } from '../types'
import { enqueuePush, processPushQueue } from './push-queue'

export async function apartmentRecipients(db: Database, apartmentId: string) {
  const rows = await db.select({ userId: residencies.userId }).from(residencies)
    .where(and(eq(residencies.apartmentId, apartmentId), isNull(residencies.endDate)))
  return rows.map((r) => r.userId)
}

export async function roleRecipients(db: Database, role: 'GUARD' | 'RESIDENT') {
  const rows = await db.select({ id: users.id }).from(users)
    .where(and(eq(users.role, role), eq(users.status, 'APPROVED'), eq(users.isActive, true)))
  return rows.map((r) => r.id)
}

export async function notifyEvent(
  c: Context<AppEnv>, eventKey: string, recipients: () => Promise<string[]>, message: PushMessage,
) {
  if (c.env.PUSH_ENABLED !== 'true') return false
  try {
    const db = c.get('db')
    await enqueuePush(db, await recipients(), eventKey, message)
    c.executionCtx.waitUntil(processPushQueue(db, c.env.EXPO_ACCESS_TOKEN).catch(() => {
      console.error('push: background dispatch failed; pending deliveries will retry')
    }))
    return true
  } catch {
    // The business action has already succeeded. Do not make the client repeat it.
    console.error('push: could not enqueue event', eventKey)
    return false
  }
}
