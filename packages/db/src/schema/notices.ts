import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'
import { noticePriority } from './enums'

export const notices = pgTable('notices', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  priority: noticePriority('priority').notNull().default('NORMAL'),
  publishedBy: uuid('published_by')
    .notNull()
    .references(() => users.id),
  publishedAt: timestamp('published_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
