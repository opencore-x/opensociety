import { describe, it, expect } from 'vitest'
import { EMPTY_SOCIETY, SETUP_STEPS, isSocietyComplete, societyErrors } from './setup-wizard'

const VALID = {
  name: 'Green Valley Heights',
  address: '123 Main Road',
  city: 'Bengaluru',
  state: 'Karnataka',
  pincode: '560001',
}

describe('SETUP_STEPS', () => {
  it('is society -> apartments -> review', () => {
    expect(SETUP_STEPS.map((s) => s.key)).toEqual(['society', 'apartments', 'review'])
  })
})

describe('societyErrors', () => {
  it('flags every empty field on a blank society', () => {
    const errs = societyErrors(EMPTY_SOCIETY)
    expect(Object.keys(errs).sort()).toEqual(['address', 'city', 'name', 'pincode', 'state'])
  })

  it('returns no errors for a fully valid society', () => {
    expect(societyErrors(VALID)).toEqual({})
  })

  it('rejects a non-6-digit pincode', () => {
    expect(societyErrors({ ...VALID, pincode: '123' }).pincode).toBeDefined()
    expect(societyErrors({ ...VALID, pincode: '5600011' }).pincode).toBeDefined()
    expect(societyErrors({ ...VALID, pincode: 'abcdef' }).pincode).toBeDefined()
  })

  it('reports only the invalid field when others are valid', () => {
    expect(societyErrors({ ...VALID, name: '' })).toEqual({ name: expect.any(String) })
  })
})

describe('isSocietyComplete', () => {
  it('is false when blank, true when valid', () => {
    expect(isSocietyComplete(EMPTY_SOCIETY)).toBe(false)
    expect(isSocietyComplete(VALID)).toBe(true)
  })
})
