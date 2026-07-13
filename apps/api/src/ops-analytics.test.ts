import { describe, it, expect } from 'vitest'
import { resolutionHours, avgResolutionHours, dayOfWeekLabel, fillDaysOfWeek } from '@opensociety/shared'

const HOUR = 3_600_000

describe('resolutionHours', () => {
  it('returns hours between create and resolve (1 decimal)', () => {
    expect(resolutionHours(0, 3 * HOUR)).toBe(3)
    expect(resolutionHours(0, 90 * 60 * 1000)).toBe(1.5)
  })
  it('floors negatives at 0', () => {
    expect(resolutionHours(5 * HOUR, 2 * HOUR)).toBe(0)
  })
})

describe('avgResolutionHours', () => {
  it('averages over resolved tickets only', () => {
    expect(
      avgResolutionHours([
        { createdMs: 0, resolvedMs: 2 * HOUR },
        { createdMs: 0, resolvedMs: 4 * HOUR },
        { createdMs: 0, resolvedMs: null }, // ignored
      ]),
    ).toBe(3)
  })
  it('is null when nothing is resolved', () => {
    expect(avgResolutionHours([{ createdMs: 0, resolvedMs: null }])).toBeNull()
    expect(avgResolutionHours([])).toBeNull()
  })
})

describe('dayOfWeekLabel', () => {
  it('maps 0=Sun .. 6=Sat', () => {
    expect(dayOfWeekLabel(0)).toBe('Sun')
    expect(dayOfWeekLabel(1)).toBe('Mon')
    expect(dayOfWeekLabel(6)).toBe('Sat')
  })
})

describe('fillDaysOfWeek', () => {
  it('zero-fills to 7 days preserving counts', () => {
    const filled = fillDaysOfWeek([{ dow: 1, count: 5 }, { dow: 6, count: 2 }])
    expect(filled).toHaveLength(7)
    expect(filled[1]).toEqual({ dow: 1, count: 5 })
    expect(filled[6]).toEqual({ dow: 6, count: 2 })
    expect(filled[0]).toEqual({ dow: 0, count: 0 })
  })
})
