import { describe, it, expect } from 'vitest'
import { computeTds, postExpense, postExpenseSettlement, isBalanced, sumDebits } from '@opensociety/shared'

const ACC = { bank: 'bank', cash: 'cash', tdsPayable: 'tds', vendorPayables: 'vp' }

describe('computeTds', () => {
  it('rounds base * rate%', () => {
    expect(computeTds(100000, 2)).toBe(2000)
    expect(computeTds(100000, 10)).toBe(10000)
    expect(computeTds(333, 10)).toBe(33) // round(33.3)
  })
  it('is zero for a non-positive base or rate', () => {
    expect(computeTds(0, 10)).toBe(0)
    expect(computeTds(100000, 0)).toBe(0)
    expect(computeTds(-500, 10)).toBe(0)
  })
})

describe('postExpense (§6.5/§6.6)', () => {
  const base = {
    expenseId: 'e1',
    expenseAccountId: 'exp',
    entryDate: '2026-07-10',
    period: '2026-07',
    accounts: ACC,
  }

  it('PAID, no GST/TDS: debits expense, credits bank', () => {
    const d = postExpense({ ...base, status: 'PAID', method: 'BANK_TRANSFER', amount: 100000, taxAmount: 0, tds: 0 })
    expect(d.sourceType).toBe('EXPENSE')
    expect(isBalanced(d.lines)).toBe(true)
    expect(d.lines.find((l) => l.accountId === 'exp')).toMatchObject({ debit: 100000 })
    expect(d.lines.find((l) => l.accountId === 'bank')).toMatchObject({ credit: 100000 })
  })

  it('PAID with CASH credits cash', () => {
    const d = postExpense({ ...base, status: 'PAID', method: 'CASH', amount: 5000, taxAmount: 0, tds: 0 })
    expect(d.lines.find((l) => l.accountId === 'cash')).toMatchObject({ credit: 5000 })
    expect(d.lines.find((l) => l.accountId === 'bank')).toBeUndefined()
  })

  it('PAID with TDS splits bank vs TDS payable', () => {
    const d = postExpense({ ...base, status: 'PAID', method: 'BANK_TRANSFER', amount: 100000, taxAmount: 0, tds: 2000 })
    expect(isBalanced(d.lines)).toBe(true)
    expect(d.lines.find((l) => l.accountId === 'exp')).toMatchObject({ debit: 100000 })
    expect(d.lines.find((l) => l.accountId === 'bank')).toMatchObject({ credit: 98000 })
    expect(d.lines.find((l) => l.accountId === 'tds')).toMatchObject({ credit: 2000 })
  })

  it('books GST as cost (gross) when ITC is deferred', () => {
    const d = postExpense({ ...base, status: 'PAID', method: 'UPI', amount: 100000, taxAmount: 18000, tds: 0 })
    expect(sumDebits(d.lines)).toBe(118000)
    expect(d.lines.find((l) => l.accountId === 'exp')).toMatchObject({ debit: 118000 })
  })

  it('PAYABLE credits Vendor Payables (with vendor dim) and stays balanced', () => {
    const d = postExpense({ ...base, status: 'PAYABLE', vendorId: 'v1', amount: 100000, taxAmount: 0, tds: 2000 })
    expect(isBalanced(d.lines)).toBe(true)
    expect(d.lines.find((l) => l.accountId === 'vp')).toMatchObject({ credit: 98000, vendorId: 'v1' })
    expect(d.lines.find((l) => l.accountId === 'tds')).toMatchObject({ credit: 2000 })
    expect(d.lines.find((l) => l.accountId === 'bank')).toBeUndefined()
  })
})

describe('postExpenseSettlement (§6.6 settle)', () => {
  it('clears Vendor Payables against bank for the net', () => {
    const d = postExpenseSettlement({
      expenseId: 'e1',
      vendorId: 'v1',
      method: 'BANK_TRANSFER',
      net: 98000,
      entryDate: '2026-07-20',
      period: '2026-07',
      accounts: { bank: 'bank', cash: 'cash', vendorPayables: 'vp' },
    })
    expect(d.sourceType).toBe('MANUAL')
    expect(isBalanced(d.lines)).toBe(true)
    expect(d.lines.find((l) => l.accountId === 'vp')).toMatchObject({ debit: 98000, vendorId: 'v1' })
    expect(d.lines.find((l) => l.accountId === 'bank')).toMatchObject({ credit: 98000 })
  })
})
