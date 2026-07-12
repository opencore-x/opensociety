import { pgTable, uuid, text, timestamp, boolean, unique } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { vehicleType } from './enums'

// Resident-owned vehicles, registered against a flat. registrationNumber is
// stored normalized (uppercase, no spaces) and unique so gate logs can match a
// plate to a known resident vehicle. Gate entries themselves are captured on
// visitor_entries.vehicleNumber — this table is the registry side.
export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    apartmentId: uuid('apartment_id')
      .notNull()
      .references(() => apartments.id),
    registeredBy: uuid('registered_by').references(() => users.id),
    registrationNumber: text('registration_number').notNull(),
    type: vehicleType('type').notNull().default('CAR'),
    make: text('make'),
    color: text('color'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('vehicles_registration_number_unq').on(t.registrationNumber)],
)
