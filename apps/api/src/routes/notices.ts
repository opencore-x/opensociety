import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { desc } from 'drizzle-orm'
import { notices } from '@opensociety/db'
import { createNoticeSchema } from '@opensociety/shared'
import { withDb, withAuth, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const noticeRoutes = new Hono<AppEnv>()
noticeRoutes.use('*', withDb)
noticeRoutes.use('*', withAuth)

noticeRoutes.get('/', async (c) => {
  const rows = await c.get('db').select().from(notices).orderBy(desc(notices.publishedAt))
  return c.json(rows)
})

noticeRoutes.post('/', zValidator('json', createNoticeSchema), async (c) => {
  const userId = actingUserId(c)
  if (!userId) return c.json({ error: 'authentication required' }, 401)
  const input = c.req.valid('json')
  const [created] = await c
    .get('db')
    .insert(notices)
    .values({
      title: input.title,
      body: input.body,
      priority: input.priority,
      publishedBy: userId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })
    .returning()
  return c.json(created, 201)
})
