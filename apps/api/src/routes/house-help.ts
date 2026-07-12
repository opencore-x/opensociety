import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, eq } from 'drizzle-orm'
import { houseHelp } from '@opensociety/db'
import type { HouseHelpType } from '@opensociety/shared'
import {
  createHouseHelpSchema,
  updateHouseHelpSchema,
  houseHelpTypeSchema,
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
