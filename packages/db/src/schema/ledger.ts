import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  index,
  uniqueIndex,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { apartments } from './apartments'
import { users } from './users'
import { accountType, journalSource } from './enums'

// Double-entry general ledger (#97). All money is integer paise, matching the
// billing tables. The ledger is append-only: corrections are reversing entries
// (see journalEntries.isReversal / reversesId), never row edits or deletes —
// that is what gives an audit trail. Balances and statements are always SUM()
// over journalLines, never cached columns.

// Chart of accounts. `code` is a stable, sortable string ("1100"). Only leaf
// accounts (isGroup = false) accept journal lines; groups are for hierarchy.
// `isMutual` applies to INCOME accounts: true = exempt member income (principle
// of mutuality), false = taxable (FD interest, hoarding rent) — this drives the
// mutual-vs-taxable split the statutory statements (#98) need for ITR-5.
export const accounts = pgTable(
  'accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    type: accountType('type').notNull(),
    parentId: uuid('parent_id').references((): AnyPgColumn => accounts.id),
    isGroup: boolean('is_group').notNull().default(false),
    isMutual: boolean('is_mutual'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [index('accounts_type_idx').on(t.type), index('accounts_parent_id_idx').on(t.parentId)],
)

// One balanced journal entry per business event. entryDate is the accounting
// date (may differ from createdAt); period ('YYYY-MM') is the lockable fiscal
// bucket. sourceType/sourceId link back to the originating bill/payment/expense.
export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryDate: date('entry_date').notNull(),
    narration: text('narration').notNull(),
    sourceType: journalSource('source_type').notNull(),
    sourceId: uuid('source_id'), // soft FK to bill/payment/expense
    period: text('period').notNull(), // 'YYYY-MM' for period locking
    isReversal: boolean('is_reversal').notNull().default(false),
    reversesId: uuid('reverses_id').references((): AnyPgColumn => journalEntries.id),
    createdBy: uuid('created_by').references(() => users.id),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => [
    index('journal_entries_period_idx').on(t.period),
    index('journal_entries_source_type_idx').on(t.sourceType),
    // Idempotency: one auto-posted entry per (source_type, source_id). Manual/
    // opening/adjustment/waiver entries are exempt (they carry a null source_id
    // and are not machine re-processed).
    uniqueIndex('journal_entries_source_uniq')
      .on(t.sourceType, t.sourceId)
      .where(sql`${t.sourceType} in ('BILL', 'PAYMENT', 'EXPENSE', 'INTEREST')`),
  ],
)

// A single debit-or-credit leg of an entry. Invariant per entryId:
// SUM(debit) = SUM(credit), and each line has exactly one of debit/credit > 0.
// apartmentId/vendorId are optional sub-ledger dimensions (member receivable/
// advance, vendor payables).
export const journalLines = pgTable(
  'journal_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entryId: uuid('entry_id')
      .notNull()
      .references(() => journalEntries.id),
    accountId: uuid('account_id')
      .notNull()
      .references(() => accounts.id),
    debit: integer('debit').notNull().default(0), // paise
    credit: integer('credit').notNull().default(0), // paise
    apartmentId: uuid('apartment_id').references(() => apartments.id),
    vendorId: uuid('vendor_id'), // FK to vendors added with #94
    memo: text('memo'),
  },
  (t) => [
    index('journal_lines_entry_id_idx').on(t.entryId),
    index('journal_lines_account_id_idx').on(t.accountId),
    index('journal_lines_apartment_id_idx').on(t.apartmentId),
  ],
)
