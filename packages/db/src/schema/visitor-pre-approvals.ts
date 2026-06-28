import { pgTable, uuid, text, integer, timestamp, boolean } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { preApprovalType } from './enums'

// Resident-created pre-approval. `code` is the shareable token a guard looks up / scans
// at the gate to auto-create an approved visitor_entry without a live approval round-trip.
export const visitorPreApprovals = pgTable('visitor_pre_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  createdBy: uuid('created_by')
    .notNull()
    .references(() => users.id),
  visitorName: text('visitor_name').notNull(),
  visitorPhone: text('visitor_phone'),
  approvalType: preApprovalType('approval_type').notNull().default('ONE_TIME'),
  code: text('code').notNull().unique(),
  validFrom: timestamp('valid_from').defaultNow().notNull(),
  validUntil: timestamp('valid_until'),
  maxUses: integer('max_uses'),
  useCount: integer('use_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
