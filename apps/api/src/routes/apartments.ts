import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { asc, eq } from 'drizzle-orm'
import { apartments } from '@opensociety/db'
import { createApartmentSchema, createApartmentsBulkSchema, updateApartmentSchema } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole } from '../middleware'
import type { AppEnv } from '../types'

export const apartmentRoutes = new Hono<AppEnv>()
apartmentRoutes.use('*', withDb)
apartmentRoutes.use('*', withAuth)
// Any signed-in user can read the directory; only admins mutate it.
apartmentRoutes.use('*', requireAuth)

apartmentRoutes.get('/', async (c) => {
  const rows = await c
    .get('db')
    .select()
    .from(apartments)
    .orderBy(asc(apartments.tower), asc(apartments.apartmentNo))
  return c.json(rows)
})

apartmentRoutes.post('/', requireRole('ADMIN'), zValidator('json', createApartmentSchema), async (c) => {
  const [created] = await c.get('db').insert(apartments).values(c.req.valid('json')).returning()
  return c.json(created, 201)
})

// Society setup: bulk import (e.g. from a CSV upload).
apartmentRoutes.post('/bulk', requireRole('ADMIN'), zValidator('json', createApartmentsBulkSchema), async (c) => {
  const { apartments: list } = c.req.valid('json')
  const created = await c.get('db').insert(apartments).values(list).returning()
  return c.json({ count: created.length, apartments: created }, 201)
})

// Edit a unit or toggle its active state (soft deactivation via isActive).
apartmentRoutes.patch('/:id', requireRole('ADMIN'), zValidator('json', updateApartmentSchema), async (c) => {
  const [updated] = await c
    .get('db')
    .update(apartments)
    .set({ ...c.req.valid('json'), updatedAt: new Date() })
    .where(eq(apartments.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
