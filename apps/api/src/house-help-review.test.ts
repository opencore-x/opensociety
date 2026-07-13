import { describe, it, expect } from 'vitest'
import { averageRating, trustScore, summarizeRatings, createHouseHelpReviewSchema } from '@opensociety/shared'

describe('averageRating', () => {
  it('averages to one decimal', () => {
    expect(averageRating([5, 4, 4])).toBe(4.3)
    expect(averageRating([1, 5])).toBe(3)
  })
  it('is null with no ratings', () => {
    expect(averageRating([])).toBeNull()
  })
})

describe('trustScore', () => {
  it('pulls sparse ratings toward the neutral prior', () => {
    // one 5-star: (5 + 3*3) / (1+3) = 3.5 -> 70
    expect(trustScore(5, 1)).toBe(70)
    // one 1-star: (1 + 9) / 4 = 2.5 -> 50
    expect(trustScore(1, 1)).toBe(50)
  })
  it('approaches the true average as reviews accumulate', () => {
    // twenty 5-stars: (100 + 9)/23 = 4.74 -> 95
    expect(trustScore(100, 20)).toBe(95)
  })
  it('is a neutral 60 with no reviews', () => {
    // (0 + 9) / 3 = 3 -> 60
    expect(trustScore(0, 0)).toBe(60)
  })
})

describe('summarizeRatings', () => {
  it('bundles average, count and trust', () => {
    expect(summarizeRatings([5, 4, 4])).toEqual({ average: 4.3, count: 3, trustScore: trustScore(13, 3) })
  })
  it('handles the empty case', () => {
    expect(summarizeRatings([])).toEqual({ average: null, count: 0, trustScore: 60 })
  })
})

describe('createHouseHelpReviewSchema', () => {
  it('accepts a 1..5 rating', () => {
    expect(createHouseHelpReviewSchema.safeParse({ rating: 5 }).success).toBe(true)
    expect(createHouseHelpReviewSchema.safeParse({ rating: 1, comment: 'ok' }).success).toBe(true)
  })
  it('rejects out-of-range or non-integer ratings', () => {
    expect(createHouseHelpReviewSchema.safeParse({ rating: 0 }).success).toBe(false)
    expect(createHouseHelpReviewSchema.safeParse({ rating: 6 }).success).toBe(false)
    expect(createHouseHelpReviewSchema.safeParse({ rating: 3.5 }).success).toBe(false)
  })
})
