import { z } from 'zod'
import { backgroundCheckStatusSchema } from './enums'
import type { BackgroundCheckStatus } from './enums'

// Admin sets verification/trust signals on a house help (#67).
export const updateVerificationSchema = z.object({
  idVerified: z.boolean().optional(),
  backgroundCheck: backgroundCheckStatusSchema.optional(),
  incidentCount: z.number().int().min(0).optional(),
})

export type VerificationLevel = 'VERIFIED' | 'UNVERIFIED'

// A help is "verified" only when their ID proof is confirmed AND the background
// check has cleared. Anything else (pending or flagged) reads unverified.
export function verificationLevel(idVerified: boolean, backgroundCheck: BackgroundCheckStatus): VerificationLevel {
  return idVerified && backgroundCheck === 'CLEARED' ? 'VERIFIED' : 'UNVERIFIED'
}

export type TrustInputs = {
  ratingTrust: number // 0..100 from the ratings (Bayesian trustScore)
  idVerified: boolean
  backgroundCheck: BackgroundCheckStatus
  tenureDays: number
  incidentCount: number
}

// Composite 0..100 trust score. Ratings carry 40%, a verified ID +20, a cleared
// background check +28 (a flagged one is a heavy -40), tenure up to +12 (1/month,
// capped at a year), and each logged incident -10. Clamped to 0..100.
export function computeTrustScore(i: TrustInputs): number {
  let score = i.ratingTrust * 0.4
  if (i.idVerified) score += 20
  if (i.backgroundCheck === 'CLEARED') score += 28
  else if (i.backgroundCheck === 'FLAGGED') score -= 40
  score += Math.min(Math.floor(i.tenureDays / 30), 12)
  score -= i.incidentCount * 10
  return Math.max(0, Math.min(100, Math.round(score)))
}

export type UpdateVerification = z.infer<typeof updateVerificationSchema>
