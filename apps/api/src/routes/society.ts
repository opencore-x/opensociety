import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { eq } from 'drizzle-orm'
import { societyConfig } from '@opensociety/db'
import { updateSocietyConfigSchema } from '@opensociety/shared'
import { withDb } from '../middleware'
import type { AppEnv } from '../types'

export const societyRoutes = new Hono<AppEnv>()
societyRoutes.use('*', withDb)

// Single-tenant: at most one config row.
societyRoutes.get('/', async (c) => {
  const [row] = await c.get('db').select().from(societyConfig).limit(1)
  return c.json(row ?? null)
})

// Upsert the single society config row.
societyRoutes.put('/', zValidator('json', updateSocietyConfigSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const [existing] = await db.select().from(societyConfig).limit(1)
  if (existing) {
    const [updated] = await db
      .update(societyConfig)
      .set({ ...input, updatedAt: new Date() })
      .where(eq(societyConfig.id, existing.id))
      .returning()
    return c.json(updated)
  }
  const [created] = await db.insert(societyConfig).values(input).returning()
  return c.json(created, 201)
})
