import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq } from 'drizzle-orm'
import { visitorEntries, visitorPreApprovals } from '@opensociety/db'
import type { VisitorStatus } from '@opensociety/shared'
import {
  createVisitorEntrySchema,
  denyVisitorSchema,
  checkInVisitorSchema,
  createPreApprovalSchema,
  redeemPreApprovalSchema,
} from '@opensociety/shared'
import { withDb, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const visitorRoutes = new Hono<AppEnv>()
visitorRoutes.use('*', withDb)

// ----- Pre-approvals (registered before /:id so the static segment wins) -----

visitorRoutes.get('/pre-approvals', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(visitorPreApprovals)
    .orderBy(desc(visitorPreApprovals.createdAt))
  return c.json(rows)
})

visitorRoutes.post('/pre-approvals', zValidator('json', createPreApprovalSchema), async (c) => {
  const userId = actingUserId(c)
  if (!userId) return c.json({ error: 'authentication required' }, 401)
  const input = c.req.valid('json')
  const code = crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
  const [created] = await c
    .get('db')
    .insert(visitorPreApprovals)
    .values({
      apartmentId: input.apartmentId,
      createdBy: userId,
      visitorName: input.visitorName,
      visitorPhone: input.visitorPhone ?? null,
      approvalType: input.approvalType,
      code,
      validUntil: input.validUntil ? new Date(input.validUntil) : null,
      maxUses: input.maxUses ?? null,
    })
    .returning()
  return c.json(created, 201)
})

// Guard redeems a code at the gate -> auto-creates an APPROVED entry.
visitorRoutes.post('/pre-approvals/redeem', zValidator('json', redeemPreApprovalSchema), async (c) => {
  const db = c.get('db')
  const { code, guardId } = c.req.valid('json')
  const [pa] = await db
    .select()
    .from(visitorPreApprovals)
    .where(eq(visitorPreApprovals.code, code))
    .limit(1)
  if (!pa || !pa.isActive) return c.json({ error: 'invalid or inactive code' }, 404)
  if (pa.validUntil && pa.validUntil.getTime() < Date.now())
    return c.json({ error: 'code expired' }, 410)
  if (pa.maxUses != null && pa.useCount >= pa.maxUses)
    return c.json({ error: 'code exhausted' }, 410)

  const [entry] = await db
    .insert(visitorEntries)
    .values({
      apartmentId: pa.apartmentId,
      preApprovalId: pa.id,
      visitorName: pa.visitorName,
      visitorPhone: pa.visitorPhone,
      status: 'ENTERED',
      checkInAt: new Date(),
      checkInBy: guardId ?? null,
    })
    .returning()
  await db
    .update(visitorPreApprovals)
    .set({ useCount: pa.useCount + 1 })
    .where(eq(visitorPreApprovals.id, pa.id))
  return c.json(entry, 201)
})

// ----- Visitor entries -----

visitorRoutes.get('/', async (c) => {
  const db = c.get('db')
  const status = c.req.query('status') as VisitorStatus | undefined
  const apartmentId = c.req.query('apartmentId')
  const conds = []
  if (status) conds.push(eq(visitorEntries.status, status))
  if (apartmentId) conds.push(eq(visitorEntries.apartmentId, apartmentId))
  const rows = await db
    .select()
    .from(visitorEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(visitorEntries.createdAt))
  return c.json(rows)
})

// Resident raises a request (PENDING).
visitorRoutes.post('/', zValidator('json', createVisitorEntrySchema), async (c) => {
  const [created] = await c.get('db').insert(visitorEntries).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

visitorRoutes.post('/:id/approve', async (c) => {
  const [updated] = await c
    .get('db')
    .update(visitorEntries)
    .set({ status: 'APPROVED', approvedBy: actingUserId(c) ?? null, updatedAt: new Date() })
    .where(eq(visitorEntries.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

visitorRoutes.post('/:id/deny', zValidator('json', denyVisitorSchema), async (c) => {
  const [updated] = await c
    .get('db')
    .update(visitorEntries)
    .set({ status: 'DENIED', deniedReason: c.req.valid('json').reason, updatedAt: new Date() })
    .where(eq(visitorEntries.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

visitorRoutes.post('/:id/checkin', zValidator('json', checkInVisitorSchema), async (c) => {
  const body = c.req.valid('json')
  const [updated] = await c
    .get('db')
    .update(visitorEntries)
    .set({
      status: 'ENTERED',
      checkInAt: new Date(),
      checkInBy: body.guardId ?? null,
      photoUrl: body.photoUrl ?? null,
      vehicleNumber: body.vehicleNumber ?? null,
      updatedAt: new Date(),
    })
    .where(eq(visitorEntries.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

visitorRoutes.post('/:id/checkout', async (c) => {
  // checkOutBy references guards.id (the guard at the gate), not the user.
  const guardId = c.req.header('x-guard-id')
  const [updated] = await c
    .get('db')
    .update(visitorEntries)
    .set({ status: 'EXITED', checkOutAt: new Date(), checkOutBy: guardId ?? null, updatedAt: new Date() })
    .where(eq(visitorEntries.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
