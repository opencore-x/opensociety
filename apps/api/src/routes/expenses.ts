import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'
import { vendors, expenses, tdsEntries, accounts } from '@opensociety/db'
import { createVendorSchema, updateVendorSchema, createExpenseSchema, computeTds } from '@opensociety/shared'
import { withDb, withAuth, requireRole, actingUserId } from '../middleware'
import { safePostExpense, safeSettleExpense } from '../lib/ledger-posting'
import type { AppEnv } from '../types'

// Expense & vendor management (#94). ADMIN-only. Expenses auto-post to the GL.
export const expenseRoutes = new Hono<AppEnv>()
expenseRoutes.use('*', withDb)
expenseRoutes.use('*', withAuth)
expenseRoutes.use('*', requireRole('ADMIN'))

// ----- Vendors -----

expenseRoutes.get('/vendors', async (c) => {
  const rows = await c.get('db').select().from(vendors).orderBy(asc(vendors.name))
  return c.json(rows)
})

expenseRoutes.post('/vendors', zValidator('json', createVendorSchema), async (c) => {
  const input = c.req.valid('json')
  const [vendor] = await c.get('db').insert(vendors).values(input).returning()
  return c.json(vendor, 201)
})

expenseRoutes.patch('/vendors/:id', zValidator('json', updateVendorSchema), async (c) => {
  const [vendor] = await c
    .get('db')
    .update(vendors)
    .set(c.req.valid('json'))
    .where(eq(vendors.id, c.req.param('id')))
    .returning()
  if (!vendor) return c.json({ error: 'not found' }, 404)
  return c.json(vendor)
})

// ----- Expenses -----

// Record an expense against an EXPENSE head, with optional input GST and TDS.
// Posts the booking entry to the ledger (best-effort).
expenseRoutes.post('/', zValidator('json', createExpenseSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const paidAt = input.status === 'PAID' ? (input.paidAt ? new Date(input.paidAt) : new Date()) : null

  const [expense] = await db
    .insert(expenses)
    .values({
      vendorId: input.vendorId ?? null,
      accountId: input.accountId,
      amount: input.amount,
      taxAmount: input.taxAmount,
      status: input.status,
      description: input.description,
      billRef: input.billRef,
      method: input.status === 'PAID' ? (input.method ?? null) : null,
      paidAt,
      attachmentUrl: input.attachmentUrl,
      recordedBy: actingUserId(c),
    })
    .returning()

  let tds = 0
  if (input.tds) {
    tds = computeTds(input.amount, input.tds.ratePct)
    if (tds > 0) {
      await db
        .insert(tdsEntries)
        .values({ expenseId: expense.id, section: input.tds.section, ratePct: input.tds.ratePct, amount: tds })
    }
  }

  await safePostExpense(
    db,
    {
      id: expense.id,
      status: expense.status,
      method: expense.method,
      vendorId: expense.vendorId,
      accountId: expense.accountId,
      amount: expense.amount,
      taxAmount: expense.taxAmount,
      createdAt: expense.createdAt,
    },
    tds,
    actingUserId(c),
  )
  return c.json(expense, 201)
})

// List expenses, newest first. Filters: ?accountId (head), ?vendorId, ?status,
// ?from, ?to (createdAt range). Enriched with vendor/account labels + TDS total.
expenseRoutes.get('/', async (c) => {
  const db = c.get('db')
  const conds = []
  const accountId = c.req.query('accountId')
  if (accountId) conds.push(eq(expenses.accountId, accountId))
  const vendorId = c.req.query('vendorId')
  if (vendorId) conds.push(eq(expenses.vendorId, vendorId))
  const status = c.req.query('status')
  if (status === 'PAID' || status === 'PAYABLE') conds.push(eq(expenses.status, status))
  const from = c.req.query('from')
  if (from) conds.push(gte(expenses.createdAt, new Date(`${from}T00:00:00.000Z`)))
  const to = c.req.query('to')
  if (to) conds.push(lte(expenses.createdAt, new Date(`${to}T23:59:59.999Z`)))

  const rows = await db
    .select({
      expense: expenses,
      vendor: vendors.name,
      account: accounts.name,
    })
    .from(expenses)
    .leftJoin(vendors, eq(vendors.id, expenses.vendorId))
    .leftJoin(accounts, eq(accounts.id, expenses.accountId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(expenses.createdAt))

  const ids = rows.map((r) => r.expense.id)
  const tds = ids.length
    ? await db
        .select({ expenseId: tdsEntries.expenseId, amount: sql<number>`coalesce(sum(${tdsEntries.amount}), 0)` })
        .from(tdsEntries)
        .where(inArray(tdsEntries.expenseId, ids))
        .groupBy(tdsEntries.expenseId)
    : []
  const tdsByExpense = new Map(tds.map((t) => [t.expenseId, Number(t.amount)]))

  return c.json(
    rows.map((r) => ({
      ...r.expense,
      vendor: r.vendor,
      account: r.account ?? undefined,
      tdsAmount: tdsByExpense.get(r.expense.id) ?? 0,
    })),
  )
})

// Settle a booked payable: mark PAID and post the Vendor Payables → Bank/Cash
// entry for the net owed (gross − TDS).
expenseRoutes.post('/:id/pay', zValidator('json', createExpenseSchema.pick({ method: true })), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const method = c.req.valid('json').method ?? 'BANK_TRANSFER'
  const [expense] = await db.select().from(expenses).where(eq(expenses.id, id)).limit(1)
  if (!expense) return c.json({ error: 'not found' }, 404)
  if (expense.status !== 'PAYABLE') return c.json({ error: 'expense is not payable' }, 409)

  const [{ tds }] = await db
    .select({ tds: sql<number>`coalesce(sum(${tdsEntries.amount}), 0)` })
    .from(tdsEntries)
    .where(eq(tdsEntries.expenseId, id))
  const net = expense.amount + expense.taxAmount - Number(tds)

  const paidAt = new Date()
  const [updated] = await db
    .update(expenses)
    .set({ status: 'PAID', method, paidAt })
    .where(eq(expenses.id, id))
    .returning()

  await safeSettleExpense(db, { id, vendorId: expense.vendorId, method, net, paidAt }, actingUserId(c))
  return c.json(updated)
})

// TDS summary — total withheld per section over a period (Form-26Q prep).
expenseRoutes.get('/tds-summary', async (c) => {
  const db = c.get('db')
  const conds = []
  const from = c.req.query('from')
  if (from) conds.push(gte(tdsEntries.deductedAt, new Date(`${from}T00:00:00.000Z`)))
  const to = c.req.query('to')
  if (to) conds.push(lte(tdsEntries.deductedAt, new Date(`${to}T23:59:59.999Z`)))
  const rows = await db
    .select({
      section: tdsEntries.section,
      amount: sql<number>`coalesce(sum(${tdsEntries.amount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(tdsEntries)
    .where(conds.length ? and(...conds) : undefined)
    .groupBy(tdsEntries.section)
  return c.json(rows.map((r) => ({ section: r.section, amount: Number(r.amount), count: Number(r.count) })))
})
