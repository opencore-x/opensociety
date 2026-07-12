import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq, isNull } from 'drizzle-orm'
import { houseHelp, houseHelpEntries } from '@opensociety/db'
import type { HouseHelpType } from '@opensociety/shared'
import {
  createHouseHelpSchema,
  updateHouseHelpSchema,
  houseHelpTypeSchema,
  checkInHouseHelpSchema,
  canManageHouseHelp,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const houseHelpRoutes = new Hono<AppEnv>()
houseHelpRoutes.use('*', withDb)
houseHelpRoutes.use('*', withAuth)
houseHelpRoutes.use('*', requireAuth)

// Registry list. Admins see everyone; other roles see only active profiles.
// Optional ?type= filters by help category.
houseHelpRoutes.get('/', async (c) => {
  const db = c.get('db')
  const typeParam = c.req.query('type')
  const conds = []
  if (c.get('userRole') !== 'ADMIN') conds.push(eq(houseHelp.isActive, true))
  const parsedType = houseHelpTypeSchema.safeParse(typeParam)
  if (parsedType.success) conds.push(eq(houseHelp.type, parsedType.data as HouseHelpType))

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
// ?houseHelpId= scopes to one worker. Newest first.
houseHelpRoutes.get('/entries', async (c) => {
  const db = c.get('db')
  const conds = []
  if (c.req.query('active') === 'true') conds.push(isNull(houseHelpEntries.checkOutAt))
  const forHelp = c.req.query('houseHelpId')
  if (forHelp) conds.push(eq(houseHelpEntries.houseHelpId, forHelp))

  const rows = await db
    .select()
    .from(houseHelpEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(houseHelpEntries.checkInAt))
  return c.json(rows)
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
