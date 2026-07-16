import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, isNotNull, isNull, ne, sql } from 'drizzle-orm'
import { maintenanceBills, billLineItems, payments, apartments, residencies, societyConfig, billConfig } from '@opensociety/db'
import type { BillStatus } from '@opensociety/shared'
import {
  generateBillsSchema,
  createBillSchema,
  computeBill,
  billStatusSchema,
  sumApartmentInterest,
  periodMonthOf,
  ACCOUNT_CODES,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import { generateMonthlyBills } from '../lib/generate-bills'
import { safePostBill, safeReverseBill, resolveAccounts } from '../lib/ledger-posting'
import { renderInvoicePdf } from '../lib/invoice-pdf'

const INTEREST_TITLE_PREFIX = 'Interest on arrears'
import type { AppEnv } from '../types'

// Apartment ids the acting user currently lives in (open residencies).
async function actingUserApartments(c: Context<AppEnv>): Promise<string[]> {
  const uid = actingUserId(c)
  if (!uid) return []
  const rows = await c
    .get('db')
    .select({ apartmentId: residencies.apartmentId })
    .from(residencies)
    .where(and(eq(residencies.userId, uid), isNull(residencies.endDate)))
  return rows.map((r) => r.apartmentId)
}

// Sum of payments per bill id, as a Map.
async function paidByBill(c: Context<AppEnv>, billIds: string[]): Promise<Map<string, number>> {
  if (billIds.length === 0) return new Map()
  const rows = await c
    .get('db')
    .select({ billId: payments.billId, paid: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(inArray(payments.billId, billIds))
    .groupBy(payments.billId)
  return new Map(rows.map((r) => [r.billId, Number(r.paid)]))
}

export const billRoutes = new Hono<AppEnv>()
billRoutes.use('*', withDb)
billRoutes.use('*', withAuth)
billRoutes.use('*', requireAuth)

// Generate a monthly bill (same line items) for every active apartment that
// doesn't already have one for this period. Idempotent per period.
billRoutes.post('/generate', requireRole('ADMIN'), zValidator('json', generateBillsSchema), async (c) => {
  const input = c.req.valid('json')
  const db = c.get('db')
  const result = await generateMonthlyBills(db, {
    periodMonth: input.periodMonth,
    title: input.title,
    dueDate: input.dueDate ? new Date(input.dueDate) : null,
    lineItems: input.lineItems,
    createdBy: actingUserId(c),
  })
  // Auto-post each new bill to the ledger (best-effort, idempotent).
  for (const billId of result.billIds) await safePostBill(db, billId, actingUserId(c))
  return c.json({ created: result.created, skipped: result.skipped }, result.created > 0 ? 201 : 200)
})

// Create a one-time bill for a single apartment.
billRoutes.post('/', requireRole('ADMIN'), zValidator('json', createBillSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const totals = computeBill(input.lineItems)
  const [bill] = await db
    .insert(maintenanceBills)
    .values({
      apartmentId: input.apartmentId,
      type: 'ONE_TIME',
      title: input.title,
      subtotal: totals.subtotal,
      taxAmount: totals.taxAmount,
      totalAmount: totals.total,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      createdBy: actingUserId(c),
    })
    .returning()
  await db.insert(billLineItems).values(
    totals.lines.map((l) => ({
      billId: bill.id,
      description: l.description,
      amount: l.amount,
      taxRatePct: l.taxRatePct,
      taxAmount: l.taxAmount,
      accountId: l.accountId ?? null,
    })),
  )
  // Auto-post the bill to the ledger (best-effort, idempotent).
  await safePostBill(db, bill.id, actingUserId(c))
  return c.json(bill, 201)
})

// Per-apartment outstanding dues: billed − paid. Admin dashboard.
billRoutes.get('/dues', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const billed = await db
    .select({
      apartmentId: maintenanceBills.apartmentId,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
      billed: sql<number>`coalesce(sum(${maintenanceBills.totalAmount}), 0)`,
    })
    .from(maintenanceBills)
    .innerJoin(apartments, eq(apartments.id, maintenanceBills.apartmentId))
    .where(sql`${maintenanceBills.status} <> 'CANCELLED'`)
    .groupBy(maintenanceBills.apartmentId, apartments.tower, apartments.apartmentNo)
  const paid = await db
    .select({ apartmentId: payments.apartmentId, paid: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .groupBy(payments.apartmentId)
  const paidByApt = new Map(paid.map((r) => [r.apartmentId, Number(r.paid)]))

  const rows = billed
    .map((b) => {
      const billedN = Number(b.billed)
      const paidN = paidByApt.get(b.apartmentId) ?? 0
      return {
        apartmentId: b.apartmentId,
        apartment: `${b.tower}-${b.apartmentNo}`,
        billed: billedN,
        paid: paidN,
        outstanding: billedN - paidN,
      }
    })
    .filter((r) => r.outstanding > 0)
    .sort((a, b) => b.outstanding - a.outstanding)
  return c.json(rows)
})

// Per-apartment accrued simple interest on overdue, unpaid, non-interest bills
// as of `asOfMs`, using the society's configured rate + grace. Interest bills
// are excluded from the base so interest never compounds on itself.
async function interestByApartment(
  c: Context<AppEnv>,
  asOfMs: number,
  ratePct: number,
  graceDays: number,
): Promise<Map<string, { label: string; interest: number }>> {
  const db = c.get('db')
  const rows = await db
    .select({
      apartmentId: maintenanceBills.apartmentId,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
      total: maintenanceBills.totalAmount,
      dueDate: maintenanceBills.dueDate,
      paid: sql<number>`coalesce(sum(${payments.amount}), 0)`,
    })
    .from(maintenanceBills)
    .innerJoin(apartments, eq(apartments.id, maintenanceBills.apartmentId))
    .leftJoin(payments, eq(payments.billId, maintenanceBills.id))
    .where(
      and(
        isNotNull(maintenanceBills.dueDate),
        ne(maintenanceBills.status, 'CANCELLED'),
        sql`${maintenanceBills.title} not like ${INTEREST_TITLE_PREFIX + '%'}`,
      ),
    )
    .groupBy(
      maintenanceBills.id,
      maintenanceBills.apartmentId,
      apartments.tower,
      apartments.apartmentNo,
      maintenanceBills.totalAmount,
      maintenanceBills.dueDate,
    )

  const byApt = new Map<string, { label: string; bills: { outstanding: number; dueDateMs: number }[] }>()
  for (const r of rows) {
    const outstanding = Number(r.total) - Number(r.paid)
    if (outstanding <= 0 || !r.dueDate) continue
    const entry = byApt.get(r.apartmentId) ?? { label: `${r.tower}-${r.apartmentNo}`, bills: [] }
    entry.bills.push({ outstanding, dueDateMs: new Date(r.dueDate as unknown as string).getTime() })
    byApt.set(r.apartmentId, entry)
  }

  const out = new Map<string, { label: string; interest: number }>()
  for (const [aptId, { label, bills }] of byApt) {
    const interest = sumApartmentInterest(bills, asOfMs, ratePct, graceDays)
    if (interest > 0) out.set(aptId, { label, interest })
  }
  return out
}

// Preview accrued interest per flat without charging it (ADMIN). ?asOf=YYYY-MM-DD.
billRoutes.get('/interest-preview', requireRole('ADMIN'), async (c) => {
  const [cfg] = await c.get('db').select().from(billConfig).limit(1)
  if (!cfg) return c.json({ enabled: false, asOf: null, rows: [] })
  const asOf = c.req.query('asOf') ? new Date(`${c.req.query('asOf')}T00:00:00.000Z`) : new Date()
  const map = await interestByApartment(c, asOf.getTime(), cfg.interestRatePct, cfg.gracePeriodDays)
  const rows = [...map.entries()].map(([apartmentId, v]) => ({ apartmentId, apartment: v.label, interest: v.interest }))
  rows.sort((a, b) => b.interest - a.interest)
  return c.json({
    enabled: cfg.interestEnabled,
    ratePct: cfg.interestRatePct,
    graceDays: cfg.gracePeriodDays,
    asOf: asOf.toISOString().slice(0, 10),
    rows,
  })
})

// Charge accrued interest as one-time bills, one per flat (ADMIN). Idempotent per
// interest period. Requires interest to be enabled in bill config.
billRoutes.post('/apply-interest', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const [cfg] = await db.select().from(billConfig).limit(1)
  if (!cfg || !cfg.interestEnabled) return c.json({ error: 'interest is not enabled' }, 400)
  const asOf = c.req.query('asOf') ? new Date(`${c.req.query('asOf')}T00:00:00.000Z`) : new Date()
  const period = periodMonthOf(asOf)

  const map = await interestByApartment(c, asOf.getTime(), cfg.interestRatePct, cfg.gracePeriodDays)
  if (map.size === 0) return c.json({ created: 0, skipped: 0 })

  // Skip flats already charged interest for this period (idempotency).
  const existing = await db
    .select({ apartmentId: maintenanceBills.apartmentId })
    .from(maintenanceBills)
    .where(and(eq(maintenanceBills.periodMonth, period), sql`${maintenanceBills.title} like ${INTEREST_TITLE_PREFIX + '%'}`))
  const already = new Set(existing.map((r) => r.apartmentId))

  const interestAccount = (await resolveAccounts(db, [ACCOUNT_CODES.INTEREST_ON_ARREARS_INCOME])).get(
    ACCOUNT_CODES.INTEREST_ON_ARREARS_INCOME,
  )
  const title = `${INTEREST_TITLE_PREFIX} — ${period}`
  const description = `Interest on overdue dues (${cfg.interestRatePct}% p.a.)`

  let created = 0
  for (const [apartmentId, { interest }] of map) {
    if (already.has(apartmentId)) continue
    const [bill] = await db
      .insert(maintenanceBills)
      .values({
        apartmentId,
        type: 'ONE_TIME',
        title,
        periodMonth: period,
        subtotal: interest,
        taxAmount: 0,
        totalAmount: interest,
        dueDate: asOf,
        createdBy: actingUserId(c),
      })
      .returning({ id: maintenanceBills.id })
    await db.insert(billLineItems).values({
      billId: bill.id,
      description,
      amount: interest,
      taxRatePct: 0,
      taxAmount: 0,
      accountId: interestAccount ?? null,
    })
    await safePostBill(db, bill.id, actingUserId(c))
    created++
  }
  return c.json({ created, skipped: already.size, period }, created > 0 ? 201 : 200)
})

// Cancel a bill (e.g. waive an interest charge) with an optional reason. Sets
// status CANCELLED and posts a reversing ledger entry (§6.9). Idempotent.
billRoutes.post('/:id/cancel', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const body = await c.req.json().catch(() => ({}) as { reason?: string })
  const [bill] = await db.select().from(maintenanceBills).where(eq(maintenanceBills.id, id)).limit(1)
  if (!bill) return c.json({ error: 'not found' }, 404)
  if (bill.status === 'CANCELLED') return c.json(bill)

  const [updated] = await db
    .update(maintenanceBills)
    .set({ status: 'CANCELLED', updatedAt: new Date() })
    .where(eq(maintenanceBills.id, id))
    .returning()
  await safeReverseBill(db, id, actingUserId(c))
  return c.json({ ...updated, cancelReason: (body as { reason?: string }).reason ?? null })
})

// List bills. Admins see all (filter ?apartmentId, ?status, ?period); residents
// only their apartments'. Enriched with paidAmount + apartment label.
billRoutes.get('/', async (c) => {
  const db = c.get('db')
  const conds = []
  if (c.get('userRole') !== 'ADMIN') {
    const mine = await actingUserApartments(c)
    if (mine.length === 0) return c.json([])
    conds.push(inArray(maintenanceBills.apartmentId, mine))
  } else {
    const apt = c.req.query('apartmentId')
    if (apt) conds.push(eq(maintenanceBills.apartmentId, apt))
  }
  const status = billStatusSchema.safeParse(c.req.query('status'))
  if (status.success) conds.push(eq(maintenanceBills.status, status.data as BillStatus))
  const period = c.req.query('period')
  if (period) conds.push(eq(maintenanceBills.periodMonth, period))

  const rows = await db
    .select({
      bill: maintenanceBills,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(maintenanceBills)
    .innerJoin(apartments, eq(apartments.id, maintenanceBills.apartmentId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(maintenanceBills.issuedAt))
  const paid = await paidByBill(
    c,
    rows.map((r) => r.bill.id),
  )
  return c.json(
    rows.map((r) => ({
      ...r.bill,
      apartment: `${r.tower}-${r.apartmentNo}`,
      paidAmount: paid.get(r.bill.id) ?? 0,
    })),
  )
})

// A single bill with its line items + paid amount. Admin or resident-of-flat.
billRoutes.get('/:id', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [bill] = await db.select().from(maintenanceBills).where(eq(maintenanceBills.id, id)).limit(1)
  if (!bill) return c.json({ error: 'not found' }, 404)
  if (c.get('userRole') !== 'ADMIN') {
    const mine = await actingUserApartments(c)
    if (!mine.includes(bill.apartmentId)) return c.json({ error: 'forbidden' }, 403)
  }
  const lineItems = await db.select().from(billLineItems).where(eq(billLineItems.billId, id))
  const paid = await paidByBill(c, [id])
  return c.json({ ...bill, lineItems, paidAmount: paid.get(id) ?? 0 })
})

// GST-compliant PDF invoice for a bill. Admin or resident-of-flat.
billRoutes.get('/:id/invoice', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [row] = await db
    .select({ bill: maintenanceBills, tower: apartments.tower, apartmentNo: apartments.apartmentNo })
    .from(maintenanceBills)
    .innerJoin(apartments, eq(apartments.id, maintenanceBills.apartmentId))
    .where(eq(maintenanceBills.id, id))
    .limit(1)
  if (!row) return c.json({ error: 'not found' }, 404)
  if (c.get('userRole') !== 'ADMIN') {
    const mine = await actingUserApartments(c)
    if (!mine.includes(row.bill.apartmentId)) return c.json({ error: 'forbidden' }, 403)
  }

  const lineItems = await db.select().from(billLineItems).where(eq(billLineItems.billId, id))
  const paid = await paidByBill(c, [id])
  const [society] = await db.select().from(societyConfig).limit(1)

  const pdf = await renderInvoicePdf({
    society: {
      name: society?.name ?? 'Society',
      address: society?.address ?? '',
      city: society?.city ?? '',
      state: society?.state ?? '',
      pincode: society?.pincode ?? '',
      gstin: society?.gstin ?? null,
    },
    apartment: `${row.tower}-${row.apartmentNo}`,
    invoiceNo: `INV-${row.bill.periodMonth ?? 'OT'}-${id.slice(0, 8).toUpperCase()}`,
    bill: {
      title: row.bill.title,
      periodMonth: row.bill.periodMonth,
      status: row.bill.status,
      dueDate: row.bill.dueDate ? row.bill.dueDate.toISOString() : null,
      subtotal: row.bill.subtotal,
      taxAmount: row.bill.taxAmount,
      totalAmount: row.bill.totalAmount,
    },
    lineItems,
    paidAmount: paid.get(id) ?? 0,
  })

  const body = new ArrayBuffer(pdf.byteLength)
  new Uint8Array(body).set(pdf)
  return new Response(body, {
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `inline; filename="invoice-${id.slice(0, 8)}.pdf"`,
    },
  })
})
