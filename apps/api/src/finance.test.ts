import { describe, it, expect } from 'vitest'
import {
  computeBill,
  billStatusFor,
  formatPaise,
  payerTimingDays,
  payerBucket,
  analyzePayers,
  towerCollectionToCsv,
} from '@opensociety/shared'

const DAY = 86_400_000

describe('computeBill (GST engine, integer paise)', () => {
  it('applies per-line tax and sums totals', () => {
    const r = computeBill([
      { description: 'Maintenance', amount: 200000, taxRatePct: 18 }, // ₹2000 + 360 tax
      { description: 'Sinking fund', amount: 50000, taxRatePct: 0 }, // ₹500, exempt
    ])
    expect(r.lines[0].taxAmount).toBe(36000)
    expect(r.lines[1].taxAmount).toBe(0)
    expect(r.subtotal).toBe(250000)
    expect(r.taxAmount).toBe(36000)
    expect(r.total).toBe(286000)
  })

  it('rounds tax to the nearest paise', () => {
    // 12345 paise * 18% = 2222.1 → 2222
    expect(computeBill([{ description: 'x', amount: 12345, taxRatePct: 18 }]).taxAmount).toBe(2222)
  })

  it('handles an empty bill as zero', () => {
    expect(computeBill([])).toMatchObject({ subtotal: 0, taxAmount: 0, total: 0 })
  })
})

describe('billStatusFor', () => {
  it('is ISSUED when nothing is paid', () => {
    expect(billStatusFor(1000, 0)).toBe('ISSUED')
  })
  it('is PARTIALLY_PAID for a part payment', () => {
    expect(billStatusFor(1000, 400)).toBe('PARTIALLY_PAID')
  })
  it('is PAID when covered (or overpaid)', () => {
    expect(billStatusFor(1000, 1000)).toBe('PAID')
    expect(billStatusFor(1000, 1200)).toBe('PAID')
  })
})

describe('formatPaise', () => {
  it('formats paise as rupees with Indian grouping', () => {
    expect(formatPaise(286000)).toBe('₹2,860.00')
    expect(formatPaise(150050)).toBe('₹1,500.50')
    expect(formatPaise(0)).toBe('₹0.00')
  })
})

describe('payer timing (#70)', () => {
  const due = 10 * DAY
  it('payerTimingDays: negative early, 0 on-time, positive late', () => {
    expect(payerTimingDays(due, due - 3 * DAY)).toBe(-3)
    expect(payerTimingDays(due, due)).toBe(0)
    expect(payerTimingDays(due, due + 5 * DAY)).toBe(5)
  })

  it('payerBucket classifies by sign', () => {
    expect(payerBucket(-1)).toBe('EARLY')
    expect(payerBucket(0)).toBe('ON_TIME')
    expect(payerBucket(4)).toBe('LATE')
  })

  it('analyzePayers buckets settled bills and averages days', () => {
    const a = analyzePayers([
      { dueDateMs: due, total: 1000, paid: 1000, lastPaidAtMs: due - 2 * DAY }, // early -2
      { dueDateMs: due, total: 1000, paid: 1000, lastPaidAtMs: due }, // on-time 0
      { dueDateMs: due, total: 1000, paid: 1000, lastPaidAtMs: due + 4 * DAY }, // late +4
      { dueDateMs: due, total: 1000, paid: 400, lastPaidAtMs: due }, // partial -> outstanding
      { dueDateMs: due, total: 1000, paid: 0, lastPaidAtMs: null }, // unpaid -> outstanding
    ])
    expect(a).toEqual({ early: 1, onTime: 1, late: 1, outstanding: 2, fullyPaid: 3, avgDaysToPay: 0.7 })
  })

  it('analyzePayers handles no bills', () => {
    expect(analyzePayers([])).toEqual({ early: 0, onTime: 0, late: 0, outstanding: 0, fullyPaid: 0, avgDaysToPay: null })
  })
})

describe('towerCollectionToCsv (#70)', () => {
  it('emits tower rows with a collection %', () => {
    const csv = towerCollectionToCsv([
      { tower: 'A', billed: 100000, collected: 75000 },
      { tower: 'B', billed: 0, collected: 0 },
    ])
    expect(csv.split('\n')).toEqual(['Tower,Billed,Collected,Collection %', 'A,1000.00,750.00,75', 'B,0.00,0.00,0'])
  })
})
