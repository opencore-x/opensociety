import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, gte, ilike, lte, or } from 'drizzle-orm'
import { notices } from '@opensociety/db'
import type { NoticeCategory } from '@opensociety/shared'
import { createNoticeSchema, noticeCategorySchema } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const noticeRoutes = new Hono<AppEnv>()
noticeRoutes.use('*', withDb)
noticeRoutes.use('*', withAuth)
// Any signed-in user can read the board; only admins publish.
noticeRoutes.use('*', requireAuth)

// Notice board / archive. Filters: ?category=, ?from=/?to= (published date, ISO),
// ?q= keyword over title + body. Newest first.
noticeRoutes.get('/', async (c) => {
  const db = c.get('db')
  const conds = []

  const cat = noticeCategorySchema.safeParse(c.req.query('category'))
  if (cat.success) conds.push(eq(notices.category, cat.data as NoticeCategory))
  const from = new Date(c.req.query('from') ?? '')
  if (!isNaN(from.valueOf())) conds.push(gte(notices.publishedAt, from))
  const to = new Date(c.req.query('to') ?? '')
  if (!isNaN(to.valueOf())) conds.push(lte(notices.publishedAt, to))
  const q = c.req.query('q')?.trim()
  if (q) {
    const like = `%${q}%`
    conds.push(or(ilike(notices.title, like), ilike(notices.body, like)))
  }

  const rows = await db
    .select()
    .from(notices)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(notices.publishedAt))
  return c.json(rows)
})

noticeRoutes.post('/', requireRole('ADMIN'), zValidator('json', createNoticeSchema), async (c) => {
  const userId = actingUserId(c)!
  const input = c.req.valid('json')
  const [created] = await c
    .get('db')
    .insert(notices)
    .values({
      title: input.title,
      body: input.body,
      priority: input.priority,
      category: input.category,
      attachmentUrl: input.attachmentUrl,
      attachmentName: input.attachmentName,
      publishedBy: userId,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
    })
    .returning()
  return c.json(created, 201)
})
