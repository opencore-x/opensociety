import { pgTable, uuid, timestamp, doublePrecision } from 'drizzle-orm/pg-core'
import { guards } from './guards'

// A guard's on-duty shift: clock-in -> clock-out, with optional GPS coordinates
// captured at each end. An open row (clockOutAt null) means the guard is
// currently on duty; hours worked derive from clock_in_at -> clock_out_at.
export const guardDutySessions = pgTable('guard_duty_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  guardId: uuid('guard_id')
    .notNull()
    .references(() => guards.id),
  clockInAt: timestamp('clock_in_at').defaultNow().notNull(),
  clockInLat: doublePrecision('clock_in_lat'),
  clockInLng: doublePrecision('clock_in_lng'),
  clockOutAt: timestamp('clock_out_at'),
  clockOutLat: doublePrecision('clock_out_lat'),
  clockOutLng: doublePrecision('clock_out_lng'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})
