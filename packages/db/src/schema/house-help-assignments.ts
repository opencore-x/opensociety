import { pgTable, uuid, timestamp, unique } from 'drizzle-orm/pg-core'
import { houseHelp } from './house-help'
import { apartments } from './apartments'
import { users } from './users'

// Which apartments a house help serves. One help ↔ many apartments (a maid may
// work several flats); the unique pair keeps a help from being double-assigned
// to the same apartment. assignedBy is the admin or resident who linked them.
export const houseHelpAssignments = pgTable(
  'house_help_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    houseHelpId: uuid('house_help_id')
      .notNull()
      .references(() => houseHelp.id),
    apartmentId: uuid('apartment_id')
      .notNull()
      .references(() => apartments.id),
    assignedBy: uuid('assigned_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [unique('house_help_assignments_help_apartment_unq').on(t.houseHelpId, t.apartmentId)],
)
