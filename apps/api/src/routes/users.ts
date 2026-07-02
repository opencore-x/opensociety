import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { desc, eq } from 'drizzle-orm'
import { users, residencies, apartments } from '@opensociety/db'
import type { UserStatus } from '@opensociety/shared'
import { approveUserSchema, updateUserRoleSchema } from '@opensociety/shared'
import { withDb, withAuth, requireRole } from '../middleware'
import { parsePagination } from '../pagination'
import type { AppEnv } from '../types'

export const userRoutes = new Hono<AppEnv>()
userRoutes.use('*', withDb)
userRoutes.use('*', withAuth)
// User management (approval queue, approve, role changes) is admin-only.
userRoutes.use('*', requireRole('ADMIN'))

// ?status=PENDING -> admin approval queue
userRoutes.get('/', async (c) => {
  const db = c.get('db')
  const status = c.req.query('status') as UserStatus | undefined
  const { limit, offset } = parsePagination(c)
  const rows = await db
    .select()
    .from(users)
    .where(status ? eq(users.status, status) : undefined)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset)
  return c.json(rows)
})

// Approve a PENDING user and link them to an apartment in one step. The
// neon-http driver has no interactive transactions, so we validate the user and
// apartment, create the residency, and only flip the user to APPROVED last —
// that way a failure never leaves a half-approved user with no residency.
userRoutes.post('/:id/approve', zValidator('json', approveUserSchema), async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const input = c.req.valid('json')

  const [target] = await db.select({ id: users.id }).from(users).where(eq(users.id, id)).limit(1)
  if (!target) return c.json({ error: 'not found' }, 404)

  const [apt] = await db
    .select({ id: apartments.id })
    .from(apartments)
    .where(eq(apartments.id, input.apartmentId))
    .limit(1)
  if (!apt) return c.json({ error: 'apartment not found' }, 404)

  await db.insert(residencies).values({
    userId: id,
    apartmentId: input.apartmentId,
    relation: input.relation,
    isPrimary: input.isPrimary,
  })
  const [updated] = await db
    .update(users)
    .set({ status: 'APPROVED', updatedAt: new Date() })
    .where(eq(users.id, id))
    .returning()
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
