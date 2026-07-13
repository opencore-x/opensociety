import { z } from 'zod'

export const createHouseHelpReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
})

// Public, anonymous review shape — no reviewer identity is ever exposed.
export const houseHelpReviewSchema = z.object({
  id: z.string().uuid(),
  houseHelpId: z.string().uuid(),
  rating: z.number().int(),
  comment: z.string().nullable(),
  createdAt: z.string(),
})

// Mean rating to one decimal, or null when there are no ratings.
export function averageRating(ratings: number[]): number | null {
  if (ratings.length === 0) return null
  const sum = ratings.reduce((s, r) => s + r, 0)
  return Math.round((sum / ratings.length) * 10) / 10
}

// A 0..100 trust score from a Bayesian-smoothed average: few reviews are pulled
// toward a neutral prior (3/5), so a single 5★ doesn't outrank a well-reviewed
// help. sum/count are the rating total and number of reviews.
const PRIOR_MEAN = 3
const PRIOR_WEIGHT = 3

export function trustScore(sum: number, count: number): number {
  const smoothed = (sum + PRIOR_MEAN * PRIOR_WEIGHT) / (count + PRIOR_WEIGHT)
  return Math.round((smoothed / 5) * 100)
}

export type HouseHelpRatingSummary = {
  average: number | null
  count: number
  trustScore: number
}

// Roll a set of ratings up into the directory summary.
export function summarizeRatings(ratings: number[]): HouseHelpRatingSummary {
  const count = ratings.length
  const sum = ratings.reduce((s, r) => s + r, 0)
  return { average: averageRating(ratings), count, trustScore: trustScore(sum, count) }
}

export type CreateHouseHelpReview = z.infer<typeof createHouseHelpReviewSchema>
export type HouseHelpReview = z.infer<typeof houseHelpReviewSchema>
