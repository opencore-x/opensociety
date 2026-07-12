import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { billConfig } from '@opensociety/db'
import { updateBillConfigSchema } from '@opensociety/shared'
import { withDb, withAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

// The recurring-bill template that drives the monthly auto-generation cron.
// Admin-only. A singleton row.
export const billConfigRoutes = new Hono<AppEnv>()
billConfigRoutes.use('*', withDb)
billConfigRoutes.use('*', withAuth)
billConfigRoutes.use('*', requireRole('ADMIN'))

billConfigRoutes.get('/', async (c) => {
  const [cfg] = await c.get('db').select().from(billConfig).limit(1)
  return c.json(cfg ?? { id: null, dueDayOfMonth: 10, lineItems: [], updatedBy: null, updatedAt: null })
})

billConfigRoutes.put('/', zValidator('json', updateBillConfigSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const [existing] = await db.select({ id: billConfig.id }).from(billConfig).limit(1)
  if (existing) {
    const [updated] = await db
      .update(billConfig)
      .set({ dueDayOfMonth: input.dueDayOfMonth, lineItems: input.lineItems, updatedBy: actingUserId(c), updatedAt: new Date() })
      .where(eq(billConfig.id, existing.id))
      .returning()
    return c.json(updated)
  }
  const [created] = await db
    .insert(billConfig)
    .values({ dueDayOfMonth: input.dueDayOfMonth, lineItems: input.lineItems, updatedBy: actingUserId(c) })
    .returning()
  return c.json(created, 201)
})
