import { describe, it, expect } from 'vitest'
import { normalizePlate, canManageVehicle } from '@opensociety/shared'

describe('normalizePlate', () => {
  it('uppercases and strips spaces and hyphens', () => {
    expect(normalizePlate('ka 01 ab 1234')).toBe('KA01AB1234')
    expect(normalizePlate('KA-01-AB-1234')).toBe('KA01AB1234')
    expect(normalizePlate('ka01ab1234')).toBe('KA01AB1234')
  })

  it('is idempotent', () => {
    expect(normalizePlate(normalizePlate('ka 01 ab 1234'))).toBe('KA01AB1234')
  })
})

describe('canManageVehicle', () => {
  it('lets an admin manage any flat', () => {
    expect(canManageVehicle('ADMIN', false)).toBe(true)
  })

  it('lets a resident manage only their own flat', () => {
    expect(canManageVehicle('RESIDENT', true)).toBe(true)
    expect(canManageVehicle('RESIDENT', false)).toBe(false)
  })

  it('blocks guards, staff, and unauthenticated callers', () => {
    expect(canManageVehicle('GUARD', true)).toBe(false)
    expect(canManageVehicle('STAFF', true)).toBe(false)
    expect(canManageVehicle(undefined, true)).toBe(false)
  })
})
