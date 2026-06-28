import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { guards } from './guards'
import { visitorPreApprovals } from './visitor-pre-approvals'
import { visitorType, visitorStatus } from './enums'

// Core visitor entry/exit workflow + approval state machine (replaces the old flat `visitors`).
// visitorPhone is nullable — deliveries / unknown walk-ins may have no number.
export const visitorEntries = pgTable('visitor_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  preApprovalId: uuid('pre_approval_id').references(() => visitorPreApprovals.id),
  visitorName: text('visitor_name').notNull(),
  visitorPhone: text('visitor_phone'),
  type: visitorType('type').notNull().default('GUEST'),
  status: visitorStatus('status').notNull().default('PENDING'),
  purpose: text('purpose'),
  vehicleNumber: text('vehicle_number'),
  photoUrl: text('photo_url'),
  approvedBy: uuid('approved_by').references(() => users.id),
  deniedReason: text('denied_reason'),
  checkInBy: uuid('check_in_by').references(() => guards.id),
  checkOutBy: uuid('check_out_by').references(() => guards.id),
  checkInAt: timestamp('check_in_at'),
  checkOutAt: timestamp('check_out_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
