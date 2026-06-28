import { z } from 'zod'
import { noticePrioritySchema } from './enums'

export const noticeSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  body: z.string(),
  priority: noticePrioritySchema,
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
  expiresAt: z.string().datetime().optional(),
})

export type Notice = z.infer<typeof noticeSchema>
export type CreateNotice = z.infer<typeof createNoticeSchema>
