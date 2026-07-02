import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { visitorEntries, visitorPreApprovals, residencies } from '@opensociety/db'
import type { VisitorStatus, VisitorAction } from '@opensociety/shared'
import {
  createVisitorEntrySchema,
  denyVisitorSchema,
  checkInVisitorSchema,
  createPreApprovalSchema,
  redeemPreApprovalSchema,
  VISITOR_TRANSITIONS,
  canTransition,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import { parsePagination } from '../pagination'
import type { AppEnv } from '../types'

// Applies a lifecycle transition to a visitor entry, enforcing the state
// machine: 404 if the entry is missing, 409 if the action is illegal from its
// current state, otherwise updates to the target status with `extra` fields.
export async function applyTransition(
  c: Context<AppEnv>,
  action: VisitorAction,
  extra: Partial<typeof visitorEntries.$inferInsert>,
) {
  const db = c.get('db')
  const id = c.req.param('id')
  const [entry] = await db
    .select({ status: visitorEntries.status, apartmentId: visitorEntries.apartmentId })
    .from(visitorEntries)
    .where(eq(visitorEntries.id, id))
    .limit(1)
  if (!entry) return c.json({ error: 'not found' }, 404)
  // Residents may only approve/deny visitors for an apartment they actively
  // live in; admins (and guard-only actions) bypass this ownership check.
  if ((action === 'approve' || action === 'deny') && c.get('userRole') === 'RESIDENT') {
    const [residency] = await db
      .select({ id: residencies.id })
      .from(residencies)
      .where(
        and(
          eq(residencies.userId, actingUserId(c)!),
          eq(residencies.apartmentId, entry.apartmentId),
          isNull(residencies.endDate),
        ),
      )
      .limit(1)
    if (!residency) return c.json({ error: 'not a resident of this apartment' }, 403)
  }
  if (!canTransition(action, entry.status))
    return c.json({ error: `cannot ${action} a visitor in ${entry.status} state` }, 409)
  const [updated] = await db
    .update(visitorEntries)
    .set({ status: VISITOR_TRANSITIONS[action].to, updatedAt: new Date(), ...extra })
    .where(eq(visitorEntries.id, id))
    .returning()
  return c.json(updated)
}

export const visitorRoutes = new Hono<AppEnv>()
visitorRoutes.use('*', withDb)
visitorRoutes.use('*', withAuth)
// Every visitor endpoint needs a signed-in actor; individual routes narrow by role.
visitorRoutes.use('*', requireAuth)

// ----- Pre-approvals (registered before /:id so the static segment wins) -----

visitorRoutes.get('/pre-approvals', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(visitorPreApprovals)
    .orderBy(desc(visitorPreApprovals.createdAt))
  return c.json(rows)
})

// Residents pre-approve their own visitors (admins may too).
visitorRoutes.post('/pre-approvals', requireRole('RESIDENT', 'ADMIN'), zValidator('json', createPreApprovalSchema), async (c) => {
  const userId = actingUserId(c)!
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
visitorRoutes.post('/pre-approvals/redeem', requireRole('GUARD', 'ADMIN'), zValidator('json', redeemPreApprovalSchema), async (c) => {
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
  const { limit, offset } = parsePagination(c)
  const conds = []
  if (status) conds.push(eq(visitorEntries.status, status))
  if (apartmentId) conds.push(eq(visitorEntries.apartmentId, apartmentId))
  const rows = await db
    .select()
    .from(visitorEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(visitorEntries.createdAt))
    .limit(limit)
    .offset(offset)
  return c.json(rows)
})

// Guard registers a visitor arriving at the gate (PENDING until a resident approves).
visitorRoutes.post('/', requireRole('GUARD', 'ADMIN'), zValidator('json', createVisitorEntrySchema), async (c) => {
  const [created] = await c.get('db').insert(visitorEntries).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

// Resident approves/denies a visitor to their apartment (admins may override).
visitorRoutes.post('/:id/approve', requireRole('RESIDENT', 'ADMIN'), (c) =>
  applyTransition(c, 'approve', { approvedBy: actingUserId(c) ?? null }),
)

visitorRoutes.post('/:id/deny', requireRole('RESIDENT', 'ADMIN'), zValidator('json', denyVisitorSchema), (c) =>
  applyTransition(c, 'deny', { deniedReason: c.req.valid('json').reason }),
)

// Gate actions: the guard on duty checks the visitor in and out.
visitorRoutes.post('/:id/checkin', requireRole('GUARD', 'ADMIN'), zValidator('json', checkInVisitorSchema), (c) => {
  const body = c.req.valid('json')
  return applyTransition(c, 'checkin', {
    checkInAt: new Date(),
    checkInBy: body.guardId ?? null,
    photoUrl: body.photoUrl ?? null,
    vehicleNumber: body.vehicleNumber ?? null,
  })
})

visitorRoutes.post('/:id/checkout', requireRole('GUARD', 'ADMIN'), (c) =>
  // checkOutBy references guards.id (the guard at the gate), not the user.
  applyTransition(c, 'checkout', { checkOutAt: new Date(), checkOutBy: c.req.header('x-guard-id') ?? null }),
)
