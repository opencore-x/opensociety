import { describe, it, expect } from 'vitest'
import { agingBucketFor, bucketAging } from '@opensociety/shared'

const asOf = Date.UTC(2026, 2, 31) // 2026-03-31
const daysBefore = (n: number) => asOf - n * 86_400_000

describe('agingBucketFor', () => {
  it('maps days overdue to buckets at the boundaries', () => {
    expect(agingBucketFor(0)).toBe('0-30')
    expect(agingBucketFor(30)).toBe('0-30')
    expect(agingBucketFor(31)).toBe('31-60')
    expect(agingBucketFor(60)).toBe('31-60')
    expect(agingBucketFor(61)).toBe('61-90')
    expect(agingBucketFor(90)).toBe('61-90')
    expect(agingBucketFor(91)).toBe('90+')
    expect(agingBucketFor(400)).toBe('90+')
  })
})

describe('bucketAging', () => {
  it('sums outstanding into the right buckets by age', () => {
    const items = [
      { outstanding: 10000, dueDateMs: daysBefore(10) }, // 0-30
      { outstanding: 20000, dueDateMs: daysBefore(45) }, // 31-60
      { outstanding: 30000, dueDateMs: daysBefore(75) }, // 61-90
      { outstanding: 40000, dueDateMs: daysBefore(120) }, // 90+
      { outstanding: 5000, dueDateMs: daysBefore(5) }, // 0-30
    ]
    expect(bucketAging(items, asOf)).toEqual({ '0-30': 15000, '31-60': 20000, '61-90': 30000, '90+': 40000 })
  })

  it('treats not-yet-due amounts as current and skips cleared balances', () => {
    const items = [
      { outstanding: 8000, dueDateMs: asOf + 10 * 86_400_000 }, // future due -> 0-30
      { outstanding: 0, dueDateMs: daysBefore(200) }, // cleared -> skipped
      { outstanding: -500, dueDateMs: daysBefore(200) }, // credit -> skipped
    ]
    expect(bucketAging(items, asOf)).toEqual({ '0-30': 8000, '31-60': 0, '61-90': 0, '90+': 0 })
  })
})
