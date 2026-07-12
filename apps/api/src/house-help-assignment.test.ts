import { describe, it, expect } from 'vitest'
import { canManageHouseHelpAssignment } from '@opensociety/shared'

describe('canManageHouseHelpAssignment', () => {
  it('lets an admin manage any apartment assignment', () => {
    expect(canManageHouseHelpAssignment('ADMIN', false)).toBe(true)
    expect(canManageHouseHelpAssignment('ADMIN', true)).toBe(true)
  })

  it('lets a resident manage only a flat they live in', () => {
    expect(canManageHouseHelpAssignment('RESIDENT', true)).toBe(true)
    expect(canManageHouseHelpAssignment('RESIDENT', false)).toBe(false)
  })

  it('blocks guards, staff, and unauthenticated callers', () => {
    expect(canManageHouseHelpAssignment('GUARD', true)).toBe(false)
    expect(canManageHouseHelpAssignment('STAFF', true)).toBe(false)
    expect(canManageHouseHelpAssignment(undefined, true)).toBe(false)
  })
})
