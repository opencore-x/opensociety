import { pgTable, uuid, text, timestamp, boolean, integer } from 'drizzle-orm/pg-core'
import { users } from './users'
import { houseHelpType, idProofType, backgroundCheckStatus } from './enums'

// A domestic worker (maid, cook, driver, ...) registered in the society's
// registry. Assignments to specific apartments live in a separate junction
// table (multi-apartment help is common). photoUrl / idProofUrl are set once
// R2 upload (task #6) lands; until then the registry works without documents.
export const houseHelp = pgTable('house_help', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: text('phone'),
  type: houseHelpType('type').notNull().default('OTHER'),
  photoUrl: text('photo_url'),
  idProofType: idProofType('id_proof_type'),
  idProofNumber: text('id_proof_number'),
  idProofUrl: text('id_proof_url'),
  // Verification & trust signals (#67), set by admins.
  idVerified: boolean('id_verified').notNull().default(false),
  backgroundCheck: backgroundCheckStatus('background_check').notNull().default('PENDING'),
  incidentCount: integer('incident_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  registeredBy: uuid('registered_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
