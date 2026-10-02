import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { createDb, billConfig } from '@opensociety/db'
import { periodMonthOf, dueDateForPeriod } from '@opensociety/shared'
import type { AppEnv, Bindings } from './types'
import { generateMonthlyBills } from './lib/generate-bills'
import { safePostBill } from './lib/ledger-posting'
import { societyRoutes } from './routes/society'
import { apartmentRoutes } from './routes/apartments'
import { visitorRoutes } from './routes/visitors'
import { noticeRoutes } from './routes/notices'
import { userRoutes } from './routes/users'
import { guardRoutes } from './routes/guards'
import { ticketRoutes } from './routes/tickets'
import { houseHelpRoutes } from './routes/house-help'
import { vehicleRoutes } from './routes/vehicles'
import { parkingRoutes } from './routes/parking'
import { uploadRoutes } from './routes/uploads'
import { billRoutes } from './routes/bills'
import { paymentRoutes } from './routes/payments'
import { billConfigRoutes } from './routes/bill-config'
import { reportRoutes } from './routes/reports'
import { ledgerRoutes } from './routes/ledger'
import { expenseRoutes } from './routes/expenses'
import { webhookRoutes } from './routes/webhooks'
import { pushRoutes } from './routes/push'
import { dispatchAndSchedule, requestPushDispatch } from './lib/push-dispatch'
import { sendBillReminders } from './lib/bill-reminders'

export const app = new Hono<AppEnv>()

// TODO: tighten origins once web/mobile deploy URLs are known.
app.use('*', cors())

// Health checks intentionally avoid the DB so they work without DATABASE_URL.
app.get('/', (c) => c.json({ name: 'opensociety-api', status: 'ok' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/society', societyRoutes)
app.route('/apartments', apartmentRoutes)
app.route('/visitors', visitorRoutes)
app.route('/notices', noticeRoutes)
app.route('/users', userRoutes)
app.route('/guards', guardRoutes)
app.route('/tickets', ticketRoutes)
app.route('/house-help', houseHelpRoutes)
app.route('/vehicles', vehicleRoutes)
app.route('/parking', parkingRoutes)
app.route('/uploads', uploadRoutes)
app.route('/bills', billRoutes)
app.route('/payments', paymentRoutes)
app.route('/bill-config', billConfigRoutes)
app.route('/reports', reportRoutes)
app.route('/ledger', ledgerRoutes)
app.route('/expenses', expenseRoutes)
app.route('/webhooks', webhookRoutes)
app.route('/push', pushRoutes)

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'internal error' }, 500)
})

// Monthly cron (see wrangler.jsonc crons): generate bills for the current month
// from the saved bill config. Idempotent, so re-runs are safe.
export async function runMonthlyBilling(env: Bindings, scheduledTime: number) {
  const db = createDb(env.DATABASE_URL)
  const [cfg] = await db.select().from(billConfig).limit(1)
  if (!cfg || cfg.lineItems.length === 0) {
    console.log('auto-billing: no bill config set; skipping')
    return
  }
  const period = periodMonthOf(new Date(scheduledTime))
  const result = await generateMonthlyBills(db, {
    periodMonth: period,
    title: `Maintenance — ${period}`,
    dueDate: new Date(dueDateForPeriod(period, cfg.dueDayOfMonth)),
    lineItems: cfg.lineItems,
  })
  for (const billId of result.billIds) await safePostBill(db, billId)
  console.log(`auto-billing ${period}: created ${result.created}, skipped ${result.skipped}`)
  // TODO: notify residents when bills are generated (blocked on the push service, #15).
}

export default {
  fetch: app.fetch,
  async queue(batch: MessageBatch<{ type: 'dispatch' }>, env: Bindings) {
    if (env.PUSH_ENABLED !== 'true') { batch.ackAll(); return }
    try {
      // Wake-up messages carry no personal data and can be collapsed into one pass.
      await dispatchAndSchedule(createDb(env.DATABASE_URL), env)
      batch.ackAll()
    } catch {
      console.error('push: dispatch failed; retrying queue batch')
      batch.retryAll({ delaySeconds: 60 })
    }
  },
  async scheduled(controller: ScheduledController, env: Bindings, ctx: ExecutionContext) {
    if (controller.cron === '0 0 1 * *') ctx.waitUntil(runMonthlyBilling(env, controller.scheduledTime))
    if (controller.cron === '0 * * * *' && env.PUSH_ENABLED === 'true') {
      ctx.waitUntil((async () => {
        const ran = await sendBillReminders(createDb(env.DATABASE_URL), {
          now: new Date(controller.scheduledTime), days: env.BILL_REMINDER_DAYS, timeZone: env.SOCIETY_TIME_ZONE,
        })
        // The daily reminder run also recovers DB events whose queue publication failed.
        if (ran) await requestPushDispatch(env)
      })())
    }
  },
}
