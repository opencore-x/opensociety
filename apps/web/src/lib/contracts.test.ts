import { describe, expect, it } from 'vitest'

import {
  createApartmentSchema,
  updateApartmentSchema,
  createGuardSchema,
  denyVisitorSchema,
  createNoticeSchema,
  approveUserSchema,
  visitorStatusSchema,
  userRoleSchema,
} from '@opensociety/shared'

describe('apartment contracts', () => {
  it('requires tower and apartmentNo on create', () => {
    expect(createApartmentSchema.safeParse({ tower: 'A', apartmentNo: '101' }).success).toBe(true)
    expect(createApartmentSchema.safeParse({ tower: 'A' }).success).toBe(false)
    expect(createApartmentSchema.safeParse({ tower: '', apartmentNo: '101' }).success).toBe(false)
  })

  it('rejects unknown bhk values', () => {
    expect(createApartmentSchema.safeParse({ tower: 'A', apartmentNo: '1', bhkType: '9BHK' }).success).toBe(false)
  })

  it('allows fully partial updates and nullable floor/bhk', () => {
    expect(updateApartmentSchema.safeParse({}).success).toBe(true)
    expect(updateApartmentSchema.safeParse({ floor: null, bhkType: null }).success).toBe(true)
    expect(updateApartmentSchema.safeParse({ isActive: false }).success).toBe(true)
  })
})

describe('guard contracts', () => {
  it('requires a non-empty name', () => {
    expect(createGuardSchema.safeParse({ name: 'Ramesh' }).success).toBe(true)
    expect(createGuardSchema.safeParse({ name: '' }).success).toBe(false)
    expect(createGuardSchema.safeParse({}).success).toBe(false)
  })
})

describe('visitor contracts', () => {
  it('requires a reason to deny', () => {
    expect(denyVisitorSchema.safeParse({ reason: 'not expected' }).success).toBe(true)
    expect(denyVisitorSchema.safeParse({ reason: '' }).success).toBe(false)
  })

  it('enumerates the full visitor status state machine', () => {
    expect(visitorStatusSchema.options).toEqual([
      'PENDING',
      'APPROVED',
      'DENIED',
      'ENTERED',
      'EXITED',
      'CANCELLED',
      'EXPIRED',
    ])
  })
})

describe('notice contracts', () => {
  it('requires title and body, defaults priority to NORMAL', () => {
    const parsed = createNoticeSchema.safeParse({ title: 'Water', body: 'Off at 2pm' })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.priority).toBe('NORMAL')
    expect(createNoticeSchema.safeParse({ title: 'x' }).success).toBe(false)
  })

  it('rejects a non-datetime expiresAt', () => {
    expect(createNoticeSchema.safeParse({ title: 'a', body: 'b', expiresAt: 'tomorrow' }).success).toBe(false)
    expect(
      createNoticeSchema.safeParse({ title: 'a', body: 'b', expiresAt: '2026-07-01T10:00:00.000Z' }).success,
    ).toBe(true)
  })
})

describe('user contracts', () => {
  it('approveUser requires an apartmentId uuid and defaults relation/primary', () => {
    const parsed = approveUserSchema.safeParse({ apartmentId: '11111111-1111-1111-1111-111111111111' })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.relation).toBe('OWNER')
      expect(parsed.data.isPrimary).toBe(true)
    }
    expect(approveUserSchema.safeParse({ apartmentId: 'not-a-uuid' }).success).toBe(false)
  })

  it('enumerates roles', () => {
    expect(userRoleSchema.options).toEqual(['RESIDENT', 'GUARD', 'ADMIN', 'STAFF'])
  })
})
