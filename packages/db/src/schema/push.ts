import { pgTable, uuid, text, timestamp, index, integer, jsonb, uniqueIndex } from 'drizzle-orm/pg-core'
import { users } from './users'

export const pushDevices = pgTable('push_devices', {
  token: text('token').primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (t) => [index('push_devices_user_idx').on(t.userId)])

export const pushDeliveries = pgTable('push_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  token: text('token').notNull().references(() => pushDevices.token, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  eventKey: text('event_key').notNull(),
  message: jsonb('message').notNull().$type<{ title: string; body: string; data: { screen: string } }>(),
  status: text('status').notNull().default('queued').$type<'queued' | 'sending' | 'receipt' | 'delivered' | 'failed'>(),
  ticketId: text('ticket_id'),
  attempts: integer('attempts').notNull().default(0),
  nextAttemptAt: timestamp('next_attempt_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  lastError: text('last_error'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => [
  uniqueIndex('push_deliveries_event_device_idx').on(t.eventKey, t.token),
  index('push_deliveries_pending_idx').on(t.status, t.nextAttemptAt),
])
