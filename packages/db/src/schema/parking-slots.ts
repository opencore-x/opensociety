import { pgTable, uuid, text, timestamp, boolean, unique } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { parkingSlotType } from './enums'

// Society parking inventory. Each row is one physical slot the admin allocates
// to a flat. slotNumber is stored normalized (uppercase, no spaces) and unique.
// A null apartmentId means the slot is unallocated. Temporary allocations set
// isTemporary + assignedUntil so the directory can show a slot as free again
// once the window lapses (enforced in the shared helpers, not the DB).
export const parkingSlots = pgTable(
  'parking_slots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    slotNumber: text('slot_number').notNull(),
    type: parkingSlotType('type').notNull().default('OPEN'),
    apartmentId: uuid('apartment_id').references(() => apartments.id),
    isTemporary: boolean('is_temporary').notNull().default(false),
    assignedUntil: timestamp('assigned_until'),
    assignedBy: uuid('assigned_by').references(() => users.id),
    assignedAt: timestamp('assigned_at'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('parking_slots_slot_number_unq').on(t.slotNumber)],
)
