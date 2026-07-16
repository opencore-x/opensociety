import { pgTable, uuid, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { users } from './users'
import { accounts } from './ledger'
import { paymentMethod, tdsSection, expenseStatus } from './enums'

// Expense & vendor side of finance (#94). All money is integer paise. Expenses
// post to the ledger against an EXPENSE head (accounts) — see lib/ledger-posting.

// Suppliers/contractors the society pays. PAN/GSTIN drive TDS + GST reporting.
export const vendors = pgTable('vendors', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  category: text('category'),
  pan: text('pan'),
  gstin: text('gstin'),
  contact: text('contact'),
  bankAccount: text('bank_account'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// A recorded expense. `amount` is the base (pre-GST, pre-TDS) value; `taxAmount`
// is input GST (booked as cost — ITC deferred). PAYABLE = booked but unpaid
// (sits in Vendor Payables); PAID = settled from bank/cash.
export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vendorId: uuid('vendor_id').references(() => vendors.id), // null = petty cash
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id), // the EXPENSE head debited
    amount: integer('amount').notNull(), // base paise, before GST/TDS
    taxAmount: integer('tax_amount').notNull().default(0), // input GST
    status: expenseStatus('status').notNull().default('PAID'),
    description: text('description').notNull(),
    billRef: text('bill_ref'),
    method: paymentMethod('method'), // null when PAYABLE
    paidAt: timestamp('paid_at'),
    attachmentUrl: text('attachment_url'),
    recordedBy: uuid('recorded_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('expenses_account_id_idx').on(t.accountId),
    index('expenses_vendor_id_idx').on(t.vendorId),
    index('expenses_created_at_idx').on(t.createdAt),
  ],
)

// TDS withheld on an expense (capture + report only; filing is out of scope).
export const tdsEntries = pgTable(
  'tds_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expenseId: uuid('expense_id')
      .notNull()
      .references(() => expenses.id),
    section: tdsSection('section').notNull(),
    ratePct: integer('rate_pct').notNull(),
    amount: integer('amount').notNull(), // TDS paise
    deductedAt: timestamp('deducted_at').defaultNow().notNull(),
  },
  (t) => [index('tds_entries_expense_id_idx').on(t.expenseId), index('tds_entries_section_idx').on(t.section)],
)
