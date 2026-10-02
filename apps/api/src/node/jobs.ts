import { createDb } from '@opensociety/db'
import { runMonthlyBilling } from '../index'
import { sendBillReminders } from '../lib/bill-reminders'
import { dispatchAndSchedule } from '../lib/push-dispatch'
import type { Bindings } from '../types'
import { createWakeup } from './wakeup'

export function startJobs(env: Bindings, billingEnabled: boolean) {
  const failed = (name: string) => () => console.error(`${name}: job failed; retrying in one minute`)
  const push = createWakeup(async () => {
    await dispatchAndSchedule(createDb(env.DATABASE_URL), env)
  }, failed('push'))
  const billing = createWakeup(async () => {
    await runMonthlyBilling(env, Date.now())
    const now = new Date()
    billing.schedule(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1) - now.getTime())
  }, failed('billing'))
  const reminders = createWakeup(async () => {
    const ran = await sendBillReminders(createDb(env.DATABASE_URL), {
      now: new Date(), days: env.BILL_REMINDER_DAYS, timeZone: env.SOCIETY_TIME_ZONE,
    })
    if (ran) push.schedule()
    reminders.schedule(3600_000 - Date.now() % 3600_000)
  }, failed('reminders'))
  if (env.PUSH_ENABLED === 'true') {
    env.PUSH_DISPATCH = { async send(_body, options) { push.schedule((options?.delaySeconds ?? 0) * 1000) } }
    push.schedule() // Recover persisted deliveries, including unexpired leases, after a restart.
    reminders.schedule()
  }
  if (billingEnabled) billing.schedule() // Catch up the current month using the unique bill index.
  return async () => { await Promise.all([push.stop(), billing.stop(), reminders.stop()]) }
}
