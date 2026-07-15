import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, inArray, isNull, isNotNull } from 'drizzle-orm'
import { vehicles, visitorEntries, apartments, residencies, parkingSlots } from '@opensociety/db'
import { createVehicleSchema, updateVehicleSchema, normalizePlate, canManageVehicle } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

// The apartment ids the acting user currently lives in (open residencies).
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

export const vehicleRoutes = new Hono<AppEnv>()
vehicleRoutes.use('*', withDb)
vehicleRoutes.use('*', withAuth)
vehicleRoutes.use('*', requireAuth)

// Registry list. Admins see all vehicles; residents see only their flats'.
// ?apartmentId= scopes to one flat (still constrained to the caller's flats
// for non-admins).
vehicleRoutes.get('/', async (c) => {
  const db = c.get('db')
  const conds = []
  const apartmentId = c.req.query('apartmentId')

  if (c.get('userRole') !== 'ADMIN') {
    const mine = await actingUserApartments(c)
    if (mine.length === 0) return c.json([])
    conds.push(inArray(vehicles.apartmentId, apartmentId && mine.includes(apartmentId) ? [apartmentId] : mine))
  } else if (apartmentId) {
    conds.push(eq(vehicles.apartmentId, apartmentId))
  }

  const rows = await db
    .select()
    .from(vehicles)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(vehicles.createdAt))
  return c.json(rows)
})

// Gate log: visitor entries that arrived with a vehicle (auto-captured when a
// guard logs a visitor). Admin/guard only; newest first. Flags whether the
// plate matches a registered resident vehicle.
vehicleRoutes.get('/gate-log', requireRole('ADMIN', 'GUARD'), async (c) => {
  const db = c.get('db')
  const rows = await db
    .select({
      id: visitorEntries.id,
      visitorName: visitorEntries.visitorName,
      vehicleNumber: visitorEntries.vehicleNumber,
      type: visitorEntries.type,
      status: visitorEntries.status,
      checkInAt: visitorEntries.checkInAt,
      checkOutAt: visitorEntries.checkOutAt,
      createdAt: visitorEntries.createdAt,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(visitorEntries)
    .leftJoin(apartments, eq(apartments.id, visitorEntries.apartmentId))
    .where(isNotNull(visitorEntries.vehicleNumber))
    .orderBy(desc(visitorEntries.createdAt))
    .limit(100)

  const known = await db.select({ plate: vehicles.registrationNumber }).from(vehicles)
  const registered = new Set(known.map((k) => k.plate))
  return c.json(
    rows.map(({ tower, apartmentNo, vehicleNumber, ...r }) => ({
      ...r,
      vehicleNumber,
      apartment: tower ? `${tower}-${apartmentNo}` : null,
      registered: vehicleNumber ? registered.has(normalizePlate(vehicleNumber)) : false,
    })),
  )
})

// Gate check: match an arriving plate against registered vehicles. Returns the
// owner's flat + that flat's active parking slots, or registered:false so the
// guard can flag an unknown vehicle.
vehicleRoutes.get('/verify', requireRole('GUARD', 'ADMIN'), async (c) => {
  const db = c.get('db')
  const plate = normalizePlate(c.req.query('plate') ?? '')
  if (!plate) return c.json({ error: 'plate required' }, 400)
  const [match] = await db
    .select({
      id: vehicles.id,
      registrationNumber: vehicles.registrationNumber,
      type: vehicles.type,
      make: vehicles.make,
      color: vehicles.color,
      isActive: vehicles.isActive,
      apartmentId: vehicles.apartmentId,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(vehicles)
    .innerJoin(apartments, eq(apartments.id, vehicles.apartmentId))
    .where(eq(vehicles.registrationNumber, plate))
    .limit(1)
  if (!match) return c.json({ plate, registered: false, vehicle: null, parkingSlots: [] })
  const slots = await db
    .select({ slotNumber: parkingSlots.slotNumber, type: parkingSlots.type })
    .from(parkingSlots)
    .where(and(eq(parkingSlots.apartmentId, match.apartmentId), eq(parkingSlots.isActive, true)))
    .orderBy(asc(parkingSlots.slotNumber))
  return c.json({
    plate,
    registered: true,
    vehicle: {
      id: match.id,
      registrationNumber: match.registrationNumber,
      type: match.type,
      make: match.make,
      color: match.color,
      isActive: match.isActive,
      apartment: `${match.tower}-${match.apartmentNo}`,
    },
    parkingSlots: slots,
  })
})

// Register a vehicle for a flat. Admins may register for any flat; a resident
// only for a flat they live in. 404 if the flat is missing, 403 if not allowed,
// 409 if the plate is already registered.
vehicleRoutes.post('/', zValidator('json', createVehicleSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')

  const [apartment] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(eq(apartments.id, input.apartmentId))
    .limit(1)
  if (!apartment) return c.json({ error: 'apartment not found' }, 404)

  const mine = await actingUserApartments(c)
  if (!canManageVehicle(c.get('userRole'), mine.includes(input.apartmentId)))
    return c.json({ error: 'forbidden' }, 403)

  const registrationNumber = normalizePlate(input.registrationNumber)
  const [dupe] = await db
    .select({ id: vehicles.id })
    .from(vehicles)
    .where(eq(vehicles.registrationNumber, registrationNumber))
    .limit(1)
  if (dupe) return c.json({ error: 'vehicle already registered' }, 409)

  const [created] = await db
    .insert(vehicles)
    .values({
      apartmentId: input.apartmentId,
      registrationNumber,
      type: input.type,
      make: input.make,
      color: input.color,
      registeredBy: actingUserId(c),
    })
    .returning()
  return c.json(created, 201)
})

// Update / deactivate a vehicle. Admin, or a resident of the vehicle's flat.
// 404 if missing, 403 if not allowed, 409 if renaming onto an existing plate.
vehicleRoutes.put('/:id', zValidator('json', updateVehicleSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [existing] = await db
    .select({ apartmentId: vehicles.apartmentId })
    .from(vehicles)
    .where(eq(vehicles.id, id))
    .limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)

  const mine = await actingUserApartments(c)
  if (!canManageVehicle(c.get('userRole'), mine.includes(existing.apartmentId)))
    return c.json({ error: 'forbidden' }, 403)

  const input = c.req.valid('json')
  const patch = { ...input, updatedAt: new Date() } as Partial<typeof vehicles.$inferInsert>
  if (input.registrationNumber !== undefined) {
    const registrationNumber = normalizePlate(input.registrationNumber)
    const [dupe] = await db
      .select({ id: vehicles.id })
      .from(vehicles)
      .where(eq(vehicles.registrationNumber, registrationNumber))
      .limit(1)
    if (dupe && dupe.id !== id) return c.json({ error: 'vehicle already registered' }, 409)
    patch.registrationNumber = registrationNumber
  }

  const [updated] = await db.update(vehicles).set(patch).where(eq(vehicles.id, id)).returning()
  return c.json(updated)
})
