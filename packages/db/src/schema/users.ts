import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core'
import { userRole, userStatus } from './enums'

// Local mirror of Clerk-authenticated users. clerkId links to the Clerk identity;
// email/phone/name/role are mirrored locally so identity stays portable.
// status gates app access until an admin approves and assigns a residency.
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email').unique(),
  phone: text('phone').unique(),
  name: text('name').notNull(),
  role: userRole('role').notNull().default('RESIDENT'),
  status: userStatus('status').notNull().default('PENDING'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
