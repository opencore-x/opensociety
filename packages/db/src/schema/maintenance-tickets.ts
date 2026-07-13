import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { ticketStatus, ticketCategory, ticketPriority } from './enums'

// Maintenance requests raised by a resident for their apartment; an admin
// triages (assigns, works, resolves) through the ticket lifecycle.
export const maintenanceTickets = pgTable('maintenance_tickets', {
  id: uuid('id').primaryKey().defaultRandom(),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  raisedBy: uuid('raised_by')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  category: ticketCategory('category').notNull().default('OTHER'),
  priority: ticketPriority('priority').notNull().default('NORMAL'),
  status: ticketStatus('status').notNull().default('OPEN'),
  assignedTo: uuid('assigned_to').references(() => users.id),
  resolutionNote: text('resolution_note'),
  resolvedAt: timestamp('resolved_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('maintenance_tickets_status_idx').on(t.status),
  index('maintenance_tickets_apartment_id_idx').on(t.apartmentId),
  index('maintenance_tickets_category_idx').on(t.category),
])
