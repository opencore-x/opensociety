import { describe, it, expect } from 'vitest'
import { buildStatement, type StatementEntryInput } from '@opensociety/shared'

const rows: StatementEntryInput[] = [
  { date: '2026-01-05T00:00:00.000Z', type: 'BILL', description: 'Maintenance Jan', debit: 100000, credit: 0 },
  { date: '2026-01-20T00:00:00.000Z', type: 'PAYMENT', description: 'Payment', debit: 0, credit: 60000 },
  { date: '2026-02-05T00:00:00.000Z', type: 'BILL', description: 'Maintenance Feb', debit: 100000, credit: 0 },
]

describe('buildStatement', () => {
  it('produces a chronological running balance', () => {
    const s = buildStatement(rows)
    expect(s.entries.map((e) => e.balance)).toEqual([100000, 40000, 140000])
    expect(s.opening).toBe(0)
    expect(s.closing).toBe(140000)
    expect(s.totalDebit).toBe(200000)
    expect(s.totalCredit).toBe(60000)
  })

  it('closing reconciles to Σdebit − Σcredit + opening', () => {
    const s = buildStatement(rows, 5000)
    expect(s.closing).toBe(5000 + 200000 - 60000)
    expect(s.entries[0].balance).toBe(5000 + 100000)
  })

  it('sorts out-of-order rows by date', () => {
    const shuffled = [rows[2], rows[0], rows[1]]
    const s = buildStatement(shuffled)
    expect(s.entries.map((e) => e.description)).toEqual(['Maintenance Jan', 'Payment', 'Maintenance Feb'])
  })

  it('is empty-safe', () => {
    expect(buildStatement([], 250)).toMatchObject({ opening: 250, closing: 250, entries: [], totalDebit: 0, totalCredit: 0 })
  })
})
