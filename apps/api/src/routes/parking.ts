import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { asc, eq } from 'drizzle-orm'
import { parkingSlots, apartments } from '@opensociety/db'
import {
  createParkingSlotSchema,
  updateParkingSlotSchema,
  assignParkingSlotSchema,
  normalizeSlotNumber,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const parkingRoutes = new Hono<AppEnv>()
parkingRoutes.use('*', withDb)
parkingRoutes.use('*', withAuth)
parkingRoutes.use('*', requireAuth)

// Full inventory with each slot's assigned flat label. Admin-only management view.
parkingRoutes.get('/slots', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const rows = await db
    .select({
      id: parkingSlots.id,
      slotNumber: parkingSlots.slotNumber,
      type: parkingSlots.type,
      apartmentId: parkingSlots.apartmentId,
      isTemporary: parkingSlots.isTemporary,
      assignedUntil: parkingSlots.assignedUntil,
      assignedBy: parkingSlots.assignedBy,
      assignedAt: parkingSlots.assignedAt,
      notes: parkingSlots.notes,
      isActive: parkingSlots.isActive,
      createdAt: parkingSlots.createdAt,
      updatedAt: parkingSlots.updatedAt,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(parkingSlots)
    .leftJoin(apartments, eq(apartments.id, parkingSlots.apartmentId))
    .orderBy(asc(parkingSlots.slotNumber))
  return c.json(
    rows.map(({ tower, apartmentNo, ...r }) => ({
      ...r,
      apartment: tower ? `${tower}-${apartmentNo}` : null,
    })),
  )
})

// Read-only directory any resident can see: which slot belongs to which flat.
parkingRoutes.get('/directory', async (c) => {
  const db = c.get('db')
  const rows = await db
    .select({
      slotNumber: parkingSlots.slotNumber,
      type: parkingSlots.type,
      isTemporary: parkingSlots.isTemporary,
      assignedUntil: parkingSlots.assignedUntil,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(parkingSlots)
    .leftJoin(apartments, eq(apartments.id, parkingSlots.apartmentId))
    .where(eq(parkingSlots.isActive, true))
    .orderBy(asc(parkingSlots.slotNumber))
  return c.json(
    rows.map(({ tower, apartmentNo, ...r }) => ({
      ...r,
      apartment: tower ? `${tower}-${apartmentNo}` : null,
    })),
  )
})

// Create a slot. 409 if the (normalized) number already exists.
parkingRoutes.post('/slots', requireRole('ADMIN'), zValidator('json', createParkingSlotSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const slotNumber = normalizeSlotNumber(input.slotNumber)

  const [dupe] = await db
    .select({ id: parkingSlots.id })
    .from(parkingSlots)
    .where(eq(parkingSlots.slotNumber, slotNumber))
    .limit(1)
  if (dupe) return c.json({ error: 'slot number already exists' }, 409)

  const [created] = await db
    .insert(parkingSlots)
    .values({ slotNumber, type: input.type, notes: input.notes })
    .returning()
  return c.json(created, 201)
})

// Edit a slot's number/type/notes/active flag. 409 on renaming onto an existing number.
parkingRoutes.put('/slots/:id', requireRole('ADMIN'), zValidator('json', updateParkingSlotSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [existing] = await db.select({ id: parkingSlots.id }).from(parkingSlots).where(eq(parkingSlots.id, id)).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  const input = c.req.valid('json')
  const patch = { ...input, updatedAt: new Date() } as Partial<typeof parkingSlots.$inferInsert>
  if (input.slotNumber !== undefined) {
    const slotNumber = normalizeSlotNumber(input.slotNumber)
    const [dupe] = await db
      .select({ id: parkingSlots.id })
      .from(parkingSlots)
      .where(eq(parkingSlots.slotNumber, slotNumber))
      .limit(1)
    if (dupe && dupe.id !== id) return c.json({ error: 'slot number already exists' }, 409)
    patch.slotNumber = slotNumber
  }

  const [updated] = await db.update(parkingSlots).set(patch).where(eq(parkingSlots.id, id)).returning()
  return c.json(updated)
})

// Allocate a slot to a flat, or release it (apartmentId null). Temporary
// allocations carry an assignedUntil. 404 if the slot or target flat is missing.
parkingRoutes.post('/slots/:id/assign', requireRole('ADMIN'), zValidator('json', assignParkingSlotSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [existing] = await db.select({ id: parkingSlots.id }).from(parkingSlots).where(eq(parkingSlots.id, id)).limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  if (input.apartmentId) {
    const [apt] = await db
      .select({ id: apartments.id })
      .from(apartments)
      .where(eq(apartments.id, input.apartmentId))
      .limit(1)
    if (!apt) return c.json({ error: 'apartment not found' }, 404)
  }

  const releasing = input.apartmentId === null
  const [updated] = await db
    .update(parkingSlots)
    .set({
      apartmentId: input.apartmentId,
      isTemporary: input.isTemporary,
      assignedUntil: input.assignedUntil ? new Date(input.assignedUntil) : null,
      assignedBy: releasing ? null : actingUserId(c),
      assignedAt: releasing ? null : new Date(),
      updatedAt: new Date(),
    })
    .where(eq(parkingSlots.id, id))
    .returning()
  return c.json(updated)
})

// Hard-delete a slot from the inventory (admins can also just deactivate via PUT).
parkingRoutes.delete('/slots/:id', requireRole('ADMIN'), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [deleted] = await db.delete(parkingSlots).where(eq(parkingSlots.id, id)).returning({ id: parkingSlots.id })
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.json({ ok: true })
})
