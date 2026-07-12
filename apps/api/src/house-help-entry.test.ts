import { describe, it, expect } from 'vitest'
import { houseHelpWorkedMinutes } from '@opensociety/shared'

describe('houseHelpWorkedMinutes', () => {
  it('returns null while still inside (no check-out)', () => {
    expect(houseHelpWorkedMinutes('2026-07-12T09:00:00.000Z', null)).toBeNull()
  })

  it('computes whole minutes between check-in and check-out', () => {
    expect(houseHelpWorkedMinutes('2026-07-12T09:00:00.000Z', '2026-07-12T11:30:00.000Z')).toBe(150)
  })

  it('rounds to the nearest minute', () => {
    expect(houseHelpWorkedMinutes('2026-07-12T09:00:00.000Z', '2026-07-12T09:00:40.000Z')).toBe(1)
  })

  it('floors clock-skew negatives to 0', () => {
    expect(houseHelpWorkedMinutes('2026-07-12T11:00:00.000Z', '2026-07-12T10:59:00.000Z')).toBe(0)
  })

  it('accepts Date objects too', () => {
    expect(
      houseHelpWorkedMinutes(new Date('2026-07-12T09:00:00Z'), new Date('2026-07-12T10:00:00Z')),
    ).toBe(60)
  })
})
