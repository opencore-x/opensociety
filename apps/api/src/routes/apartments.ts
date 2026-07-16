import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, eq, inArray, isNull, ne } from 'drizzle-orm'
import { apartments, residencies, users, maintenanceBills, payments } from '@opensociety/db'
import {
  createApartmentSchema,
  createApartmentsBulkSchema,
  updateApartmentSchema,
  buildStatement,
  INTEREST_BILL_TITLE_PREFIX,
  type StatementEntryInput,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const apartmentRoutes = new Hono<AppEnv>()
apartmentRoutes.use('*', withDb)
apartmentRoutes.use('*', withAuth)
// Any signed-in user can read the directory; only admins mutate it.
apartmentRoutes.use('*', requireAuth)

apartmentRoutes.get('/', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(apartments)
    .orderBy(asc(apartments.tower), asc(apartments.apartmentNo))
  return c.json(rows)
})

// The flats the acting user currently lives in (open residencies) — lets the
// resident app scope actions (e.g. house-help assignments) to their own units.
apartmentRoutes.get('/mine', async (c) => {
  const db = c.get('db')
  const mine = db
    .select({ id: residencies.apartmentId })
    .from(residencies)
    .where(and(eq(residencies.userId, actingUserId(c)!), isNull(residencies.endDate)))
  const rows = await db
    .select()
    .from(apartments)
    .where(inArray(apartments.id, mine))
    .orderBy(asc(apartments.tower), asc(apartments.apartmentNo))
  return c.json(rows)
})

// Co-residents of the acting user's flats — for the resident profile screen.
apartmentRoutes.get('/mine/residents', async (c) => {
  const db = c.get('db')
  const mine = db
    .select({ id: residencies.apartmentId })
    .from(residencies)
    .where(and(eq(residencies.userId, actingUserId(c)!), isNull(residencies.endDate)))
  const rows = await db
    .select({
      apartmentId: residencies.apartmentId,
      userId: users.id,
      name: users.name,
      relation: residencies.relation,
    })
    .from(residencies)
    .innerJoin(users, eq(users.id, residencies.userId))
    .where(and(inArray(residencies.apartmentId, mine), isNull(residencies.endDate)))
    .orderBy(asc(users.name))
  return c.json(rows)
})

// Per-flat statement of account (#96): a dated, running-balance ledger merging
// charges (bills + interest, debits) and payments (credits) over an optional
// [from,to] window. Balance is debit-positive (what the flat owes); closing
// reconciles to outstanding dues. ADMIN sees any flat; residents only their own.
apartmentRoutes.get('/:id/statement', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  if (c.get('userRole') !== 'ADMIN') {
    const mine = await db
      .select({ id: residencies.apartmentId })
      .from(residencies)
      .where(and(eq(residencies.userId, actingUserId(c)!), isNull(residencies.endDate)))
    if (!mine.some((r) => r.id === id)) return c.json({ error: 'forbidden' }, 403)
  }
  const [apt] = await db.select().from(apartments).where(eq(apartments.id, id)).limit(1)
  if (!apt) return c.json({ error: 'not found' }, 404)

  const fromMs = c.req.query('from') ? new Date(`${c.req.query('from')}T00:00:00.000Z`).getTime() : null
  const toMs = c.req.query('to') ? new Date(`${c.req.query('to')}T23:59:59.999Z`).getTime() : null

  const bills = await db
    .select({
      id: maintenanceBills.id,
      title: maintenanceBills.title,
      total: maintenanceBills.totalAmount,
      issuedAt: maintenanceBills.issuedAt,
    })
    .from(maintenanceBills)
    .where(and(eq(maintenanceBills.apartmentId, id), ne(maintenanceBills.status, 'CANCELLED')))
  const pays = await db
    .select({ id: payments.id, amount: payments.amount, method: payments.method, paidAt: payments.paidAt })
    .from(payments)
    .where(eq(payments.apartmentId, id))

  const all: StatementEntryInput[] = []
  for (const b of bills) {
    const isInterest = b.title.startsWith(INTEREST_BILL_TITLE_PREFIX)
    all.push({
      date: new Date(b.issuedAt as unknown as string).toISOString(),
      type: isInterest ? 'INTEREST' : 'BILL',
      description: b.title,
      debit: b.total,
      credit: 0,
      ref: b.id,
    })
  }
  for (const p of pays) {
    all.push({
      date: new Date(p.paidAt as unknown as string).toISOString(),
      type: 'PAYMENT',
      description: `Payment (${p.method})`,
      debit: 0,
      credit: p.amount,
      ref: p.id,
    })
  }

  // Opening balance = net of everything strictly before the window start.
  let opening = 0
  const windowRows: StatementEntryInput[] = []
  for (const e of all) {
    const ms = new Date(e.date).getTime()
    if (fromMs != null && ms < fromMs) {
      opening += e.debit - e.credit
      continue
    }
    if (toMs != null && ms > toMs) continue
    windowRows.push(e)
  }

  const statement = buildStatement(windowRows, opening)
  return c.json({
    apartmentId: id,
    apartment: `${apt.tower}-${apt.apartmentNo}`,
    from: c.req.query('from') ?? null,
    to: c.req.query('to') ?? null,
    ...statement,
  })
})

apartmentRoutes.post('/', requireRole('ADMIN'), zValidator('json', createApartmentSchema), async (c) => {
  const [created] = await c.get('db').insert(apartments).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

// Society setup: bulk import (e.g. from a CSV upload).
apartmentRoutes.post('/bulk', requireRole('ADMIN'), zValidator('json', createApartmentsBulkSchema), async (c) => {
  const { apartments: list } = c.req.valid('json')
  const created = await c.get('db').insert(apartments).values(list).returning()
  return c.json({ count: created.length, apartments: created }, 201)
})

// Edit a unit or toggle its active state (soft deactivation via isActive).
apartmentRoutes.patch('/:id', requireRole('ADMIN'), zValidator('json', updateApartmentSchema), async (c) => {
  const [updated] = await c
    .get('db')
    .update(apartments)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(eq(apartments.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
