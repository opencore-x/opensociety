import { Hono } from 'hono'
import type { Context } from 'hono'
import { and, eq, gte, inArray, isNotNull, lt, lte, sql } from 'drizzle-orm'
import {
  maintenanceBills,
  payments,
  apartments,
  visitorEntries,
  societyConfig,
  houseHelp,
  houseHelpEntries,
  maintenanceTickets,
  accounts,
  journalEntries,
  journalLines,
} from '@opensociety/db'
import {
  analyzePayers,
  collectionRatePct,
  fillHours,
  peakHour,
  averagePerDay,
  fillDaysOfWeek,
  avgResolutionHours,
  trialBalance,
  incomeExpenditure,
  balanceSheet,
  receiptsAndPayments,
  type AccountBalance,
  type CashEntryLine,
} from '@opensociety/shared'
import type { VisitorTrends } from '@opensociety/shared'
import { withDb, withAuth, requireRole } from '../middleware'
import { renderVisitorTrendsPdf } from '../lib/visitor-trends-pdf'
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

// Visitor trends (#68): peak hours, per-day counts, and type breakdown over a
// date range (default: last 30 days). Times bucketed in IST. Shared by the JSON
// dashboard endpoint and the PDF export.
async function computeVisitorTrends(c: Context<AppEnv>): Promise<VisitorTrends> {
  const db = c.get('db')
  const toParam = c.req.query('to')
  const fromParam = c.req.query('from')
  const toDate = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date()
  const fromDate = fromParam ? new Date(`${fromParam}T00:00:00.000Z`) : new Date(Date.now() - 30 * 86_400_000)
  const range = and(gte(visitorEntries.createdAt, fromDate), lte(visitorEntries.createdAt, toDate))
  // Interpret the stored (UTC) timestamp in IST before bucketing.
  const ist = sql`((${visitorEntries.createdAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata')`

  const hours = await db
    .select({ hour: sql<number>`extract(hour from ${ist})::int`, count: sql<number>`count(*)::int` })
    .from(visitorEntries)
    .where(range)
    .groupBy(sql`extract(hour from ${ist})`)
  const byHour = fillHours(hours.map((h) => ({ hour: Number(h.hour), count: Number(h.count) })))

  const types = await db
    .select({ type: visitorEntries.type, count: sql<number>`count(*)::int` })
    .from(visitorEntries)
    .where(range)
    .groupBy(visitorEntries.type)
  const byType = types.map((t) => ({ type: t.type, count: Number(t.count) })).sort((a, b) => b.count - a.count)

  const days = await db
    .select({ date: sql<string>`to_char(${ist}, 'YYYY-MM-DD')`, count: sql<number>`count(*)::int` })
    .from(visitorEntries)
    .where(range)
    .groupBy(sql`to_char(${ist}, 'YYYY-MM-DD')`)
  const byDay = days.map((d) => ({ date: d.date, count: Number(d.count) })).sort((a, b) => a.date.localeCompare(b.date))

  const total = byType.reduce((s, t) => s + t.count, 0)

  return {
    from: fromDate.toISOString().slice(0, 10),
    to: toDate.toISOString().slice(0, 10),
    total,
    distinctDays: byDay.length,
    avgPerDay: averagePerDay(total, byDay.length),
    peakHour: peakHour(byHour),
    byHour,
    byType,
    byDay,
  }
}

reportRoutes.get('/visitor-trends', async (c) => c.json(await computeVisitorTrends(c)))

// ----- Statutory financial statements (#98), derived off the ledger -----

// Per-account debit/credit totals over an optional entry-date window.
async function accountBalances(
  c: Context<AppEnv>,
  opts: { fromDate?: string; toDate?: string },
): Promise<AccountBalance[]> {
  const conds = []
  if (opts.fromDate) conds.push(gte(journalEntries.entryDate, opts.fromDate))
  if (opts.toDate) conds.push(lte(journalEntries.entryDate, opts.toDate))
  const rows = await c
    .get('db')
    .select({
      code: accounts.code,
      name: accounts.name,
      type: accounts.type,
      isMutual: accounts.isMutual,
      debit: sql<number>`coalesce(sum(${journalLines.debit}), 0)`,
      credit: sql<number>`coalesce(sum(${journalLines.credit}), 0)`,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(accounts.code, accounts.name, accounts.type, accounts.isMutual)
  return rows.map((r) => ({ ...r, debit: Number(r.debit), credit: Number(r.credit) }))
}

// Trial Balance as of ?toDate (default: all). Nets to zero.
reportRoutes.get('/trial-balance', async (c) => {
  const toDate = c.req.query('toDate')
  return c.json({ toDate: toDate ?? null, ...trialBalance(await accountBalances(c, { toDate })) })
})

// Income & Expenditure (accrual) for ?fromDate..?toDate.
reportRoutes.get('/income-expenditure', async (c) => {
  const fromDate = c.req.query('fromDate')
  const toDate = c.req.query('toDate')
  return c.json({ fromDate: fromDate ?? null, toDate: toDate ?? null, ...incomeExpenditure(await accountBalances(c, { fromDate, toDate })) })
})

// Balance Sheet as of ?toDate. Current surplus = I&E surplus up to the same date
// so the sheet balances.
reportRoutes.get('/balance-sheet', async (c) => {
  const toDate = c.req.query('toDate')
  const balances = await accountBalances(c, { toDate })
  const surplus = incomeExpenditure(balances).surplus
  return c.json({ toDate: toDate ?? null, ...balanceSheet(balances, surplus) })
})

// Receipts & Payments (cash basis) for ?fromDate..?toDate.
reportRoutes.get('/receipts-payments', async (c) => {
  const db = c.get('db')
  const fromDate = c.req.query('fromDate')
  const toDate = c.req.query('toDate')

  // Cash/bank leaf accounts (codes 10xx, e.g. Bank, Cash in Hand).
  const cashAccts = await db
    .select({ id: accounts.id })
    .from(accounts)
    .where(and(sql`${accounts.code} like '10%'`, eq(accounts.isGroup, false)))
  const cashIds = cashAccts.map((a) => a.id)
  if (cashIds.length === 0) {
    return c.json({ fromDate: fromDate ?? null, toDate: toDate ?? null, openingBalance: 0, receipts: [], payments: [], totalReceipts: 0, totalPayments: 0, closingBalance: 0 })
  }

  // Opening cash balance = Σ(debit − credit) on cash accounts before the window.
  let openingBalance = 0
  if (fromDate) {
    const [{ opening }] = await db
      .select({ opening: sql<number>`coalesce(sum(${journalLines.debit} - ${journalLines.credit}), 0)` })
      .from(journalLines)
      .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
      .where(and(inArray(journalLines.accountId, cashIds), lt(journalEntries.entryDate, fromDate)))
    openingBalance = Number(opening)
  }

  // Entries that touch a cash account within the window.
  const entryConds = [inArray(journalLines.accountId, cashIds)]
  if (fromDate) entryConds.push(gte(journalEntries.entryDate, fromDate))
  if (toDate) entryConds.push(lte(journalEntries.entryDate, toDate))
  const entryRows = await db
    .selectDistinct({ entryId: journalLines.entryId })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .where(and(...entryConds))
  const entryIds = entryRows.map((r) => r.entryId)
  if (entryIds.length === 0) {
    return c.json({ fromDate: fromDate ?? null, toDate: toDate ?? null, openingBalance, receipts: [], payments: [], totalReceipts: 0, totalPayments: 0, closingBalance: openingBalance })
  }

  const cashSet = new Set(cashIds)
  const lineRows = await db
    .select({
      entryId: journalLines.entryId,
      accountId: journalLines.accountId,
      code: accounts.code,
      name: accounts.name,
      debit: journalLines.debit,
      credit: journalLines.credit,
    })
    .from(journalLines)
    .innerJoin(accounts, eq(accounts.id, journalLines.accountId))
    .where(inArray(journalLines.entryId, entryIds))
  const lines: CashEntryLine[] = lineRows.map((l) => ({
    entryId: l.entryId,
    accountCode: l.code,
    accountName: l.name,
    isCashBank: cashSet.has(l.accountId),
    debit: l.debit,
    credit: l.credit,
  }))

  return c.json({ fromDate: fromDate ?? null, toDate: toDate ?? null, ...receiptsAndPayments(lines, openingBalance) })
})

// House-help insights (#69): active-help count, most-employed types, and
// attendance patterns by day of week (IST).
reportRoutes.get('/house-help-analytics', async (c) => {
  const db = c.get('db')

  const [{ totalActive }] = await db
    .select({ totalActive: sql<number>`count(*)::int` })
    .from(houseHelp)
    .where(eq(houseHelp.isActive, true))

  const types = await db
    .select({ label: houseHelp.type, count: sql<number>`count(*)::int` })
    .from(houseHelp)
    .where(eq(houseHelp.isActive, true))
    .groupBy(houseHelp.type)
  const byType = types.map((t) => ({ label: t.label, count: Number(t.count) })).sort((a, b) => b.count - a.count)

  const [{ totalAttendance }] = await db
    .select({ totalAttendance: sql<number>`count(*)::int` })
    .from(houseHelpEntries)

  const istDow = sql`extract(dow from ((${houseHelpEntries.checkInAt} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Kolkata'))`
  const dows = await db
    .select({ dow: sql<number>`${istDow}::int`, count: sql<number>`count(*)::int` })
    .from(houseHelpEntries)
    .groupBy(istDow)
  const attendanceByDow = fillDaysOfWeek(dows.map((d) => ({ dow: Number(d.dow), count: Number(d.count) })))

  return c.json({ totalActive: Number(totalActive), totalAttendance: Number(totalAttendance), byType, attendanceByDow })
})

// Maintenance insights (#69): category breakdown, status mix, pending count,
// and average resolution time.
reportRoutes.get('/maintenance-analytics', async (c) => {
  const db = c.get('db')

  const cats = await db
    .select({ label: maintenanceTickets.category, count: sql<number>`count(*)::int` })
    .from(maintenanceTickets)
    .groupBy(maintenanceTickets.category)
  const byCategory = cats.map((r) => ({ label: r.label, count: Number(r.count) })).sort((a, b) => b.count - a.count)

  const stats = await db
    .select({ label: maintenanceTickets.status, count: sql<number>`count(*)::int` })
    .from(maintenanceTickets)
    .groupBy(maintenanceTickets.status)
  const byStatus = stats.map((r) => ({ label: r.label, count: Number(r.count) })).sort((a, b) => b.count - a.count)

  const resolvedRows = await db
    .select({ createdAt: maintenanceTickets.createdAt, resolvedAt: maintenanceTickets.resolvedAt })
    .from(maintenanceTickets)
  const avgHours = avgResolutionHours(
    resolvedRows.map((r) => ({
      createdMs: new Date(r.createdAt as unknown as string).getTime(),
      resolvedMs: r.resolvedAt ? new Date(r.resolvedAt as unknown as string).getTime() : null,
    })),
  )

  const total = byStatus.reduce((s, r) => s + r.count, 0)
  const pending = byStatus.filter((r) => r.label === 'OPEN' || r.label === 'IN_PROGRESS').reduce((s, r) => s + r.count, 0)

  return c.json({ total, pending, avgResolutionHours: avgHours, byCategory, byStatus })
})

// PDF export of the same visitor-trends report.
reportRoutes.get('/visitor-trends/pdf', async (c) => {
  const data = await computeVisitorTrends(c)
  const [society] = await c.get('db').select({ name: societyConfig.name }).from(societyConfig).limit(1)
  const pdf = await renderVisitorTrendsPdf(society?.name ?? 'Society', data)
  const body = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(body).set(pdf)
  return new Response(body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="visitor-trends-${data.from}-to-${data.to}.pdf"`,
    },
  })
})
