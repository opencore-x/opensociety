import { describe, it, expect } from 'vitest'
import { computeInterest, sumApartmentInterest } from '@opensociety/shared'

const day = (y: number, m: number, d: number) => Date.UTC(y, m - 1, d)

describe('computeInterest — simple interest on arrears', () => {
  it('is zero on the due date (no elapsed days)', () => {
    expect(computeInterest(100000, day(2026, 1, 1), day(2026, 1, 1), 12, 0)).toBe(0)
  })

  it('accrues a full year at the annual rate', () => {
    // ₹1000 @ 12% for 365 days = ₹120 = 12000 paise
    expect(computeInterest(100000, day(2026, 1, 1), day(2027, 1, 1), 12, 0)).toBe(12000)
  })

  it('accrues pro-rata for part of a year', () => {
    // 30 days: round(100000*12*30/36500) = 986
    expect(computeInterest(100000, day(2026, 1, 1), day(2026, 1, 31), 12, 0)).toBe(986)
  })

  it('respects the grace period', () => {
    // 9 days elapsed, 15-day grace -> still 0
    expect(computeInterest(100000, day(2026, 1, 1), day(2026, 1, 10), 12, 15)).toBe(0)
    // 20 days elapsed, 15-day grace -> 5 chargeable days
    expect(computeInterest(100000, day(2026, 1, 1), day(2026, 1, 21), 12, 15)).toBe(
      Math.round((100000 * 12 * 5) / 36500),
    )
  })

  it('is zero for a cleared balance or a disabled rate', () => {
    expect(computeInterest(0, day(2026, 1, 1), day(2027, 1, 1), 12, 0)).toBe(0)
    expect(computeInterest(100000, day(2026, 1, 1), day(2027, 1, 1), 0, 0)).toBe(0)
    expect(computeInterest(-5000, day(2026, 1, 1), day(2027, 1, 1), 12, 0)).toBe(0)
  })
})

describe('sumApartmentInterest', () => {
  it('sums interest across a flat’s overdue bills', () => {
    const asOf = day(2027, 1, 1)
    const bills = [
      { outstanding: 100000, dueDateMs: day(2026, 1, 1) }, // full year -> 12000
      { outstanding: 50000, dueDateMs: day(2026, 7, 1) }, // ~184 days
    ]
    const expected =
      computeInterest(100000, day(2026, 1, 1), asOf, 12, 0) + computeInterest(50000, day(2026, 7, 1), asOf, 12, 0)
    expect(sumApartmentInterest(bills, asOf, 12, 0)).toBe(expected)
    expect(sumApartmentInterest(bills, asOf, 12, 0)).toBeGreaterThan(12000)
  })
})
