import { describe, it, expect } from 'vitest'
import { dutySessionMinutes, summarizeGuardDuty, entriesDuringSession } from '@opensociety/shared'
import type { GuardDutyRow } from '@opensociety/shared'

const row = (o: Partial<GuardDutyRow> & Pick<GuardDutyRow, 'guardId' | 'guardName'>): GuardDutyRow => ({
  clockInAt: '2026-07-13T08:00:00.000Z',
  clockOutAt: '2026-07-13T16:00:00.000Z',
  ...o,
})

describe('dutySessionMinutes', () => {
  it('returns null while still on duty', () => {
    expect(dutySessionMinutes('2026-07-13T08:00:00.000Z', null)).toBeNull()
  })
  it('computes an 8h shift as 480 minutes', () => {
    expect(dutySessionMinutes('2026-07-13T08:00:00.000Z', '2026-07-13T16:00:00.000Z')).toBe(480)
  })
  it('floors clock-skew negatives to 0', () => {
    expect(dutySessionMinutes('2026-07-13T16:00:00.000Z', '2026-07-13T15:59:00.000Z')).toBe(0)
  })
})

describe('summarizeGuardDuty', () => {
  it('groups by guard, sums minutes, flags on-duty, sorts by name', () => {
    const rows = [
      row({ guardId: 'g1', guardName: 'Ramesh' }), // 480
      row({ guardId: 'g1', guardName: 'Ramesh', clockInAt: '2026-07-14T08:00:00.000Z', clockOutAt: '2026-07-14T12:00:00.000Z' }), // 240
      row({ guardId: 'g2', guardName: 'Anil', clockOutAt: null }), // on duty
    ]
    const summary = summarizeGuardDuty(rows)
    expect(summary.map((s) => s.guardName)).toEqual(['Anil', 'Ramesh'])
    expect(summary.find((s) => s.guardId === 'g1')).toMatchObject({ sessions: 2, totalMinutes: 720, onDuty: false })
    expect(summary.find((s) => s.guardId === 'g2')).toMatchObject({ sessions: 1, totalMinutes: 0, onDuty: true })
  })
})

describe('entriesDuringSession', () => {
  const session = { clockInAt: '2026-07-13T08:00:00.000Z', clockOutAt: '2026-07-13T16:00:00.000Z' }
  it('counts only timestamps within the shift window (inclusive)', () => {
    const times = [
      '2026-07-13T07:59:00.000Z', // before
      '2026-07-13T08:00:00.000Z', // start (inclusive)
      '2026-07-13T12:00:00.000Z', // during
      '2026-07-13T16:00:00.000Z', // end (inclusive)
      '2026-07-13T16:01:00.000Z', // after
    ]
    expect(entriesDuringSession(session, times)).toBe(3)
  })
  it('treats an open shift as unbounded on the end', () => {
    expect(entriesDuringSession({ clockInAt: '2026-07-13T08:00:00.000Z', clockOutAt: null }, ['2027-01-01T00:00:00.000Z'])).toBe(1)
  })
})
