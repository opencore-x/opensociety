import { pgTable, uuid, text, integer, timestamp, index } from 'drizzle-orm/pg-core'
import { apartments } from './apartments'
import { users } from './users'
import { accounts } from './ledger'
import { billType, billStatus, paymentMethod } from './enums'

// All money is stored as an integer number of paise (₹1 = 100 paise) so
// arithmetic (GST, part-payments, dues) stays exact.

// A maintenance bill for one apartment — monthly recurring or a one-time charge.
// subtotal/taxAmount/totalAmount are denormalized sums of its line items.
export const maintenanceBills = pgTable('maintenance_bills', {
  id: uuid('id').primaryKey().defaultRandom(),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  type: billType('type').notNull().default('MONTHLY'),
  title: text('title').notNull(),
  periodMonth: text('period_month'), // 'YYYY-MM' for recurring; null for one-time
  subtotal: integer('subtotal').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  totalAmount: integer('total_amount').notNull().default(0),
  status: billStatus('status').notNull().default('ISSUED'),
  dueDate: timestamp('due_date'),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (t) => [
  index('maintenance_bills_apartment_id_idx').on(t.apartmentId),
  index('maintenance_bills_period_month_idx').on(t.periodMonth),
])

// A single charge on a bill, with its own GST rate (percent). taxAmount is the
// computed tax in paise; amount is the pre-tax charge.
export const billLineItems = pgTable('bill_line_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id')
    .notNull()
    .references(() => maintenanceBills.id),
  description: text('description').notNull(),
  amount: integer('amount').notNull(),
  taxRatePct: integer('tax_rate_pct').notNull().default(0),
  taxAmount: integer('tax_amount').notNull().default(0),
  // The income/fund account this charge credits when posted to the ledger
  // (#97). Null falls back to the default Maintenance Income head at post time.
  accountId: uuid('account_id').references(() => accounts.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [index('bill_line_items_bill_id_idx').on(t.billId)])

// A payment recorded against a bill (manual entry today; online later). Dues are
// derived as sum(bill totals) − sum(payments) per apartment.
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  billId: uuid('bill_id')
    .notNull()
    .references(() => maintenanceBills.id),
  apartmentId: uuid('apartment_id')
    .notNull()
    .references(() => apartments.id),
  amount: integer('amount').notNull(),
  method: paymentMethod('method').notNull(),
  reference: text('reference'),
  notes: text('notes'),
  paidAt: timestamp('paid_at').defaultNow().notNull(),
  recordedBy: uuid('recorded_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => [
  index('payments_bill_id_idx').on(t.billId),
  index('payments_apartment_id_idx').on(t.apartmentId),
])
