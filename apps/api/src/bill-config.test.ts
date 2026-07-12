import { describe, it, expect } from 'vitest'
import { periodMonthOf, dueDateForPeriod } from '@opensociety/shared'

describe('periodMonthOf', () => {
  it('formats a date as YYYY-MM (UTC, zero-padded)', () => {
    expect(periodMonthOf(new Date('2026-07-01T00:00:00Z'))).toBe('2026-07')
    expect(periodMonthOf(new Date('2026-01-15T23:59:00Z'))).toBe('2026-01')
    expect(periodMonthOf(new Date('2026-12-31T12:00:00Z'))).toBe('2026-12')
  })
})

describe('dueDateForPeriod', () => {
  it('builds the due date at the given day of the billing month', () => {
    expect(dueDateForPeriod('2026-07', 10)).toBe('2026-07-10T00:00:00.000Z')
    expect(dueDateForPeriod('2026-02', 15)).toBe('2026-02-15T00:00:00.000Z')
  })
  it('clamps the day to 1..28 so it is valid in every month', () => {
    expect(dueDateForPeriod('2026-02', 31)).toBe('2026-02-28T00:00:00.000Z')
    expect(dueDateForPeriod('2026-02', 0)).toBe('2026-02-01T00:00:00.000Z')
  })
})
