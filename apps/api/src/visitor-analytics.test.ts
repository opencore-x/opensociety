import { describe, it, expect } from 'vitest'
import { fillHours, peakHour, averagePerDay, hourLabel, visitorTrendsToCsv } from '@opensociety/shared'

describe('fillHours', () => {
  it('zero-fills to a full 24-hour histogram preserving counts', () => {
    const filled = fillHours([
      { hour: 9, count: 5 },
      { hour: 18, count: 3 },
    ])
    expect(filled).toHaveLength(24)
    expect(filled[0]).toEqual({ hour: 0, count: 0 })
    expect(filled[9]).toEqual({ hour: 9, count: 5 })
    expect(filled[18]).toEqual({ hour: 18, count: 3 })
  })
})

describe('peakHour', () => {
  it('returns the busiest hour', () => {
    expect(peakHour([{ hour: 8, count: 2 }, { hour: 19, count: 7 }, { hour: 20, count: 4 }])).toBe(19)
  })
  it('returns null when there are no entries', () => {
    expect(peakHour([])).toBeNull()
    expect(peakHour(fillHours([]))).toBeNull()
  })
  it('keeps the earliest hour on a tie', () => {
    expect(peakHour([{ hour: 10, count: 3 }, { hour: 15, count: 3 }])).toBe(10)
  })
})

describe('averagePerDay', () => {
  it('rounds to one decimal', () => {
    expect(averagePerDay(10, 3)).toBe(3.3)
    expect(averagePerDay(10, 4)).toBe(2.5)
  })
  it('is zero with no days', () => {
    expect(averagePerDay(10, 0)).toBe(0)
  })
})

describe('hourLabel', () => {
  it('formats 12-hour labels', () => {
    expect(hourLabel(0)).toBe('12 AM')
    expect(hourLabel(9)).toBe('9 AM')
    expect(hourLabel(12)).toBe('12 PM')
    expect(hourLabel(18)).toBe('6 PM')
    expect(hourLabel(23)).toBe('11 PM')
  })
})

describe('visitorTrendsToCsv', () => {
  it('emits date,count rows', () => {
    expect(visitorTrendsToCsv([{ date: '2026-07-01', count: 4 }, { date: '2026-07-02', count: 0 }])).toBe(
      'Date,Visitors\n2026-07-01,4\n2026-07-02,0',
    )
  })
})
