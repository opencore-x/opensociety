import { pgTable, uuid, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'
import { apartments } from './apartments'
import { residencyRelation } from './enums'

// Junction: which users live in which apartments, and in what capacity.
export const residencies = pgTable('residencies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  relation: residencyRelation('relation').notNull().default('OWNER'),
  isPrimary: boolean('is_primary').notNull().default(false),
  startDate: timestamp('start_date').defaultNow().notNull(),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
