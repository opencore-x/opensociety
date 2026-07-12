import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, count, desc, eq, gte, ilike, inArray, lte, or } from 'drizzle-orm'
import { notices, noticeReads, users } from '@opensociety/db'
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
// ?q= keyword over title + body. Newest first. Each notice is enriched with the
// total read count and whether the acting user has read it.
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
  const ids = rows.map((r) => r.id)
  if (ids.length === 0) return c.json([])

  const counts = await db
    .select({ noticeId: noticeReads.noticeId, n: count() })
    .from(noticeReads)
    .where(inArray(noticeReads.noticeId, ids))
    .groupBy(noticeReads.noticeId)
  const countByNotice = new Map(counts.map((r) => [r.noticeId, Number(r.n)]))

  const mine = await db
    .select({ noticeId: noticeReads.noticeId })
    .from(noticeReads)
    .where(and(eq(noticeReads.userId, actingUserId(c)!), inArray(noticeReads.noticeId, ids)))
  const readByMe = new Set(mine.map((r) => r.noticeId))

  return c.json(rows.map((r) => ({ ...r, readCount: countByNotice.get(r.id) ?? 0, read: readByMe.has(r.id) })))
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

// The acting user marks a notice read. Idempotent (unique notice+user). 404 if
// the notice does not exist.
noticeRoutes.post('/:id/read', async (c) => {
  const db = c.get('db')
  const noticeId = c.req.param('id')
  const [notice] = await db.select({ id: notices.id }).from(notices).where(eq(notices.id, noticeId)).limit(1)
  if (!notice) return c.json({ error: 'not found' }, 404)
  await db.insert(noticeReads).values({ noticeId, userId: actingUserId(c)! }).onConflictDoNothing()
  return c.json({ ok: true })
})

// Admin engagement view: who has read a notice, newest first.
noticeRoutes.get('/:id/reads', requireRole('ADMIN'), async (c) => {
  const rows = await c
    .get('db')
    .select({ userId: noticeReads.userId, name: users.name, readAt: noticeReads.readAt })
    .from(noticeReads)
    .innerJoin(users, eq(users.id, noticeReads.userId))
    .where(eq(noticeReads.noticeId, c.req.param('id')))
    .orderBy(desc(noticeReads.readAt))
  return c.json(rows)
})
