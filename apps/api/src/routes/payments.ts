import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm'
import { maintenanceBills, payments, residencies } from '@opensociety/db'
import { recordPaymentSchema, billStatusFor } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const paymentRoutes = new Hono<AppEnv>()
paymentRoutes.use('*', withDb)
paymentRoutes.use('*', withAuth)
paymentRoutes.use('*', requireAuth)

// Admin records a payment against a bill; the bill's status is recomputed from
// its total vs the amount paid so far. 404 if the bill is missing.
paymentRoutes.post('/', requireRole('ADMIN'), zValidator('json', recordPaymentSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const [bill] = await db
    .select({ id: maintenanceBills.id, apartmentId: maintenanceBills.apartmentId, total: maintenanceBills.totalAmount })
    .from(maintenanceBills)
    .where(eq(maintenanceBills.id, input.billId))
    .limit(1)
  if (!bill) return c.json({ error: 'bill not found' }, 404)

  const [payment] = await db
    .insert(payments)
    .values({
      billId: bill.id,
      apartmentId: bill.apartmentId,
      amount: input.amount,
      method: input.method,
      reference: input.reference,
      notes: input.notes,
      paidAt: input.paidAt ? new Date(input.paidAt) : new Date(),
      recordedBy: actingUserId(c),
    })
    .returning()

  const [{ paid }] = await db
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.billId, bill.id))
  await db
    .update(maintenanceBills)
    .set({ status: billStatusFor(bill.total, Number(paid)), updatedAt: new Date() })
    .where(eq(maintenanceBills.id, bill.id))

  return c.json(payment, 201)
})

// Payment history. Admins see all (?apartmentId, ?billId); residents only their
// apartments'. Newest first.
paymentRoutes.get('/', async (c) => {
  const db = c.get('db')
  const conds = []
  if (c.get('userRole') !== 'ADMIN') {
    const uid = actingUserId(c)!
    const mine = await db
      .select({ apartmentId: residencies.apartmentId })
      .from(residencies)
      .where(and(eq(residencies.userId, uid), isNull(residencies.endDate)))
    const ids = mine.map((r) => r.apartmentId)
    if (ids.length === 0) return c.json([])
    conds.push(inArray(payments.apartmentId, ids))
  } else {
    const apt = c.req.query('apartmentId')
    if (apt) conds.push(eq(payments.apartmentId, apt))
  }
  const billId = c.req.query('billId')
  if (billId) conds.push(eq(payments.billId, billId))

  const rows = await db
    .select()
    .from(payments)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(payments.paidAt))
  return c.json(rows)
})
