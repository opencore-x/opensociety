import { z } from 'zod'
import { accountTypeSchema, journalSourceSchema, type AccountType, type PaymentMethod } from './enums'

// Double-entry ledger domain (#97). Pure, DB-free logic: the balanced-entry
// invariant, and the posting map (which accounts each event debits/credits).
// All money is integer paise. See .claude/design/accounting-data-model.md §6.

// ----- Chart of accounts -----

// Stable account codes the posting layer resolves against. Never reuse a code.
export const ACCOUNT_CODES = {
  BANK_PRIMARY: '1001',
  CASH: '1010',
  MEMBER_DUES_RECEIVABLE: '1100',
  MEMBER_ADVANCES: '2000',
  GST_OUTPUT_PAYABLE: '2200',
  MAINTENANCE_INCOME: '4000',
  INTEREST_ON_ARREARS_INCOME: '4100',
  REBATES_WAIVERS: '4900',
} as const

export type CoaSeedAccount = {
  code: string
  name: string
  type: AccountType
  parentCode?: string // hierarchy; resolved to parentId at seed time
  isGroup?: boolean
  isMutual?: boolean // INCOME only: true = mutual/exempt, false = taxable
}

// Default chart of accounts for an Indian co-op housing society (design §7).
// Ordered so every parent precedes its children (seed resolves parentCode).
export const DEFAULT_CHART_OF_ACCOUNTS: CoaSeedAccount[] = [
  // Assets (1xxx)
  { code: '1000', name: 'Bank Accounts', type: 'ASSET', isGroup: true },
  { code: '1001', name: 'Bank — Primary', type: 'ASSET', parentCode: '1000' },
  { code: '1010', name: 'Cash in Hand', type: 'ASSET' },
  { code: '1100', name: 'Member Dues Receivable', type: 'ASSET' },
  { code: '1200', name: 'Fixed Deposits', type: 'ASSET' },
  { code: '1300', name: 'TDS Receivable', type: 'ASSET' },
  { code: '1400', name: 'Fixed Assets', type: 'ASSET' },
  // Liabilities (2xxx)
  { code: '2000', name: 'Member Advances', type: 'LIABILITY' },
  { code: '2100', name: 'Vendor Payables', type: 'LIABILITY' },
  { code: '2200', name: 'GST Output Payable', type: 'LIABILITY' },
  { code: '2300', name: 'TDS Payable', type: 'LIABILITY' },
  { code: '2400', name: 'Security Deposits', type: 'LIABILITY' },
  // Funds (3xxx) — equity-like for a non-profit society
  { code: '3000', name: 'Corpus Fund', type: 'FUND' },
  { code: '3100', name: 'Sinking Fund', type: 'FUND' },
  { code: '3200', name: 'Repairs & Maintenance Fund', type: 'FUND' },
  { code: '3300', name: 'Accumulated Surplus (I&E)', type: 'FUND' },
  // Income (4xxx)
  { code: '4000', name: 'Maintenance Income', type: 'INCOME', isMutual: true },
  { code: '4100', name: 'Interest on Arrears Income', type: 'INCOME', isMutual: true },
  { code: '4200', name: 'Parking Income', type: 'INCOME', isMutual: true },
  { code: '4800', name: 'Interest on FD', type: 'INCOME', isMutual: false },
  { code: '4810', name: 'Tower/Hoarding Rent', type: 'INCOME', isMutual: false },
  { code: '4900', name: 'Rebates & Waivers', type: 'INCOME', isMutual: true }, // contra-income
  // Expenses (5xxx)
  { code: '5000', name: 'Housekeeping', type: 'EXPENSE' },
  { code: '5010', name: 'Security', type: 'EXPENSE' },
  { code: '5020', name: 'Electricity — Common Area', type: 'EXPENSE' },
  { code: '5030', name: 'Water', type: 'EXPENSE' },
  { code: '5040', name: 'Repairs & Maintenance', type: 'EXPENSE' },
  { code: '5050', name: 'Audit Fees', type: 'EXPENSE' },
  { code: '5060', name: 'Bank Charges', type: 'EXPENSE' },
]

// ----- Journal entry drafts (what the posting layer produces) -----

export type JournalLineInput = {
  accountId: string
  debit: number // paise, >= 0
  credit: number // paise, >= 0
  apartmentId?: string | null
  vendorId?: string | null
  memo?: string | null
}

export type JournalDraft = {
  entryDate: string // 'YYYY-MM-DD'
  narration: string
  sourceType: z.infer<typeof journalSourceSchema>
  sourceId?: string | null
  period: string // 'YYYY-MM'
  lines: JournalLineInput[]
}

// ----- Balanced-entry invariant -----

export function sumDebits(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + l.debit, 0)
}

export function sumCredits(lines: JournalLineInput[]): number {
  return lines.reduce((s, l) => s + l.credit, 0)
}

// Validate the double-entry invariants; returns a list of human-readable errors
// (empty = valid). Enforced app-side by the posting service before insert.
export function validateEntryLines(lines: JournalLineInput[]): string[] {
  const errors: string[] = []
  if (lines.length < 2) errors.push('entry needs at least two lines')
  for (const [i, l] of lines.entries()) {
    if (!Number.isInteger(l.debit) || !Number.isInteger(l.credit)) errors.push(`line ${i}: amounts must be integer paise`)
    if (l.debit < 0 || l.credit < 0) errors.push(`line ${i}: amounts cannot be negative`)
    const debited = l.debit > 0
    const credited = l.credit > 0
    if (debited === credited) errors.push(`line ${i}: exactly one of debit/credit must be positive`)
  }
  const dr = sumDebits(lines)
  const cr = sumCredits(lines)
  if (dr !== cr) errors.push(`unbalanced: debits ${dr} != credits ${cr}`)
  if (dr === 0) errors.push('entry total must be positive')
  return errors
}

export function isBalanced(lines: JournalLineInput[]): boolean {
  return validateEntryLines(lines).length === 0
}

// Trial-balance style rollup over any set of lines: proves integrity when
// totalDebit === totalCredit (the whole ledger nets to zero).
export function trialBalanceTotals(lines: JournalLineInput[]): {
  totalDebit: number
  totalCredit: number
  balanced: boolean
} {
  const totalDebit = sumDebits(lines)
  const totalCredit = sumCredits(lines)
  return { totalDebit, totalCredit, balanced: totalDebit === totalCredit }
}

// ----- Posting map (design §6) -----

// §6.1 Bill issued. Debits Member Dues Receivable for the gross total; credits
// each income/fund head for its net, and GST Output Payable for the tax. Heads
// are pre-resolved to accountIds by the caller (bill_line_items.account_id).
export type BillPostingLine = { accountId: string; net: number; tax: number }

export function postBillIssued(input: {
  billId: string
  apartmentId: string
  entryDate: string
  period: string
  lines: BillPostingLine[]
  accounts: { memberDuesReceivable: string; gstOutputPayable: string }
  narration?: string
}): JournalDraft {
  // Group net amounts by head so multiple lines to the same account collapse.
  const netByAccount = new Map<string, number>()
  let tax = 0
  let total = 0
  for (const l of input.lines) {
    netByAccount.set(l.accountId, (netByAccount.get(l.accountId) ?? 0) + l.net)
    tax += l.tax
    total += l.net + l.tax
  }
  const lines: JournalLineInput[] = [
    { accountId: input.accounts.memberDuesReceivable, debit: total, credit: 0, apartmentId: input.apartmentId },
  ]
  for (const [accountId, net] of netByAccount) {
    if (net > 0) lines.push({ accountId, debit: 0, credit: net })
  }
  if (tax > 0) lines.push({ accountId: input.accounts.gstOutputPayable, debit: 0, credit: tax })
  return {
    entryDate: input.entryDate,
    narration: input.narration ?? 'Bill issued',
    sourceType: 'BILL',
    sourceId: input.billId,
    period: input.period,
    lines,
  }
}

// Split a received payment into the portion that relieves outstanding member
// dues vs. the excess that becomes a member advance. `outstandingBefore` is the
// apartment's total dues immediately before this payment (may be <= 0 if the
// member was already in credit — then the whole amount is an advance).
export function splitReceivableAdvance(
  amount: number,
  outstandingBefore: number,
): { applied: number; advance: number } {
  const due = Math.max(0, outstandingBefore)
  const applied = Math.max(0, Math.min(amount, due))
  return { applied, advance: amount - applied }
}

// §6.2 Payment received. Debits Bank (or Cash when method = CASH); credits
// Member Dues Receivable for the allocated portion and Member Advances for any
// unallocated overpayment. `applied + leftoverCredit` must equal `amount`.
export function postPaymentReceived(input: {
  paymentId: string
  apartmentId: string
  method: PaymentMethod
  amount: number
  applied: number
  leftoverCredit: number
  entryDate: string
  period: string
  accounts: { bank: string; cash: string; memberDuesReceivable: string; memberAdvances: string }
  narration?: string
}): JournalDraft {
  const debitAccount = input.method === 'CASH' ? input.accounts.cash : input.accounts.bank
  const lines: JournalLineInput[] = [{ accountId: debitAccount, debit: input.amount, credit: 0 }]
  if (input.applied > 0) {
    lines.push({
      accountId: input.accounts.memberDuesReceivable,
      debit: 0,
      credit: input.applied,
      apartmentId: input.apartmentId,
    })
  }
  if (input.leftoverCredit > 0) {
    lines.push({
      accountId: input.accounts.memberAdvances,
      debit: 0,
      credit: input.leftoverCredit,
      apartmentId: input.apartmentId,
    })
  }
  return {
    entryDate: input.entryDate,
    narration: input.narration ?? 'Payment received',
    sourceType: 'PAYMENT',
    sourceId: input.paymentId,
    period: input.period,
    lines,
  }
}

// ----- Zod schemas (API contracts, used by #97 increment 2 / #98) -----

export const accountSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  parentId: z.string().uuid().nullable(),
  isGroup: z.boolean(),
  isMutual: z.boolean().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

// A manual journal line as submitted by an admin (adjustments, contra, opening).
export const manualJournalLineSchema = z.object({
  accountId: z.string().uuid(),
  debit: z.number().int().nonnegative().default(0),
  credit: z.number().int().nonnegative().default(0),
  apartmentId: z.string().uuid().nullable().optional(),
  memo: z.string().optional(),
})

export const manualJournalEntrySchema = z
  .object({
    entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD'),
    narration: z.string().min(1),
    lines: z.array(manualJournalLineSchema).min(2),
  })
  .refine((e) => isBalanced(e.lines), { message: 'entry must be balanced (sum debits == sum credits)' })

export type Account = z.infer<typeof accountSchema>
export type ManualJournalLine = z.infer<typeof manualJournalLineSchema>
export type ManualJournalEntry = z.infer<typeof manualJournalEntrySchema>
