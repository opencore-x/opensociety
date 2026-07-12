import { Hono } from 'hono'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { maintenanceBills, payments } from '@opensociety/db'
import { withDb, withAuth, requireRole } from '../middleware'
import type { AppEnv } from '../types'

export const reportRoutes = new Hono<AppEnv>()
reportRoutes.use('*', withDb)
reportRoutes.use('*', withAuth)
reportRoutes.use('*', requireRole('ADMIN'))

// Finance report: monthly billed-vs-collected summary + payment-method breakdown.
reportRoutes.get('/finance', async (c) => {
  const db = c.get('db')

  const billed = await db
    .select({ period: maintenanceBills.periodMonth, billed: sql<number>`coalesce(sum(${maintenanceBills.totalAmount}), 0)` })
    .from(maintenanceBills)
    .where(and(isNotNull(maintenanceBills.periodMonth), sql`${maintenanceBills.status} <> 'CANCELLED'`))
    .groupBy(maintenanceBills.periodMonth)

  const collected = await db
    .select({ period: maintenanceBills.periodMonth, collected: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(maintenanceBills, eq(maintenanceBills.id, payments.billId))
    .where(isNotNull(maintenanceBills.periodMonth))
    .groupBy(maintenanceBills.periodMonth)
  const collectedByPeriod = new Map(collected.map((r) => [r.period, Number(r.collected)]))

  const byMonth = billed
    .map((b) => ({ period: b.period as string, billed: Number(b.billed), collected: collectedByPeriod.get(b.period) ?? 0 }))
    .sort((a, b) => b.period.localeCompare(a.period))

  const methods = await db
    .select({ method: payments.method, amount: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .groupBy(payments.method)

  return c.json({
    byMonth,
    byMethod: methods.map((m) => ({ method: m.method, amount: Number(m.amount) })).sort((a, b) => b.amount - a.amount),
    totalBilled: byMonth.reduce((s, r) => s + r.billed, 0),
    totalCollected: byMonth.reduce((s, r) => s + r.collected, 0),
  })
})
