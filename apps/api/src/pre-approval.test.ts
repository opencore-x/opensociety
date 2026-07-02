import { describe, it, expect } from 'vitest'
import { preApprovalRedeemError } from '@opensociety/shared'
import type { PreApprovalType } from '@opensociety/shared'

const NOW = 1_000_000

function pa(overrides: {
  isActive?: boolean
  approvalType?: PreApprovalType
  validUntilMs?: number | null
  maxUses?: number | null
  useCount?: number
}) {
  return {
    isActive: true,
    approvalType: 'ONE_TIME' as PreApprovalType,
    validUntilMs: null,
    maxUses: null,
    useCount: 0,
    ...overrides,
  }
}

describe('preApprovalRedeemError', () => {
  it('allows a fresh ONE_TIME code', () => {
    expect(preApprovalRedeemError(pa({ approvalType: 'ONE_TIME', useCount: 0 }), NOW)).toBeNull()
  })

  it('exhausts a ONE_TIME code after one use, even with maxUses null', () => {
    expect(preApprovalRedeemError(pa({ approvalType: 'ONE_TIME', maxUses: null, useCount: 1 }), NOW)).toBe(
      'code exhausted',
    )
  })

  it('rejects an inactive code', () => {
    expect(preApprovalRedeemError(pa({ isActive: false }), NOW)).toBe('invalid or inactive code')
  })

  it('rejects an expired code', () => {
    expect(preApprovalRedeemError(pa({ validUntilMs: NOW - 1 }), NOW)).toBe('code expired')
  })

  it('allows a code valid until the future', () => {
    expect(preApprovalRedeemError(pa({ approvalType: 'ALWAYS', validUntilMs: NOW + 1 }), NOW)).toBeNull()
  })

  it('treats ALWAYS with no maxUses as unlimited', () => {
    expect(preApprovalRedeemError(pa({ approvalType: 'ALWAYS', maxUses: null, useCount: 99 }), NOW)).toBeNull()
  })

  it('honors maxUses for non-ONE_TIME codes', () => {
    expect(preApprovalRedeemError(pa({ approvalType: 'SCHEDULED', maxUses: 2, useCount: 1 }), NOW)).toBeNull()
    expect(preApprovalRedeemError(pa({ approvalType: 'SCHEDULED', maxUses: 2, useCount: 2 }), NOW)).toBe(
      'code exhausted',
    )
  })

  it('checks expiry before exhaustion', () => {
    expect(
      preApprovalRedeemError(pa({ validUntilMs: NOW - 1, approvalType: 'ONE_TIME', useCount: 5 }), NOW),
    ).toBe('code expired')
  })
})
