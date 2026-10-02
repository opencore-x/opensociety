import { asc, inArray } from 'drizzle-orm'
import { pushDeliveries, type Database } from '@opensociety/db'
import type { Bindings } from '../types'
import { processPushQueue } from './push-queue'

export async function requestPushDispatch(env: Pick<Bindings, 'PUSH_DISPATCH'>, delaySeconds = 0) {
  if (!env.PUSH_DISPATCH) throw new Error('PUSH_DISPATCH queue is not configured')
  await env.PUSH_DISPATCH.send({ type: 'dispatch' }, { delaySeconds })
}

export async function dispatchAndSchedule(db: Database, env: Pick<Bindings, 'PUSH_DISPATCH' | 'EXPO_ACCESS_TOKEN'>, now = new Date()) {
  await processPushQueue(db, env.EXPO_ACCESS_TOKEN, now)
  const [pending] = await db.select({ nextAttemptAt: pushDeliveries.nextAttemptAt }).from(pushDeliveries)
    .where(inArray(pushDeliveries.status, ['queued', 'sending', 'receipt']))
    .orderBy(asc(pushDeliveries.nextAttemptAt)).limit(1)
  // No database polling when idle. The next business event starts a new chain.
  if (pending) {
    const delay = Math.max(1, Math.min(43_200, Math.ceil((pending.nextAttemptAt.getTime() - Date.now()) / 1000)))
    await requestPushDispatch(env, delay)
  }
}
