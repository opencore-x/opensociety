import { describe, it, expect } from 'vitest'
import { collectionRatePct, collectionReportToCsv } from '@opensociety/shared'

describe('collectionRatePct', () => {
  it('computes a one-decimal percentage', () => {
    expect(collectionRatePct(100000, 75000)).toBe(75)
    expect(collectionRatePct(300000, 100000)).toBe(33.3)
  })
  it('is 0 when nothing is billed', () => {
    expect(collectionRatePct(0, 0)).toBe(0)
  })
  it('can exceed 100 on overpayment', () => {
    expect(collectionRatePct(1000, 1200)).toBe(120)
  })
})

describe('collectionReportToCsv', () => {
  it('emits a header + rupee rows with collection %', () => {
    const csv = collectionReportToCsv([
      { period: '2026-07', billed: 1144000, collected: 572000 },
      { period: '2026-08', billed: 708000, collected: 0 },
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('Period,Billed,Collected,Collection %')
    expect(lines[1]).toBe('2026-07,11440.00,5720.00,50')
    expect(lines[2]).toBe('2026-08,7080.00,0.00,0')
  })
})
