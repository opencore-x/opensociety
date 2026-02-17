import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'

export const visitors = pgTable('visitors', {
  id: uuid('id').primaryKey().defaultRandom(),
  apartmentId: uuid('apartment_id').notNull().references(() => apartments.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  name: text('name').notNull(),
  phone: text('phone').notNull(),
  purpose: text('purpose'),
  checkInAt: timestamp('check_in_at'),
  checkOutAt: timestamp('check_out_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
