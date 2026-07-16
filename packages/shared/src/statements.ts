import type { AccountType } from './enums'

// Statutory financial statements (#98). All are pure aggregations over the
// ledger — no storage. See design §8. Money is integer paise. Balance Sheet /
// I&E use accrual; Receipts & Payments is cash-basis (bank/cash movements).

// Per-account debit/credit totals (Σ over journal_lines), joined to the account.
export type AccountBalance = {
  code: string
  name: string
  type: AccountType
  isMutual: boolean | null
  debit: number
  credit: number
}

// Net balance in an account's normal direction: debit-normal for ASSET/EXPENSE,
// credit-normal for LIABILITY/INCOME/FUND. Positive = a "normal" balance.
export function normalBalance(b: { type: AccountType; debit: number; credit: number }): number {
  return b.type === 'ASSET' || b.type === 'EXPENSE' ? b.debit - b.credit : b.credit - b.debit
}

// ----- Trial Balance -----

export type TrialBalanceRow = { code: string; name: string; type: AccountType; debit: number; credit: number }
export type TrialBalance = { rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number; balanced: boolean }

// Each account's net lands in its debit or credit column; the two columns must
// be equal (proves ledger integrity). Zero-balance accounts are omitted.
export function trialBalance(balances: AccountBalance[]): TrialBalance {
  const rows: TrialBalanceRow[] = []
  for (const b of balances) {
    const net = b.debit - b.credit
    if (net === 0) continue
    rows.push({ code: b.code, name: b.name, type: b.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 })
  }
  rows.sort((a, b) => a.code.localeCompare(b.code))
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0)
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0)
  return { rows, totalDebit, totalCredit, balanced: totalDebit === totalCredit }
}

// ----- Income & Expenditure (accrual) -----

export type IeRow = { code: string; name: string; amount: number; isMutual?: boolean | null }
export type IncomeExpenditure = {
  income: IeRow[]
  expense: IeRow[]
  totalIncome: number
  totalExpense: number
  surplus: number
  mutualIncome: number
  nonMutualIncome: number
}

// Income (credit-normal) vs expenditure (debit-normal) for the period; surplus =
// income − expense. Income is split mutual (exempt) vs non-mutual (taxable) for
// the ITR-5 view — is_mutual === false is taxable; anything else counts mutual.
export function incomeExpenditure(balances: AccountBalance[]): IncomeExpenditure {
  const income = balances
    .filter((b) => b.type === 'INCOME')
    .map((b) => ({ code: b.code, name: b.name, isMutual: b.isMutual, amount: b.credit - b.debit }))
    .filter((r) => r.amount !== 0)
  const expense = balances
    .filter((b) => b.type === 'EXPENSE')
    .map((b) => ({ code: b.code, name: b.name, amount: b.debit - b.credit }))
    .filter((r) => r.amount !== 0)
  income.sort((a, b) => a.code.localeCompare(b.code))
  expense.sort((a, b) => a.code.localeCompare(b.code))
  const totalIncome = income.reduce((s, r) => s + r.amount, 0)
  const totalExpense = expense.reduce((s, r) => s + r.amount, 0)
  const nonMutualIncome = income.filter((r) => r.isMutual === false).reduce((s, r) => s + r.amount, 0)
  const mutualIncome = totalIncome - nonMutualIncome
  return { income, expense, totalIncome, totalExpense, surplus: totalIncome - totalExpense, mutualIncome, nonMutualIncome }
}

// ----- Balance Sheet (as-of) -----

export type BsRow = { code: string; name: string; amount: number }
export type BalanceSheet = {
  assets: BsRow[]
  liabilities: BsRow[]
  funds: BsRow[]
  totalAssets: number
  totalLiabilities: number
  totalFunds: number
  currentSurplus: number
  totalLiabilitiesAndFunds: number
  balanced: boolean
}

// Assets (debit-normal) vs liabilities + funds + current surplus (credit-normal).
// `currentSurplus` is the I&E surplus up to the same date; with it the sheet
// balances because every entry is balanced (Σdebit = Σcredit).
export function balanceSheet(balances: AccountBalance[], currentSurplus: number): BalanceSheet {
  const pick = (type: AccountType) =>
    balances
      .filter((b) => b.type === type)
      .map((b) => ({ code: b.code, name: b.name, amount: normalBalance(b) }))
      .filter((r) => r.amount !== 0)
      .sort((a, b) => a.code.localeCompare(b.code))
  const assets = pick('ASSET')
  const liabilities = pick('LIABILITY')
  const funds = pick('FUND')
  const totalAssets = assets.reduce((s, r) => s + r.amount, 0)
  const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0)
  const totalFunds = funds.reduce((s, r) => s + r.amount, 0)
  const totalLiabilitiesAndFunds = totalLiabilities + totalFunds + currentSurplus
  return {
    assets,
    liabilities,
    funds,
    totalAssets,
    totalLiabilities,
    totalFunds,
    currentSurplus,
    totalLiabilitiesAndFunds,
    balanced: totalAssets === totalLiabilitiesAndFunds,
  }
}

// ----- Receipts & Payments (cash basis) -----

// A journal line belonging to an entry that touches a cash/bank account, tagged
// so the shaper can separate the cash leg from its contra legs.
export type CashEntryLine = {
  entryId: string
  accountCode: string
  accountName: string
  isCashBank: boolean
  debit: number
  credit: number
}

export type RpRow = { code: string; name: string; amount: number }
export type ReceiptsPayments = {
  openingBalance: number
  receipts: RpRow[]
  payments: RpRow[]
  totalReceipts: number
  totalPayments: number
  closingBalance: number
}

// Group the contra legs of every cash/bank entry into receipts (entries where
// cash rose) and payments (entries where cash fell). `openingBalance` is the
// cash+bank balance carried into the period; closing = opening + receipts −
// payments (equals the as-of cash balance).
export function receiptsAndPayments(lines: CashEntryLine[], openingBalance = 0): ReceiptsPayments {
  const byEntry = new Map<string, CashEntryLine[]>()
  for (const l of lines) {
    const arr = byEntry.get(l.entryId) ?? []
    arr.push(l)
    byEntry.set(l.entryId, arr)
  }

  const receipts = new Map<string, { name: string; amount: number }>()
  const payments = new Map<string, { name: string; amount: number }>()
  const add = (m: Map<string, { name: string; amount: number }>, code: string, name: string, amt: number) => {
    if (amt <= 0) return
    const cur = m.get(code) ?? { name, amount: 0 }
    cur.amount += amt
    m.set(code, cur)
  }

  for (const entryLines of byEntry.values()) {
    const cashDelta = entryLines.filter((l) => l.isCashBank).reduce((s, l) => s + l.debit - l.credit, 0)
    if (cashDelta === 0) continue
    for (const l of entryLines) {
      if (l.isCashBank) continue
      if (cashDelta > 0) add(receipts, l.accountCode, l.accountName, l.credit - l.debit)
      else add(payments, l.accountCode, l.accountName, l.debit - l.credit)
    }
  }

  const toRows = (m: Map<string, { name: string; amount: number }>): RpRow[] =>
    [...m.entries()].map(([code, v]) => ({ code, name: v.name, amount: v.amount })).sort((a, b) => a.code.localeCompare(b.code))
  const receiptRows = toRows(receipts)
  const paymentRows = toRows(payments)
  const totalReceipts = receiptRows.reduce((s, r) => s + r.amount, 0)
  const totalPayments = paymentRows.reduce((s, r) => s + r.amount, 0)
  return {
    openingBalance,
    receipts: receiptRows,
    payments: paymentRows,
    totalReceipts,
    totalPayments,
    closingBalance: openingBalance + totalReceipts - totalPayments,
  }
}
