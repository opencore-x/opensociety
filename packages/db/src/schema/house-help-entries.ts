import { pgTable, uuid, timestamp, index } from 'drizzle-orm/pg-core'
import { houseHelp } from './house-help'
import { apartments } from './apartments'
import { users } from './users'

// Attendance log: one row per gate visit for a registered house help. Pre-approved
// help is checked in instantly by the guard (no resident approval), so there is no
// status machine here — an open row (checkOutAt null) means "currently inside".
// Working hours derive from check_in_at -> check_out_at.
export const houseHelpEntries = pgTable('house_help_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  houseHelpId: uuid('house_help_id')
    .notNull()
    .references(() => houseHelp.id),
  apartmentId: uuid('apartment_id').references(() => apartments.id),
  checkInAt: timestamp('check_in_at').defaultNow().notNull(),
  checkInBy: uuid('check_in_by').references(() => users.id),
  checkOutAt: timestamp('check_out_at'),
  checkOutBy: uuid('check_out_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('house_help_entries_house_help_id_idx').on(t.houseHelpId)])
