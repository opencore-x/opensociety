import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'

// Single-tenant: each deployment serves ONE society. This table holds exactly one row
// describing that society (enforced at the application layer). No society_id elsewhere.
export const societyConfig = pgTable('society_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  pincode: text('pincode').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
