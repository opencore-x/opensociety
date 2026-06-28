import { pgTable, uuid, text, integer, timestamp, boolean, unique } from 'drizzle-orm/pg-core'
import { bhkType } from './enums'

// Single-tenant: no society_id — all apartments belong to this instance's society.
export const apartments = pgTable(
  'apartments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tower: text('tower').notNull(),
    apartmentNo: text('apartment_no').notNull(),
    floor: integer('floor'),
    bhkType: bhkType('bhk_type'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => [unique('apartments_tower_apartment_no_unique').on(t.tower, t.apartmentNo)],
)
