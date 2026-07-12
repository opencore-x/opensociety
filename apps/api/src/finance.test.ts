import { describe, it, expect } from 'vitest'
import { computeBill, billStatusFor, formatPaise } from '@opensociety/shared'

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
