import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { desc, eq } from 'drizzle-orm'
import { users, residencies } from '@opensociety/db'
import type { UserStatus } from '@opensociety/shared'
import { approveUserSchema, updateUserRoleSchema } from '@opensociety/shared'
import { withDb } from '../middleware'
import type { AppEnv } from '../types'

export const userRoutes = new Hono<AppEnv>()
userRoutes.use('*', withDb)

// ?status=PENDING -> admin approval queue
userRoutes.get('/', async (c) => {
  const db = c.get('db')
  const status = c.req.query('status') as UserStatus | undefined
  const rows = await db
    .select()
    .from(users)
    .where(status ? eq(users.status, status) : undefined)
    .orderBy(desc(users.createdAt))
  return c.json(rows)
})

// Approve a PENDING user and link them to an apartment in one step.
userRoutes.post('/:id/approve', zValidator('json', approveUserSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const input = c.req.valid('json')
  const [updated] = await db
    .update(users)
    .set({ status: 'APPROVED', updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  await db.insert(residencies).values({
    userId: id,
    apartmentId: input.apartmentId,
    relation: input.relation,
    isPrimary: input.isPrimary,
  })
  return c.json(updated)
})

userRoutes.patch('/:id/role', zValidator('json', updateUserRoleSchema), async (c) => {
  const [updated] = await c
    .get('db')
    .update(users)
    .set({ role: c.req.valid('json').role, updatedAt: new Date() })
    .where(eq(users.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
