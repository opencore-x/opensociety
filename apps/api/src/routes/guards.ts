import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { asc, eq } from 'drizzle-orm'
import { guards } from '@opensociety/db'
import { createGuardSchema, updateGuardSchema } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole } from '../middleware'
import type { AppEnv } from '../types'

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
