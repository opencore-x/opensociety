import { describe, it, expect } from 'vitest'
import { allocatePayment } from '@opensociety/shared'

const bills = [
  { billId: 'a', outstanding: 1000 },
  { billId: 'b', outstanding: 500 },
  { billId: 'c', outstanding: 2000 },
]

describe('allocatePayment (FIFO)', () => {
  it('fills the oldest bill first, then the next', () => {
    expect(allocatePayment(1200, bills)).toEqual({
      allocations: [
        { billId: 'a', amount: 1000 },
        { billId: 'b', amount: 200 },
      ],
      applied: 1200,
      leftoverCredit: 0,
    })
  })

  it('exactly clears bills with no leftover', () => {
    expect(allocatePayment(1500, bills)).toEqual({
      allocations: [
        { billId: 'a', amount: 1000 },
        { billId: 'b', amount: 500 },
      ],
      applied: 1500,
      leftoverCredit: 0,
    })
  })

  it('returns leftover credit on overpayment', () => {
    const r = allocatePayment(4000, bills)
    expect(r.allocations).toEqual([
      { billId: 'a', amount: 1000 },
      { billId: 'b', amount: 500 },
      { billId: 'c', amount: 2000 },
    ])
    expect(r.applied).toBe(3500)
    expect(r.leftoverCredit).toBe(500)
  })

  it('partially fills the last reachable bill', () => {
    expect(allocatePayment(1100, bills)).toEqual({
      allocations: [
        { billId: 'a', amount: 1000 },
        { billId: 'b', amount: 100 },
      ],
      applied: 1100,
      leftoverCredit: 0,
    })
  })

  it('skips zero/negative-balance bills', () => {
    const r = allocatePayment(800, [
      { billId: 'x', outstanding: 0 },
      { billId: 'y', outstanding: -50 },
      { billId: 'z', outstanding: 600 },
    ])
    expect(r.allocations).toEqual([{ billId: 'z', amount: 600 }])
    expect(r.leftoverCredit).toBe(200)
  })

  it('handles no bills (all credit) and non-positive amounts', () => {
    expect(allocatePayment(1000, [])).toEqual({ allocations: [], applied: 0, leftoverCredit: 1000 })
    expect(allocatePayment(0, bills)).toEqual({ allocations: [], applied: 0, leftoverCredit: 0 })
    expect(allocatePayment(-500, bills)).toEqual({ allocations: [], applied: 0, leftoverCredit: 0 })
  })
})
