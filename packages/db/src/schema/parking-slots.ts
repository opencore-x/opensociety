import { pgTable, uuid, text, timestamp, boolean, unique, index } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { visitorEntries } from './visitor-entries'
import { parkingSlotType } from './enums'

// Society parking inventory. Each row is one physical slot. Resident slots are
// allocated to a flat (apartmentId); visitor slots (isVisitor) form a
// first-come pool auto-assigned to a visitor entry at the gate.
// slotNumber is stored normalized (uppercase, no spaces) and unique.
// A null apartmentId means the resident slot is unallocated. Temporary
// allocations set isTemporary + assignedUntil so the directory shows a slot as
// free again once the window lapses (enforced in the shared helpers, not the DB).
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
    // Visitor pool: isVisitor slots are auto-assigned first-come to a visitor
    // entry on check-in and released on check-out.
    isVisitor: boolean('is_visitor').notNull().default(false),
    occupiedByEntryId: uuid('occupied_by_entry_id').references(() => visitorEntries.id),
    occupiedAt: timestamp('occupied_at'),
    notes: text('notes'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [
    unique('parking_slots_slot_number_unq').on(t.slotNumber),
    index('parking_slots_apartment_id_idx').on(t.apartmentId),
    index('parking_slots_is_visitor_idx').on(t.isVisitor),
  ],
)
