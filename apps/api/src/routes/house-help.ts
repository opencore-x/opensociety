import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import { houseHelp, houseHelpEntries, houseHelpAssignments, apartments, residencies } from '@opensociety/db'
import type { HouseHelpType } from '@opensociety/shared'
import {
  createHouseHelpSchema,
  updateHouseHelpSchema,
  houseHelpTypeSchema,
  checkInHouseHelpSchema,
  createHouseHelpAssignmentSchema,
  canManageHouseHelp,
  canManageHouseHelpAssignment,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

// True when the acting user currently lives in `apartmentId` (open residency).
async function actingUserLivesIn(c: Context<AppEnv>, apartmentId: string): Promise<boolean> {
  const uid = actingUserId(c)
  if (!uid) return false
  const [row] = await c
    .get('db')
    .select({ id: residencies.id })
    .from(residencies)
    .where(
      and(
        eq(residencies.userId, uid),
        eq(residencies.apartmentId, apartmentId),
        isNull(residencies.endDate),
      ),
    )
    .limit(1)
  return !!row
}

export const houseHelpRoutes = new Hono<AppEnv>()
houseHelpRoutes.use('*', withDb)
houseHelpRoutes.use('*', withAuth)
houseHelpRoutes.use('*', requireAuth)

// Registry list. Admins see everyone; other roles see only active profiles.
// ?type= filters by category; ?apartmentId= limits to help assigned to that flat.
houseHelpRoutes.get('/', async (c) => {
  const db = c.get('db')
  const typeParam = c.req.query('type')
  const conds = []
  if (c.get('userRole') !== 'ADMIN') conds.push(eq(houseHelp.isActive, true))
  const parsedType = houseHelpTypeSchema.safeParse(typeParam)
  if (parsedType.success) conds.push(eq(houseHelp.type, parsedType.data as HouseHelpType))
  const apartmentId = c.req.query('apartmentId')
  if (apartmentId)
    conds.push(
      inArray(
        houseHelp.id,
        db
          .select({ id: houseHelpAssignments.houseHelpId })
          .from(houseHelpAssignments)
          .where(eq(houseHelpAssignments.apartmentId, apartmentId)),
      ),
    )

  const rows = await db
    .select()
    .from(houseHelp)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(asc(houseHelp.name))
  return c.json(rows)
})

// Residents register the domestic staff they employ; admins may register any.
houseHelpRoutes.post('/', requireRole('RESIDENT', 'ADMIN'), zValidator('json', createHouseHelpSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const [created] = await db
    .insert(houseHelp)
    .values({ ...input, registeredBy: actingUserId(c) })
    .returning()
  return c.json(created, 201)
})

// Update / deactivate a profile. Allowed for admins or the resident who
// registered it. 404 if missing, 403 if the acting user may not manage it.
houseHelpRoutes.put('/:id', zValidator('json', updateHouseHelpSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [existing] = await db
    .select({ registeredBy: houseHelp.registeredBy })
    .from(houseHelp)
    .where(eq(houseHelp.id, id))
    .limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)
  if (!canManageHouseHelp(c.get('userRole'), existing.registeredBy, actingUserId(c)))
    return c.json({ error: 'forbidden' }, 403)

  const [updated] = await db
    .update(houseHelp)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(eq(houseHelp.id, id))
    .returning()
  return c.json(updated)
})

// Attendance log. ?active=true returns only open entries (still inside);
// ?houseHelpId= scopes to one worker; ?from=/?to= bound the check-in date
// (ISO). Newest first.
houseHelpRoutes.get('/entries', async (c) => {
  const db = c.get('db')
  const conds = []
  if (c.req.query('active') === 'true') conds.push(isNull(houseHelpEntries.checkOutAt))
  const forHelp = c.req.query('houseHelpId')
  if (forHelp) conds.push(eq(houseHelpEntries.houseHelpId, forHelp))
  const from = new Date(c.req.query('from') ?? '')
  if (!isNaN(from.valueOf())) conds.push(gte(houseHelpEntries.checkInAt, from))
  const to = new Date(c.req.query('to') ?? '')
  if (!isNaN(to.valueOf())) conds.push(lte(houseHelpEntries.checkInAt, to))

  const rows = await db
    .select({
      id: houseHelpEntries.id,
      houseHelpId: houseHelpEntries.houseHelpId,
      apartmentId: houseHelpEntries.apartmentId,
      checkInAt: houseHelpEntries.checkInAt,
      checkInBy: houseHelpEntries.checkInBy,
      checkOutAt: houseHelpEntries.checkOutAt,
      checkOutBy: houseHelpEntries.checkOutBy,
      createdAt: houseHelpEntries.createdAt,
      helpName: houseHelp.name,
      type: houseHelp.type,
      tower: apartments.tower,
      apartmentNo: apartments.apartmentNo,
    })
    .from(houseHelpEntries)
    .leftJoin(houseHelp, eq(houseHelp.id, houseHelpEntries.houseHelpId))
    .leftJoin(apartments, eq(apartments.id, houseHelpEntries.apartmentId))
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(houseHelpEntries.checkInAt))

  return c.json(
    rows.map(({ tower, apartmentNo, helpName, type, ...r }) => ({
      ...r,
      helpName: helpName ?? '',
      type: type ?? '',
      apartment: tower ? `${tower}-${apartmentNo}` : null,
    })),
  )
})

// Guard instantly checks in a pre-approved house help (no resident approval).
// 404 if the profile is missing, 409 if it is inactive or already inside.
houseHelpRoutes.post('/:id/checkin', requireRole('GUARD', 'ADMIN'), zValidator('json', checkInHouseHelpSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [help] = await db
    .select({ isActive: houseHelp.isActive })
    .from(houseHelp)
    .where(eq(houseHelp.id, id))
    .limit(1)
  if (!help) return c.json({ error: 'not found' }, 404)
  if (!help.isActive) return c.json({ error: 'house help is inactive' }, 409)

  const [open] = await db
    .select({ id: houseHelpEntries.id })
    .from(houseHelpEntries)
    .where(and(eq(houseHelpEntries.houseHelpId, id), isNull(houseHelpEntries.checkOutAt)))
    .limit(1)
  if (open) return c.json({ error: 'already checked in' }, 409)

  const [entry] = await db
    .insert(houseHelpEntries)
    .values({ houseHelpId: id, apartmentId: c.req.valid('json').apartmentId, checkInBy: actingUserId(c) })
    .returning()
  return c.json(entry, 201)
})

// Guard checks a house help out, closing the open attendance row.
// 404 if the entry is missing, 409 if it was already checked out.
houseHelpRoutes.post('/entries/:entryId/checkout', requireRole('GUARD', 'ADMIN'), async (c) => {
  const db = c.get('db')
  const entryId = c.req.param('entryId')
  const [entry] = await db
    .select({ checkOutAt: houseHelpEntries.checkOutAt })
    .from(houseHelpEntries)
    .where(eq(houseHelpEntries.id, entryId))
    .limit(1)
  if (!entry) return c.json({ error: 'not found' }, 404)
  if (entry.checkOutAt) return c.json({ error: 'already checked out' }, 409)

  const [updated] = await db
    .update(houseHelpEntries)
    .set({ checkOutAt: new Date(), checkOutBy: actingUserId(c) })
    .where(eq(houseHelpEntries.id, entryId))
    .returning()
  return c.json(updated)
})

// Apartments a house help is assigned to (which flats they serve).
houseHelpRoutes.get('/:id/assignments', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(houseHelpAssignments)
    .where(eq(houseHelpAssignments.houseHelpId, c.req.param('id')))
    .orderBy(desc(houseHelpAssignments.createdAt))
  return c.json(rows)
})

// Assign a house help to an apartment. Admins may assign to any flat; a resident
// only to a flat they live in. 404 if help/apartment missing, 403 if not allowed,
// 409 if already assigned to that apartment.
houseHelpRoutes.post('/:id/assignments', zValidator('json', createHouseHelpAssignmentSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const { apartmentId } = c.req.valid('json')

  const [help] = await db.select({ id: houseHelp.id }).from(houseHelp).where(eq(houseHelp.id, id)).limit(1)
  if (!help) return c.json({ error: 'house help not found' }, 404)
  const [apartment] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(eq(apartments.id, apartmentId))
    .limit(1)
  if (!apartment) return c.json({ error: 'apartment not found' }, 404)

  if (!canManageHouseHelpAssignment(c.get('userRole'), await actingUserLivesIn(c, apartmentId)))
    return c.json({ error: 'forbidden' }, 403)

  const [existing] = await db
    .select({ id: houseHelpAssignments.id })
    .from(houseHelpAssignments)
    .where(and(eq(houseHelpAssignments.houseHelpId, id), eq(houseHelpAssignments.apartmentId, apartmentId)))
    .limit(1)
  if (existing) return c.json({ error: 'already assigned to this apartment' }, 409)

  const [created] = await db
    .insert(houseHelpAssignments)
    .values({ houseHelpId: id, apartmentId, assignedBy: actingUserId(c) })
    .returning()
  return c.json(created, 201)
})

// Remove a house help ↔ apartment assignment. Admin, or a resident of that flat.
// 404 if there is no such assignment, 403 if the acting user may not manage it.
houseHelpRoutes.delete('/:id/assignments/:apartmentId', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const apartmentId = c.req.param('apartmentId')

  if (!canManageHouseHelpAssignment(c.get('userRole'), await actingUserLivesIn(c, apartmentId)))
    return c.json({ error: 'forbidden' }, 403)

  const [deleted] = await db
    .delete(houseHelpAssignments)
    .where(and(eq(houseHelpAssignments.houseHelpId, id), eq(houseHelpAssignments.apartmentId, apartmentId)))
    .returning()
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.json(deleted)
})
