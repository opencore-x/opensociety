import { pgTable, uuid, text, timestamp, unique } from 'drizzle-orm/pg-core'
import { guards } from './guards'

// One-device-per-guard binding. A guard has at most one active row (revokedAt
// null); the first device a guard acts from is auto-bound, and other devices are
// rejected until an admin revokes. deviceId is a stable client identifier;
// model is for the admin view. Kept as history so revoked bindings remain.
export const guardDevices = pgTable(
  'guard_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    guardId: uuid('guard_id')
      .notNull()
      .references(() => guards.id),
    deviceId: text('device_id').notNull(),
    model: text('model'),
    boundAt: timestamp('bound_at').defaultNow().notNull(),
    lastActiveAt: timestamp('last_active_at').defaultNow().notNull(),
    revokedAt: timestamp('revoked_at'),
  },
  (t) => [unique('guard_devices_guard_device_unq').on(t.guardId, t.deviceId)],
)
