import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, gte, isNull, lte } from 'drizzle-orm'
import { guards, guardDutySessions, guardDevices } from '@opensociety/db'
import {
  createGuardSchema,
  updateGuardSchema,
  clockInSchema,
  clockOutSchema,
  bindGuardDeviceSchema,
  isGuardDeviceAllowed,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole } from '../middleware'
import type { AppEnv } from '../types'

// One-device-per-guard enforcement. Reads the x-device-id (+ x-device-model)
// headers: a mismatch against the guard's active bound device is rejected (403)
// and the matching device's lastActiveAt is bumped; an unbound guard auto-binds
// the incoming device. Returns a Response to short-circuit, or null to proceed.
async function enforceGuardDevice(c: Context<AppEnv>, guardId: string): Promise<Response | null> {
  const db = c.get('db')
  const incoming = c.req.header('x-device-id') ?? null
  const [active] = await db
    .select({ id: guardDevices.id, deviceId: guardDevices.deviceId })
    .from(guardDevices)
    .where(and(eq(guardDevices.guardId, guardId), isNull(guardDevices.revokedAt)))
    .limit(1)
  if (active) {
    if (!isGuardDeviceAllowed(active.deviceId, incoming))
      return c.json({ error: 'device not authorized for this guard' }, 403)
    await db.update(guardDevices).set({ lastActiveAt: new Date() }).where(eq(guardDevices.id, active.id))
    return null
  }
  if (incoming) {
    await db
      .insert(guardDevices)
      .values({ guardId, deviceId: incoming, model: c.req.header('x-device-model') })
      .onConflictDoNothing()
  }
  return null
}

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

  const denied = await enforceGuardDevice(c, guardId)
  if (denied) return denied

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

// Admin: a guard's device bindings (active + revoked history), newest first.
guardRoutes.get('/:id/devices', requireRole('ADMIN'), async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(guardDevices)
    .where(eq(guardDevices.guardId, c.req.param('id')))
    .orderBy(desc(guardDevices.boundAt))
  return c.json(rows)
})

// Admin binds a device to a guard. 404 if the guard is missing, 409 if the guard
// is already bound to a different active device (revoke it first); re-binding the
// same device just refreshes its model/last-active.
guardRoutes.post('/:id/devices', requireRole('ADMIN'), zValidator('json', bindGuardDeviceSchema), async (c) => {
  const db = c.get('db')
  const guardId = c.req.param('id')
  const { deviceId, model } = c.req.valid('json')

  const [guard] = await db.select({ id: guards.id }).from(guards).where(eq(guards.id, guardId)).limit(1)
  if (!guard) return c.json({ error: 'guard not found' }, 404)

  const [active] = await db
    .select({ id: guardDevices.id, deviceId: guardDevices.deviceId })
    .from(guardDevices)
    .where(and(eq(guardDevices.guardId, guardId), isNull(guardDevices.revokedAt)))
    .limit(1)
  if (active && active.deviceId !== deviceId)
    return c.json({ error: 'guard already bound to another device' }, 409)
  if (active) {
    const [refreshed] = await db
      .update(guardDevices)
      .set({ model, lastActiveAt: new Date() })
      .where(eq(guardDevices.id, active.id))
      .returning()
    return c.json(refreshed)
  }
  const [created] = await db.insert(guardDevices).values({ guardId, deviceId, model }).returning()
  return c.json(created, 201)
})

// Admin revokes a guard's active binding for a device. 404 if none is active.
guardRoutes.post('/:id/devices/:deviceId/revoke', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const [updated] = await db
    .update(guardDevices)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(guardDevices.guardId, c.req.param('id')),
        eq(guardDevices.deviceId, c.req.param('deviceId')),
        isNull(guardDevices.revokedAt),
      ),
    )
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
