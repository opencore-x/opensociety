import { pgTable, uuid, integer, jsonb, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users'

// Singleton recurring-bill template used by the monthly auto-generation cron.
// lineItems is the set of charges applied to every flat (amounts in paise, GST%);
// dueDayOfMonth sets each bill's due date within the billing month.
export const billConfig = pgTable('bill_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  dueDayOfMonth: integer('due_day_of_month').notNull().default(10),
  lineItems: jsonb('line_items')
    .$type<{ description: string; amount: number; taxRatePct: number }[]>()
    .notNull()
    .default([]),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
