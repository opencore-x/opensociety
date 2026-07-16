import { describe, it, expect } from 'vitest'
import {
  ACCOUNT_CODES,
  DEFAULT_CHART_OF_ACCOUNTS,
  validateEntryLines,
  isBalanced,
  trialBalanceTotals,
  sumDebits,
  sumCredits,
  postBillIssued,
  postPaymentReceived,
  type JournalLineInput,
} from '@opensociety/shared'

const balanced: JournalLineInput[] = [
  { accountId: 'a', debit: 1000, credit: 0 },
  { accountId: 'b', debit: 0, credit: 1000 },
]

describe('validateEntryLines / invariant', () => {
  it('accepts a balanced two-line entry', () => {
    expect(validateEntryLines(balanced)).toEqual([])
    expect(isBalanced(balanced)).toBe(true)
  })

  it('rejects unbalanced entries', () => {
    const errs = validateEntryLines([
      { accountId: 'a', debit: 1000, credit: 0 },
      { accountId: 'b', debit: 0, credit: 900 },
    ])
    expect(errs.some((e) => e.includes('unbalanced'))).toBe(true)
    expect(isBalanced([{ accountId: 'a', debit: 1000, credit: 0 }, { accountId: 'b', debit: 0, credit: 900 }])).toBe(false)
  })

  it('rejects a single-line entry', () => {
    expect(validateEntryLines([{ accountId: 'a', debit: 100, credit: 0 }])).toContain('entry needs at least two lines')
  })

  it('rejects a line with both debit and credit, or neither', () => {
    expect(validateEntryLines([
      { accountId: 'a', debit: 100, credit: 100 },
      { accountId: 'b', debit: 0, credit: 0 },
    ]).some((e) => e.includes('exactly one of debit/credit'))).toBe(true)
  })

  it('rejects negative and non-integer amounts', () => {
    expect(validateEntryLines([
      { accountId: 'a', debit: -100, credit: 0 },
      { accountId: 'b', debit: 0, credit: -100 },
    ]).some((e) => e.includes('negative'))).toBe(true)
    expect(validateEntryLines([
      { accountId: 'a', debit: 10.5, credit: 0 },
      { accountId: 'b', debit: 0, credit: 10.5 },
    ]).some((e) => e.includes('integer'))).toBe(true)
  })

  it('rejects a zero-total entry', () => {
    expect(validateEntryLines([
      { accountId: 'a', debit: 0, credit: 0 },
      { accountId: 'b', debit: 0, credit: 0 },
    ])).toContain('entry total must be positive')
  })
})

describe('trialBalanceTotals', () => {
  it('nets to zero for a balanced set', () => {
    const t = trialBalanceTotals(balanced)
    expect(t).toEqual({ totalDebit: 1000, totalCredit: 1000, balanced: true })
  })
})

describe('postBillIssued (§6.1)', () => {
  it('debits receivable for the gross total and credits income + GST', () => {
    const draft = postBillIssued({
      billId: 'bill-1',
      apartmentId: 'apt-1',
      entryDate: '2026-07-01',
      period: '2026-07',
      lines: [{ accountId: 'income', net: 10000, tax: 1800 }],
      accounts: { memberDuesReceivable: 'recv', gstOutputPayable: 'gst' },
    })
    expect(draft.sourceType).toBe('BILL')
    expect(draft.sourceId).toBe('bill-1')
    expect(isBalanced(draft.lines)).toBe(true)
    expect(sumDebits(draft.lines)).toBe(11800)
    const recv = draft.lines.find((l) => l.accountId === 'recv')
    expect(recv).toMatchObject({ debit: 11800, credit: 0, apartmentId: 'apt-1' })
    expect(draft.lines.find((l) => l.accountId === 'income')).toMatchObject({ debit: 0, credit: 10000 })
    expect(draft.lines.find((l) => l.accountId === 'gst')).toMatchObject({ debit: 0, credit: 1800 })
  })

  it('routes fund contributions to their own head, not income, and stays balanced', () => {
    const draft = postBillIssued({
      billId: 'bill-2',
      apartmentId: 'apt-1',
      entryDate: '2026-07-01',
      period: '2026-07',
      lines: [
        { accountId: 'maintenance', net: 5000, tax: 0 },
        { accountId: 'sinking-fund', net: 2000, tax: 0 },
      ],
      accounts: { memberDuesReceivable: 'recv', gstOutputPayable: 'gst' },
    })
    expect(isBalanced(draft.lines)).toBe(true)
    expect(draft.lines.find((l) => l.accountId === 'recv')?.debit).toBe(7000)
    expect(draft.lines.find((l) => l.accountId === 'sinking-fund')).toMatchObject({ credit: 2000 })
    // no GST line when there is no tax
    expect(draft.lines.find((l) => l.accountId === 'gst')).toBeUndefined()
  })

  it('collapses multiple lines to the same head', () => {
    const draft = postBillIssued({
      billId: 'bill-3',
      apartmentId: 'apt-1',
      entryDate: '2026-07-01',
      period: '2026-07',
      lines: [
        { accountId: 'maintenance', net: 3000, tax: 0 },
        { accountId: 'maintenance', net: 2000, tax: 0 },
      ],
      accounts: { memberDuesReceivable: 'recv', gstOutputPayable: 'gst' },
    })
    const maint = draft.lines.filter((l) => l.accountId === 'maintenance')
    expect(maint).toHaveLength(1)
    expect(maint[0].credit).toBe(5000)
    expect(isBalanced(draft.lines)).toBe(true)
  })
})

describe('postPaymentReceived (§6.2)', () => {
  const accounts = { bank: 'bank', cash: 'cash', memberDuesReceivable: 'recv', memberAdvances: 'adv' }

  it('debits bank and credits receivable for a fully-allocated non-cash payment', () => {
    const draft = postPaymentReceived({
      paymentId: 'pay-1',
      apartmentId: 'apt-1',
      method: 'UPI',
      amount: 5000,
      applied: 5000,
      leftoverCredit: 0,
      entryDate: '2026-07-05',
      period: '2026-07',
      accounts,
    })
    expect(isBalanced(draft.lines)).toBe(true)
    expect(draft.lines.find((l) => l.accountId === 'bank')).toMatchObject({ debit: 5000 })
    expect(draft.lines.find((l) => l.accountId === 'recv')).toMatchObject({ credit: 5000, apartmentId: 'apt-1' })
    expect(draft.lines.find((l) => l.accountId === 'adv')).toBeUndefined()
  })

  it('debits cash when method is CASH', () => {
    const draft = postPaymentReceived({
      paymentId: 'pay-2',
      apartmentId: 'apt-1',
      method: 'CASH',
      amount: 3000,
      applied: 3000,
      leftoverCredit: 0,
      entryDate: '2026-07-05',
      period: '2026-07',
      accounts,
    })
    expect(draft.lines.find((l) => l.accountId === 'cash')).toMatchObject({ debit: 3000 })
    expect(draft.lines.find((l) => l.accountId === 'bank')).toBeUndefined()
  })

  it('splits an overpayment into receivable relief and member advance', () => {
    const draft = postPaymentReceived({
      paymentId: 'pay-3',
      apartmentId: 'apt-1',
      method: 'BANK_TRANSFER',
      amount: 6000,
      applied: 5000,
      leftoverCredit: 1000,
      entryDate: '2026-07-05',
      period: '2026-07',
      accounts,
    })
    expect(isBalanced(draft.lines)).toBe(true)
    expect(sumCredits(draft.lines)).toBe(6000)
    expect(draft.lines.find((l) => l.accountId === 'recv')).toMatchObject({ credit: 5000 })
    expect(draft.lines.find((l) => l.accountId === 'adv')).toMatchObject({ credit: 1000, apartmentId: 'apt-1' })
  })
})

describe('DEFAULT_CHART_OF_ACCOUNTS integrity', () => {
  it('has unique, non-empty codes', () => {
    const codes = DEFAULT_CHART_OF_ACCOUNTS.map((a) => a.code)
    expect(new Set(codes).size).toBe(codes.length)
    expect(codes.every((c) => c.length > 0)).toBe(true)
  })

  it('every parentCode resolves to a defined account', () => {
    const codes = new Set(DEFAULT_CHART_OF_ACCOUNTS.map((a) => a.code))
    for (const a of DEFAULT_CHART_OF_ACCOUNTS) {
      if (a.parentCode) expect(codes.has(a.parentCode)).toBe(true)
    }
  })

  it('exposes every posting-critical code in the seeded CoA', () => {
    const codes = new Set(DEFAULT_CHART_OF_ACCOUNTS.map((a) => a.code))
    for (const code of Object.values(ACCOUNT_CODES)) expect(codes.has(code)).toBe(true)
  })

  it('marks taxable income heads is_mutual=false and member income true', () => {
    const byCode = new Map(DEFAULT_CHART_OF_ACCOUNTS.map((a) => [a.code, a]))
    expect(byCode.get('4000')?.isMutual).toBe(true) // maintenance income
    expect(byCode.get('4800')?.isMutual).toBe(false) // FD interest — taxable
    expect(byCode.get('4810')?.isMutual).toBe(false) // hoarding rent — taxable
  })
})
