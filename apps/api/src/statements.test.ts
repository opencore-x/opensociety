import { describe, it, expect } from 'vitest'
import {
  trialBalance,
  incomeExpenditure,
  balanceSheet,
  receiptsAndPayments,
  type AccountBalance,
  type CashEntryLine,
} from '@opensociety/shared'

// A tiny but complete, genuinely balanced society ledger (Σdebit = Σcredit),
// from: opening bank 1000 (Cr surplus), a 1000+18% GST bill, its payment, 200 FD
// interest received, and a 200 security expense.
const balances: AccountBalance[] = [
  { code: '1001', name: 'Bank — Primary', type: 'ASSET', isMutual: null, debit: 238000, credit: 20000 },
  { code: '1100', name: 'Member Dues Receivable', type: 'ASSET', isMutual: null, debit: 118000, credit: 118000 },
  { code: '2200', name: 'GST Output Payable', type: 'LIABILITY', isMutual: null, debit: 0, credit: 18000 },
  { code: '3300', name: 'Accumulated Surplus', type: 'FUND', isMutual: null, debit: 0, credit: 100000 },
  { code: '4000', name: 'Maintenance Income', type: 'INCOME', isMutual: true, debit: 0, credit: 100000 },
  { code: '4800', name: 'Interest on FD', type: 'INCOME', isMutual: false, debit: 0, credit: 20000 },
  { code: '5010', name: 'Security', type: 'EXPENSE', isMutual: null, debit: 20000, credit: 0 },
]

describe('trialBalance', () => {
  it('nets to zero (debits == credits)', () => {
    const tb = trialBalance(balances)
    expect(tb.balanced).toBe(true)
    expect(tb.totalDebit).toBe(tb.totalCredit)
  })
  it('omits zero-balance accounts and picks the right column', () => {
    const tb = trialBalance(balances)
    const income = tb.rows.find((r) => r.code === '4000')
    expect(income).toMatchObject({ debit: 0, credit: 100000 }) // credit-normal
    const bank = tb.rows.find((r) => r.code === '1001')
    expect(bank).toMatchObject({ debit: 218000, credit: 0 }) // debit-normal net
  })
})

describe('incomeExpenditure', () => {
  it('computes surplus and the mutual/taxable split', () => {
    const ie = incomeExpenditure(balances)
    expect(ie.totalIncome).toBe(120000)
    expect(ie.totalExpense).toBe(20000)
    expect(ie.surplus).toBe(100000)
    expect(ie.mutualIncome).toBe(100000)
    expect(ie.nonMutualIncome).toBe(20000) // FD interest is taxable
  })
})

describe('balanceSheet', () => {
  it('balances assets against liabilities + funds + current surplus', () => {
    const surplus = incomeExpenditure(balances).surplus
    const bs = balanceSheet(balances, surplus)
    expect(bs.balanced).toBe(true)
    expect(bs.totalAssets).toBe(bs.totalLiabilitiesAndFunds)
    // assets: bank 218000 (receivable nets to 0, omitted)
    expect(bs.totalAssets).toBe(218000)
  })
})

describe('receiptsAndPayments', () => {
  const lines: CashEntryLine[] = [
    // Receipt: member payment 100000 into bank
    { entryId: 'e1', accountCode: '1001', accountName: 'Bank', isCashBank: true, debit: 100000, credit: 0 },
    { entryId: 'e1', accountCode: '1100', accountName: 'Member Dues Receivable', isCashBank: false, debit: 0, credit: 100000 },
    // Payment: security expense 20000 out of bank
    { entryId: 'e2', accountCode: '1001', accountName: 'Bank', isCashBank: true, debit: 0, credit: 20000 },
    { entryId: 'e2', accountCode: '5010', accountName: 'Security', isCashBank: false, debit: 20000, credit: 0 },
  ]

  it('separates receipts from payments by cash direction', () => {
    const rp = receiptsAndPayments(lines, 5000)
    expect(rp.totalReceipts).toBe(100000)
    expect(rp.totalPayments).toBe(20000)
    expect(rp.receipts[0]).toMatchObject({ code: '1100', amount: 100000 })
    expect(rp.payments[0]).toMatchObject({ code: '5010', amount: 20000 })
    expect(rp.closingBalance).toBe(5000 + 100000 - 20000)
  })

  it('is empty-safe', () => {
    expect(receiptsAndPayments([], 0)).toMatchObject({ totalReceipts: 0, totalPayments: 0, closingBalance: 0 })
  })
})
