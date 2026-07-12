import { z } from 'zod'
import { noticePrioritySchema, noticeCategorySchema } from './enums'

export const noticeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  priority: noticePrioritySchema,
  category: noticeCategorySchema,
  attachmentUrl: z.string().nullable(),
  attachmentName: z.string().nullable(),
  publishedBy: z.string().uuid(),
  publishedAt: z.string(),
  expiresAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createNoticeSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  priority: noticePrioritySchema.default('NORMAL'),
  category: noticeCategorySchema.default('GENERAL'),
  attachmentUrl: z.string().optional(),
  attachmentName: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
})

// Case-insensitive keyword match over a notice's title and body — used for the
// archive search (client-side filtering; the API applies the same via SQL).
export function noticeMatchesQuery(notice: { title: string; body: string }, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return notice.title.toLowerCase().includes(q) || notice.body.toLowerCase().includes(q)
}

export type Notice = z.infer<typeof noticeSchema>
export type CreateNotice = z.infer<typeof createNoticeSchema>
