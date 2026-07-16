import { pgTable, uuid, integer, jsonb, timestamp, boolean } from 'drizzle-orm/pg-core'
import { users } from './users'

// Singleton recurring-bill template used by the monthly auto-generation cron.
// lineItems is the set of charges applied to every flat (amounts in paise, GST%);
// dueDayOfMonth sets each bill's due date within the billing month.

export const billConfig = pgTable('bill_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  dueDayOfMonth: integer('due_day_of_month').notNull().default(10),
  lineItems: jsonb('line_items')
    .$type<{ description: string; amount: number; taxRatePct: number; accountId?: string }[]>()
    .notNull()
    .default([]),
  // Interest on arrears (#95). Opt-in, simple (not compound), waivable. Rate is
  // an annual percent capped by the society's registered bye-laws (Bye-law 71).
  interestEnabled: boolean('interest_enabled').notNull().default(false),
  interestRatePct: integer('interest_rate_pct').notNull().default(18),
  gracePeriodDays: integer('grace_period_days').notNull().default(15),
  updatedBy: uuid('updated_by').references(() => users.id),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
