import { describe, it, expect } from 'vitest'
import { computeTrustScore, verificationLevel, updateVerificationSchema } from '@opensociety/shared'

const base = { ratingTrust: 60, idVerified: false, backgroundCheck: 'PENDING' as const, tenureDays: 0, incidentCount: 0 }

describe('verificationLevel', () => {
  it('is VERIFIED only with ID verified AND background cleared', () => {
    expect(verificationLevel(true, 'CLEARED')).toBe('VERIFIED')
    expect(verificationLevel(true, 'PENDING')).toBe('UNVERIFIED')
    expect(verificationLevel(false, 'CLEARED')).toBe('UNVERIFIED')
    expect(verificationLevel(true, 'FLAGGED')).toBe('UNVERIFIED')
  })
})

describe('computeTrustScore', () => {
  it('weights ratings at 40%', () => {
    expect(computeTrustScore({ ...base, ratingTrust: 100 })).toBe(40)
    expect(computeTrustScore({ ...base, ratingTrust: 50 })).toBe(20)
  })

  it('adds ID + background bonuses', () => {
    expect(computeTrustScore({ ...base, ratingTrust: 0, idVerified: true })).toBe(20)
    expect(computeTrustScore({ ...base, ratingTrust: 0, backgroundCheck: 'CLEARED' })).toBe(28)
  })

  it('penalises a flagged background check heavily', () => {
    expect(computeTrustScore({ ...base, ratingTrust: 100, backgroundCheck: 'FLAGGED' })).toBe(0) // 40-40
  })

  it('adds tenure up to 12 (1/month, capped)', () => {
    expect(computeTrustScore({ ...base, ratingTrust: 0, tenureDays: 90 })).toBe(3)
    expect(computeTrustScore({ ...base, ratingTrust: 0, tenureDays: 3650 })).toBe(12)
  })

  it('subtracts 10 per incident and clamps at 0', () => {
    expect(computeTrustScore({ ...base, ratingTrust: 50, incidentCount: 1 })).toBe(10) // 20-10
    expect(computeTrustScore({ ...base, ratingTrust: 0, incidentCount: 5 })).toBe(0)
  })

  it('a fully-trusted help reaches 100', () => {
    expect(
      computeTrustScore({ ratingTrust: 100, idVerified: true, backgroundCheck: 'CLEARED', tenureDays: 400, incidentCount: 0 }),
    ).toBe(100) // 40+20+28+12
  })
})

describe('updateVerificationSchema', () => {
  it('accepts partial admin updates', () => {
    expect(updateVerificationSchema.safeParse({ idVerified: true }).success).toBe(true)
    expect(updateVerificationSchema.safeParse({ backgroundCheck: 'CLEARED', incidentCount: 2 }).success).toBe(true)
  })
  it('rejects a bad status or negative incidents', () => {
    expect(updateVerificationSchema.safeParse({ backgroundCheck: 'NOPE' }).success).toBe(false)
    expect(updateVerificationSchema.safeParse({ incidentCount: -1 }).success).toBe(false)
  })
})
