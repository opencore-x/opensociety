import { describe, it, expect } from 'vitest'
import {
  tableToCsv,
  trialBalanceTable,
  buildTallyXml,
  tallyParentForType,
  type TrialBalance,
  type TallyVoucher,
} from '@opensociety/shared'

describe('tableToCsv', () => {
  it('serializes rows and escapes commas/quotes/newlines', () => {
    const csv = tableToCsv([
      ['Account', 'Amount'],
      ['Bank', 1234.5],
      ['A, B', 'say "hi"'],
      [null, ''],
    ])
    expect(csv).toBe('Account,Amount\nBank,1234.5\n"A, B","say ""hi"""\n,')
  })
})

describe('trialBalanceTable', () => {
  it('renders header + rows + total in rupees', () => {
    const tb: TrialBalance = {
      rows: [{ code: '1001', name: 'Bank', type: 'ASSET', debit: 218000, credit: 0 }],
      totalDebit: 218000,
      totalCredit: 218000,
      balanced: true,
    }
    const t = trialBalanceTable(tb)
    expect(t.rows[0]).toEqual(['Code', 'Account', 'Type', 'Debit', 'Credit'])
    expect(t.rows[1]).toEqual(['1001', 'Bank', 'ASSET', 2180, 0]) // paise -> rupees
    expect(t.rows[2]).toEqual(['', 'Total', '', 2180, 2180])
  })
})

describe('buildTallyXml', () => {
  const vouchers: TallyVoucher[] = [
    {
      date: '2026-07-05',
      type: 'Receipt',
      narration: 'Payment received',
      entries: [
        { ledger: 'Bank — Primary', debit: 100000, credit: 0 },
        { ledger: 'Member Dues Receivable', debit: 0, credit: 100000 },
      ],
    },
  ]
  const xml = buildTallyXml(vouchers, [{ name: 'Bank — Primary', parent: 'Bank Accounts' }])

  it('emits a Tally import envelope with a Receipt voucher', () => {
    expect(xml).toContain('<TALLYREQUEST>Import Data</TALLYREQUEST>')
    expect(xml).toContain('<VOUCHER VCHTYPE="Receipt" ACTION="Create">')
    expect(xml).toContain('<DATE>20260705</DATE>')
  })

  it('signs debits negative and credits positive (Tally convention)', () => {
    expect(xml).toContain('<ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-1000.00</AMOUNT>')
    expect(xml).toContain('<ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>1000.00</AMOUNT>')
  })

  it('includes ledger masters with a parent group', () => {
    expect(xml).toContain('<LEDGER NAME="Bank — Primary" ACTION="Create">')
    expect(xml).toContain('<PARENT>Bank Accounts</PARENT>')
  })
})

describe('tallyParentForType', () => {
  it('maps account types to Tally groups', () => {
    expect(tallyParentForType('ASSET')).toBe('Current Assets')
    expect(tallyParentForType('INCOME')).toBe('Indirect Incomes')
    expect(tallyParentForType('FUND')).toBe('Capital Account')
  })
})
