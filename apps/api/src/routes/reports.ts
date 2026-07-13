import { Hono } from 'hono'
import { and, eq, isNotNull, sql } from 'drizzle-orm'
import { maintenanceBills, payments, apartments } from '@opensociety/db'
import { analyzePayers, collectionRatePct } from '@opensociety/shared'
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

// Collection analytics (#70): monthly rate trend, tower-wise comparison,
// early/late payer patterns, and efficiency metrics.
reportRoutes.get('/collection-analytics', async (c) => {
  const db = c.get('db')
  const notCancelled = sql`${maintenanceBills.status} <> 'CANCELLED'`

  // Monthly billed vs collected -> rate trend.
  const billedByMonth = await db
    .select({ period: maintenanceBills.periodMonth, billed: sql<number>`coalesce(sum(${maintenanceBills.totalAmount}), 0)` })
    .from(maintenanceBills)
    .where(and(isNotNull(maintenanceBills.periodMonth), notCancelled))
    .groupBy(maintenanceBills.periodMonth)
  const collectedByMonth = await db
    .select({ period: maintenanceBills.periodMonth, collected: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(maintenanceBills, eq(maintenanceBills.id, payments.billId))
    .where(isNotNull(maintenanceBills.periodMonth))
    .groupBy(maintenanceBills.periodMonth)
  const collMonth = new Map(collectedByMonth.map((r) => [r.period, Number(r.collected)]))
  const byMonth = billedByMonth
    .map((b) => {
      const billed = Number(b.billed)
      const collected = collMonth.get(b.period) ?? 0
      return { period: b.period as string, billed, collected, ratePct: collectionRatePct(billed, collected) }
    })
    .sort((a, b) => a.period.localeCompare(b.period))

  // Tower-wise billed vs collected.
  const billedByTower = await db
    .select({ tower: apartments.tower, billed: sql<number>`coalesce(sum(${maintenanceBills.totalAmount}), 0)` })
    .from(maintenanceBills)
    .innerJoin(apartments, eq(apartments.id, maintenanceBills.apartmentId))
    .where(notCancelled)
    .groupBy(apartments.tower)
  const collectedByTower = await db
    .select({ tower: apartments.tower, collected: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .innerJoin(apartments, eq(apartments.id, payments.apartmentId))
    .groupBy(apartments.tower)
  const collTower = new Map(collectedByTower.map((r) => [r.tower, Number(r.collected)]))
  const byTower = billedByTower
    .map((t) => ({ tower: t.tower, billed: Number(t.billed), collected: collTower.get(t.tower) ?? 0 }))
    .sort((a, b) => a.tower.localeCompare(b.tower))

  // Per-bill settlement timing for early/late analysis (dated bills only).
  const perBill = await db
    .select({
      dueDate: maintenanceBills.dueDate,
      total: maintenanceBills.totalAmount,
      paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
      lastPaidAt: sql<string | null>`max(${payments.paidAt})`,
    })
    .from(maintenanceBills)
    .leftJoin(payments, eq(payments.billId, maintenanceBills.id))
    .where(and(isNotNull(maintenanceBills.dueDate), notCancelled))
    .groupBy(maintenanceBills.id, maintenanceBills.dueDate, maintenanceBills.totalAmount)
  const payers = analyzePayers(
    perBill.map((r) => ({
      dueDateMs: new Date(r.dueDate as unknown as string).getTime(),
      total: Number(r.total),
      paid: Number(r.paid),
      lastPaidAtMs: r.lastPaidAt ? new Date(r.lastPaidAt).getTime() : null,
    })),
  )

  const totalBilled = byMonth.reduce((s, r) => s + r.billed, 0)
  const totalCollected = byMonth.reduce((s, r) => s + r.collected, 0)
  const datedBills = payers.fullyPaid + payers.outstanding

  return c.json({
    byMonth,
    byTower,
    payers,
    totalBilled,
    totalCollected,
    overallRatePct: collectionRatePct(totalBilled, totalCollected),
    fullyPaidPct: datedBills > 0 ? Math.round((payers.fullyPaid / datedBills) * 1000) / 10 : 0,
  })
})
