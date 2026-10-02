import type { Database } from '@opensociety/db'
import { accounts, journalEntries, journalLines, maintenanceBills, billLineItems, payments } from '@opensociety/db'
import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm'
import {
  ACCOUNT_CODES,
  postBillIssued as buildBillEntry,
  postPaymentReceived as buildPaymentEntry,
  postExpense as buildExpenseEntry,
  postExpenseSettlement as buildSettlementEntry,
  reverseLines,
  splitReceivableAdvance,
  validateEntryLines,
  type JournalDraft,
  type JournalLineInput,
  type BillPostingLine,
  type PaymentMethod,
  type ExpenseStatus,
} from '@opensociety/shared'

// Auto-posting service (#97, design §6). Turns bill/payment writes into balanced
// journal entries. Posting is best-effort and idempotent: it never blocks the
// underlying finance write, and re-processing an event is a no-op (unique index
// on (source_type, source_id)). If the chart of accounts hasn't been initialized
// yet, posting is skipped until an admin runs POST /ledger/init.

function toDateStr(d: Date | string): string {
  return (d instanceof Date ? d.toISOString() : new Date(d).toISOString()).slice(0, 10)
}

// Resolve account code -> id for the requested codes; missing codes are simply
// absent from the returned map.
export async function resolveAccounts(db: Database, codes: string[]): Promise<Map<string, string>> {
  if (codes.length === 0) return new Map()
  const rows = await db.select({ id: accounts.id, code: accounts.code }).from(accounts).where(inArray(accounts.code, codes))
  return new Map(rows.map((r) => [r.code, r.id]))
}

// Persist headers and lines in the same statement. A failed line rolls back
// its header, leaving the business event eligible for a subsequent retry.
export async function insertJournalEntries(db: Database, drafts: JournalDraft[], createdBy?: string): Promise<string[]> {
  if (!drafts.length) return []
  const entries = drafts.map((draft) => {
    const errors = validateEntryLines(draft.lines)
    if (errors.length) throw new Error(`unbalanced journal entry: ${errors.join('; ')}`)
    return {
      id: crypto.randomUUID(), entry_date: draft.entryDate, narration: draft.narration,
      source_type: draft.sourceType, source_id: draft.sourceId ?? null, period: draft.period,
      is_reversal: draft.isReversal ?? false, reverses_id: draft.reversesId ?? null,
      created_by: createdBy ?? null,
    }
  })
  const lines = drafts.flatMap((draft, i) => draft.lines.map((line) => ({
    entry_id: entries[i].id, account_id: line.accountId, debit: line.debit, credit: line.credit,
    apartment_id: line.apartmentId ?? null, vendor_id: line.vendorId ?? null, memo: line.memo ?? null,
  })))
  const result = await db.execute<{ id: string }>(sql`
    with created as (
      insert into journal_entries (id, entry_date, narration, source_type, source_id, period, is_reversal, reverses_id, created_by)
      select id, entry_date, narration, source_type, source_id, period, is_reversal, reverses_id, created_by
      from jsonb_to_recordset(${JSON.stringify(entries)}::jsonb) as entry(
        id uuid, entry_date date, narration text, source_type journal_source, source_id uuid,
        period text, is_reversal boolean, reverses_id uuid, created_by uuid
      ) on conflict (source_type, source_id) where source_type in ('BILL', 'PAYMENT', 'EXPENSE', 'INTEREST') do nothing
      returning id
    ), lines as (
      insert into journal_lines (entry_id, account_id, debit, credit, apartment_id, vendor_id, memo)
      select line.entry_id, line.account_id, line.debit, line.credit, line.apartment_id, line.vendor_id, line.memo
      from jsonb_to_recordset(${JSON.stringify(lines)}::jsonb) as line(
        entry_id uuid, account_id uuid, debit integer, credit integer, apartment_id uuid, vendor_id uuid, memo text
      ) join created on created.id = line.entry_id
    ) select id from created
  `)
  return result.rows.map((row) => row.id)
}

export async function insertJournalEntry(db: Database, draft: JournalDraft, createdBy?: string): Promise<string | null> {
  return (await insertJournalEntries(db, [draft], createdBy))[0] ?? null
}

// §6.1 — post the "bill issued" entry for a freshly created bill. Each line
// credits its mapped income/fund head (default: Maintenance Income); GST goes to
// GST Output Payable; the gross total debits Member Dues Receivable.
export async function postBill(db: Database, billId: string, createdBy?: string): Promise<string | null> {
  const [bill] = await db
    .select({
      id: maintenanceBills.id,
      apartmentId: maintenanceBills.apartmentId,
      issuedAt: maintenanceBills.issuedAt,
      periodMonth: maintenanceBills.periodMonth,
      status: maintenanceBills.status,
    })
    .from(maintenanceBills)
    .where(eq(maintenanceBills.id, billId))
    .limit(1)
  if (!bill || bill.status === 'CANCELLED') return null

  const lines = await db
    .select({ amount: billLineItems.amount, taxAmount: billLineItems.taxAmount, accountId: billLineItems.accountId })
    .from(billLineItems)
    .where(eq(billLineItems.billId, billId))
  if (lines.length === 0) return null

  const acc = await resolveAccounts(db, [
    ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE,
    ACCOUNT_CODES.GST_OUTPUT_PAYABLE,
    ACCOUNT_CODES.MAINTENANCE_INCOME,
  ])
  const receivable = acc.get(ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE)
  const gst = acc.get(ACCOUNT_CODES.GST_OUTPUT_PAYABLE)
  const defaultIncome = acc.get(ACCOUNT_CODES.MAINTENANCE_INCOME)
  if (!receivable || !gst || !defaultIncome) return null // ledger not initialized

  const postingLines: BillPostingLine[] = lines.map((l) => ({
    accountId: l.accountId ?? defaultIncome,
    net: l.amount,
    tax: l.taxAmount,
  }))
  const entryDate = toDateStr(bill.issuedAt)
  const draft = buildBillEntry({
    billId: bill.id,
    apartmentId: bill.apartmentId,
    entryDate,
    period: bill.periodMonth ?? entryDate.slice(0, 7),
    lines: postingLines,
    accounts: { memberDuesReceivable: receivable, gstOutputPayable: gst },
    narration: 'Maintenance bill issued',
  })
  return insertJournalEntry(db, draft, createdBy)
}

// Fetch a month's unposted bills once, then persist bounded batches. Re-running
// also repairs bills whose earlier posting failed after generation committed.
export async function postMonthlyBills(db: Database, period: string, createdBy?: string): Promise<number> {
  const acc = await resolveAccounts(db, [ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE, ACCOUNT_CODES.GST_OUTPUT_PAYABLE, ACCOUNT_CODES.MAINTENANCE_INCOME])
  const receivable = acc.get(ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE)
  const gst = acc.get(ACCOUNT_CODES.GST_OUTPUT_PAYABLE)
  const income = acc.get(ACCOUNT_CODES.MAINTENANCE_INCOME)
  if (!receivable || !gst || !income) return 0
  const rows = await db.select({
    billId: maintenanceBills.id, apartmentId: maintenanceBills.apartmentId, issuedAt: maintenanceBills.issuedAt,
    amount: billLineItems.amount, tax: billLineItems.taxAmount, accountId: billLineItems.accountId,
  }).from(maintenanceBills)
    .innerJoin(billLineItems, eq(billLineItems.billId, maintenanceBills.id))
    .leftJoin(journalEntries, and(eq(journalEntries.sourceType, 'BILL'), eq(journalEntries.sourceId, maintenanceBills.id)))
    .where(and(eq(maintenanceBills.type, 'MONTHLY'), eq(maintenanceBills.periodMonth, period), ne(maintenanceBills.status, 'CANCELLED'), isNull(journalEntries.id)))
  const groups = new Map<string, { apartmentId: string; entryDate: string; lines: BillPostingLine[] }>()
  for (const row of rows) {
    const group = groups.get(row.billId) ?? { apartmentId: row.apartmentId, entryDate: toDateStr(row.issuedAt), lines: [] }
    group.lines.push({ accountId: row.accountId ?? income, net: row.amount, tax: row.tax })
    groups.set(row.billId, group)
  }
  const drafts = [...groups].map(([billId, bill]) => buildBillEntry({
    ...bill, billId, period, accounts: { memberDuesReceivable: receivable, gstOutputPayable: gst }, narration: 'Maintenance bill issued',
  }))
  let posted = 0
  for (let i = 0; i < drafts.length; i += 100) posted += (await insertJournalEntries(db, drafts.slice(i, i + 100), createdBy)).length
  return posted
}

export async function safePostMonthlyBills(db: Database, period: string, createdBy?: string): Promise<void> {
  try { await postMonthlyBills(db, period, createdBy) }
  catch { console.error('ledger: failed to post monthly bills', period) }
}

// §6.2 — post the "payment received" entry. Debits Bank/Cash; credits Member
// Dues Receivable for the portion that clears dues and Member Advances for any
// overpayment (computed from the apartment's dues just before this payment).
export async function postPayment(db: Database, paymentId: string, createdBy?: string): Promise<string | null> {
  const [pay] = await db
    .select({
      id: payments.id,
      apartmentId: payments.apartmentId,
      amount: payments.amount,
      method: payments.method,
      paidAt: payments.paidAt,
    })
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1)
  if (!pay) return null

  const acc = await resolveAccounts(db, [
    ACCOUNT_CODES.BANK_PRIMARY,
    ACCOUNT_CODES.CASH,
    ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE,
    ACCOUNT_CODES.MEMBER_ADVANCES,
  ])
  const bank = acc.get(ACCOUNT_CODES.BANK_PRIMARY)
  const cash = acc.get(ACCOUNT_CODES.CASH)
  const receivable = acc.get(ACCOUNT_CODES.MEMBER_DUES_RECEIVABLE)
  const advances = acc.get(ACCOUNT_CODES.MEMBER_ADVANCES)
  if (!bank || !cash || !receivable || !advances) return null // ledger not initialized

  // Apartment dues immediately before this payment = billed − (paid − thisAmount).
  const [{ billed }] = await db
    .select({ billed: sql<number>`coalesce(sum(${maintenanceBills.totalAmount}), 0)` })
    .from(maintenanceBills)
    .where(and(eq(maintenanceBills.apartmentId, pay.apartmentId), ne(maintenanceBills.status, 'CANCELLED')))
  const [{ paid }] = await db
    .select({ paid: sql<number>`coalesce(sum(${payments.amount}), 0)` })
    .from(payments)
    .where(eq(payments.apartmentId, pay.apartmentId))
  const outstandingBefore = Number(billed) - (Number(paid) - pay.amount)
  const { applied, advance } = splitReceivableAdvance(pay.amount, outstandingBefore)

  const entryDate = toDateStr(pay.paidAt)
  const draft = buildPaymentEntry({
    paymentId: pay.id,
    apartmentId: pay.apartmentId,
    method: pay.method,
    amount: pay.amount,
    applied,
    leftoverCredit: advance,
    entryDate,
    period: entryDate.slice(0, 7),
    accounts: { bank, cash, memberDuesReceivable: receivable, memberAdvances: advances },
    narration: 'Payment received',
  })
  return insertJournalEntry(db, draft, createdBy)
}

// §6.5/§6.6 — post an expense's booking entry (best-effort, idempotent). `tds`
// is the withheld amount (0 if none). No-op until the ledger is initialized.
export async function safePostExpense(
  db: Database,
  e: {
    id: string
    status: ExpenseStatus
    method: PaymentMethod | null
    vendorId: string | null
    accountId: string
    amount: number
    taxAmount: number
    createdAt: Date | string
  },
  tds: number,
  createdBy?: string,
): Promise<void> {
  try {
    const acc = await resolveAccounts(db, [
      ACCOUNT_CODES.BANK_PRIMARY,
      ACCOUNT_CODES.CASH,
      ACCOUNT_CODES.TDS_PAYABLE,
      ACCOUNT_CODES.VENDOR_PAYABLES,
    ])
    const bank = acc.get(ACCOUNT_CODES.BANK_PRIMARY)
    const cash = acc.get(ACCOUNT_CODES.CASH)
    const tdsPayable = acc.get(ACCOUNT_CODES.TDS_PAYABLE)
    const vendorPayables = acc.get(ACCOUNT_CODES.VENDOR_PAYABLES)
    if (!bank || !cash || !tdsPayable || !vendorPayables) return // ledger not initialized

    const entryDate = toDateStr(e.createdAt)
    const draft = buildExpenseEntry({
      expenseId: e.id,
      status: e.status,
      method: e.method,
      vendorId: e.vendorId,
      expenseAccountId: e.accountId,
      amount: e.amount,
      taxAmount: e.taxAmount,
      tds,
      entryDate,
      period: entryDate.slice(0, 7),
      accounts: { bank, cash, tdsPayable, vendorPayables },
    })
    await insertJournalEntry(db, draft, createdBy)
  } catch (err) {
    console.error('ledger: failed to post expense', e.id, err)
  }
}

// §6.6 (settle) — post the payment that clears a vendor payable (best-effort).
export async function safeSettleExpense(
  db: Database,
  e: { id: string; vendorId: string | null; method: PaymentMethod; net: number; paidAt: Date | string },
  createdBy?: string,
): Promise<void> {
  try {
    if (e.net <= 0) return
    const acc = await resolveAccounts(db, [ACCOUNT_CODES.BANK_PRIMARY, ACCOUNT_CODES.CASH, ACCOUNT_CODES.VENDOR_PAYABLES])
    const bank = acc.get(ACCOUNT_CODES.BANK_PRIMARY)
    const cash = acc.get(ACCOUNT_CODES.CASH)
    const vendorPayables = acc.get(ACCOUNT_CODES.VENDOR_PAYABLES)
    if (!bank || !cash || !vendorPayables) return

    const entryDate = toDateStr(e.paidAt)
    const draft = buildSettlementEntry({
      expenseId: e.id,
      vendorId: e.vendorId,
      method: e.method,
      net: e.net,
      entryDate,
      period: entryDate.slice(0, 7),
      accounts: { bank, cash, vendorPayables },
    })
    await insertJournalEntry(db, draft, createdBy)
  } catch (err) {
    console.error('ledger: failed to settle expense', e.id, err)
  }
}

// §6.9 — reverse the "bill issued" entry when a bill is cancelled. Posts an
// ADJUSTMENT with swapped debit/credit that references the original entry. No-op
// if the bill was never posted or is already reversed (best-effort).
export async function safeReverseBill(db: Database, billId: string, createdBy?: string): Promise<void> {
  try {
    const [orig] = await db
      .select({ id: journalEntries.id, entryDate: journalEntries.entryDate, period: journalEntries.period })
      .from(journalEntries)
      .where(and(eq(journalEntries.sourceType, 'BILL'), eq(journalEntries.sourceId, billId)))
      .limit(1)
    if (!orig) return
    const [{ already }] = await db
      .select({ already: sql<number>`count(*)::int` })
      .from(journalEntries)
      .where(eq(journalEntries.reversesId, orig.id))
    if (Number(already) > 0) return // already reversed

    const lines = await db
      .select({ accountId: journalLines.accountId, debit: journalLines.debit, credit: journalLines.credit, apartmentId: journalLines.apartmentId })
      .from(journalLines)
      .where(eq(journalLines.entryId, orig.id))
    if (lines.length === 0) return

    const reversed: JournalLineInput[] = reverseLines(
      lines.map((l) => ({ accountId: l.accountId, debit: l.debit, credit: l.credit, apartmentId: l.apartmentId })),
    )
    await insertJournalEntry(
      db,
      {
        entryDate: orig.entryDate,
        narration: 'Bill cancelled — reversal',
        sourceType: 'ADJUSTMENT',
        sourceId: billId,
        period: orig.period,
        isReversal: true,
        reversesId: orig.id,
        lines: reversed,
      },
      createdBy,
    )
  } catch (e) {
    console.error('ledger: failed to reverse bill', billId, e)
  }
}

// Best-effort wrappers: log and swallow so a ledger hiccup never fails the
// underlying bill/payment write.
export async function safePostBill(db: Database, billId: string, createdBy?: string): Promise<void> {
  try {
    await postBill(db, billId, createdBy)
  } catch (e) {
    console.error('ledger: failed to post bill', billId, e)
  }
}

export async function safePostPayment(db: Database, paymentId: string, createdBy?: string): Promise<void> {
  try {
    await postPayment(db, paymentId, createdBy)
  } catch (e) {
    console.error('ledger: failed to post payment', paymentId, e)
  }
}
