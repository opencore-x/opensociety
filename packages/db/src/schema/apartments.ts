import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { societies } from './societies'

export const apartments = pgTable('apartments', {
  id: uuid('id').primaryKey().defaultRandom(),
  societyId: uuid('society_id').notNull().references(() => societies.id),
  number: text('number').notNull(),
  block: text('block'),
  floor: text('floor'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
