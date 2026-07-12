import { describe, it, expect } from 'vitest'
import { isGuardDeviceAllowed } from '@opensociety/shared'

describe('isGuardDeviceAllowed', () => {
  it('allows any device when the guard is unbound (null active)', () => {
    expect(isGuardDeviceAllowed(null, 'dev-a')).toBe(true)
    expect(isGuardDeviceAllowed(null, undefined)).toBe(true)
  })

  it('allows only the matching device when bound', () => {
    expect(isGuardDeviceAllowed('dev-a', 'dev-a')).toBe(true)
    expect(isGuardDeviceAllowed('dev-a', 'dev-b')).toBe(false)
  })

  it('rejects a bound guard when no device id is supplied', () => {
    expect(isGuardDeviceAllowed('dev-a', undefined)).toBe(false)
    expect(isGuardDeviceAllowed('dev-a', null)).toBe(false)
  })
})
