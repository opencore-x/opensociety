import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { noticePriority, noticeCategory } from './enums'

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  priority: noticePriority('priority').notNull().default('NORMAL'),
  category: noticeCategory('category').notNull().default('GENERAL'),
  // Optional single attachment (PDF/image) stored in R2; url is the /uploads path.
  attachmentUrl: text('attachment_url'),
  attachmentName: text('attachment_name'),
  publishedBy: uuid('published_by')
    .notNull()
    .references(() => users.id),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
