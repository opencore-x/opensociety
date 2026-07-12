import { describe, it, expect } from 'vitest'
import { canManageHouseHelp } from '@opensociety/shared'

const REGISTRAR = 'user-1'
const OTHER = 'user-2'

describe('canManageHouseHelp', () => {
  it('lets an admin manage any profile', () => {
    expect(canManageHouseHelp('ADMIN', REGISTRAR, OTHER)).toBe(true)
    expect(canManageHouseHelp('ADMIN', null, undefined)).toBe(true)
  })

  it('lets the registering resident manage their own profile', () => {
    expect(canManageHouseHelp('RESIDENT', REGISTRAR, REGISTRAR)).toBe(true)
  })

  it('blocks a resident who did not register the profile', () => {
    expect(canManageHouseHelp('RESIDENT', REGISTRAR, OTHER)).toBe(false)
  })

  it('blocks guards and unauthenticated callers', () => {
    expect(canManageHouseHelp('GUARD', REGISTRAR, REGISTRAR)).toBe(false)
    expect(canManageHouseHelp(undefined, REGISTRAR, REGISTRAR)).toBe(false)
  })

  it('does not treat an admin-registered (null registrar) profile as resident-manageable', () => {
    expect(canManageHouseHelp('RESIDENT', null, OTHER)).toBe(false)
  })
})
