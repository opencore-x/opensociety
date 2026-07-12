import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { guards, guardDutySessions } from '@opensociety/db'
import { createGuardSchema, updateGuardSchema, clockInSchema, clockOutSchema } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole } from '../middleware'
import type { AppEnv } from '../types'

// Flat session shape + joined guard name for the duty endpoints.
const dutyColumns = {
  id: guardDutySessions.id,
  guardId: guardDutySessions.guardId,
  clockInAt: guardDutySessions.clockInAt,
  clockInLat: guardDutySessions.clockInLat,
  clockInLng: guardDutySessions.clockInLng,
  clockOutAt: guardDutySessions.clockOutAt,
  clockOutLat: guardDutySessions.clockOutLat,
  clockOutLng: guardDutySessions.clockOutLng,
  createdAt: guardDutySessions.createdAt,
  guardName: guards.name,
}

export const guardRoutes = new Hono<AppEnv>()
guardRoutes.use('*', withDb)
guardRoutes.use('*', withAuth)
// Any signed-in user can read the roster; only admins manage guards.
guardRoutes.use('*', requireAuth)

guardRoutes.get('/', async (c) => {
  const rows = await c.get('db').select().from(guards).orderBy(asc(guards.name))
  return c.json(rows)
})

guardRoutes.post('/', requireRole('ADMIN'), zValidator('json', createGuardSchema), async (c) => {
  const [created] = await c.get('db').insert(guards).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

guardRoutes.patch('/:id', requireRole('ADMIN'), zValidator('json', updateGuardSchema), async (c) => {
  const input = c.req.valid('json')
  const [updated] = await c
    .get('db')
    .update(guards)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(guards.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})

// Guards currently on duty (open sessions), newest first.
guardRoutes.get('/duty/active', async (c) => {
  const rows = await c
    .get('db')
    .select(dutyColumns)
    .from(guardDutySessions)
    .innerJoin(guards, eq(guards.id, guardDutySessions.guardId))
    .where(isNull(guardDutySessions.clockOutAt))
    .orderBy(desc(guardDutySessions.clockInAt))
  return c.json(rows)
})

// Shift log for reports. ?guardId scopes to one guard; ?from/?to bound the
// clock-in date (ISO). Newest first.
guardRoutes.get('/duty', async (c) => {
  const db = c.get('db')
  const conds = []
  const g = c.req.query('guardId')
  if (g) conds.push(eq(guardDutySessions.guardId, g))
  const from = new Date(c.req.query('from') ?? '')
  if (!isNaN(from.valueOf())) conds.push(gte(guardDutySessions.clockInAt, from))
  const to = new Date(c.req.query('to') ?? '')
  if (!isNaN(to.valueOf())) conds.push(lte(guardDutySessions.clockInAt, to))

  const rows = await db
    .select(dutyColumns)
    .from(guardDutySessions)
    .innerJoin(guards, eq(guards.id, guardDutySessions.guardId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(guardDutySessions.clockInAt))
  return c.json(rows)
})

// A guard clocks in, starting a shift. 404 if the guard is missing, 409 if
// they are already on duty (an open session exists).
guardRoutes.post('/:id/duty/clock-in', requireRole('GUARD', 'ADMIN'), zValidator('json', clockInSchema), async (c) => {
  const db = c.get('db')
  const guardId = c.req.param('id')
  const [guard] = await db
    .select({ isActive: guards.isActive })
    .from(guards)
    .where(eq(guards.id, guardId))
    .limit(1)
  if (!guard) return c.json({ error: 'guard not found' }, 404)
  if (!guard.isActive) return c.json({ error: 'guard is inactive' }, 409)

  const [open] = await db
    .select({ id: guardDutySessions.id })
    .from(guardDutySessions)
    .where(and(eq(guardDutySessions.guardId, guardId), isNull(guardDutySessions.clockOutAt)))
    .limit(1)
  if (open) return c.json({ error: 'guard already on duty' }, 409)

  const { lat, lng } = c.req.valid('json')
  const [session] = await db
    .insert(guardDutySessions)
    .values({ guardId, clockInLat: lat, clockInLng: lng })
    .returning()
  return c.json(session, 201)
})

// End a shift. 404 if the session is missing, 409 if already clocked out.
guardRoutes.post('/duty/:sessionId/clock-out', requireRole('GUARD', 'ADMIN'), zValidator('json', clockOutSchema), async (c) => {
  const db = c.get('db')
  const sessionId = c.req.param('sessionId')
  const [session] = await db
    .select({ clockOutAt: guardDutySessions.clockOutAt })
    .from(guardDutySessions)
    .where(eq(guardDutySessions.id, sessionId))
    .limit(1)
  if (!session) return c.json({ error: 'not found' }, 404)
  if (session.clockOutAt) return c.json({ error: 'already clocked out' }, 409)

  const { lat, lng } = c.req.valid('json')
  const [updated] = await db
    .update(guardDutySessions)
    .set({ clockOutAt: new Date(), clockOutLat: lat, clockOutLng: lng })
    .where(eq(guardDutySessions.id, sessionId))
    .returning()
  return c.json(updated)
})
