import { describe, it, expect } from 'vitest'
import {
  summarizeHouseHelpAttendance,
  formatWorkedMinutes,
  houseHelpAttendanceToCsv,
} from '@opensociety/shared'
import type { HouseHelpAttendanceRow } from '@opensociety/shared'

const row = (o: Partial<HouseHelpAttendanceRow> & Pick<HouseHelpAttendanceRow, 'houseHelpId' | 'helpName'>): HouseHelpAttendanceRow => ({
  type: 'MAID',
  apartment: 'A-101',
  checkInAt: '2026-07-12T09:00:00.000Z',
  checkOutAt: '2026-07-12T11:00:00.000Z',
  ...o,
})

describe('summarizeHouseHelpAttendance', () => {
  it('groups by help, sums minutes, counts visits and open ones', () => {
    const rows = [
      row({ houseHelpId: 'h1', helpName: 'Asha', checkOutAt: '2026-07-12T11:00:00.000Z' }), // 120m
      row({ houseHelpId: 'h1', helpName: 'Asha', checkInAt: '2026-07-13T09:00:00.000Z', checkOutAt: '2026-07-13T09:30:00.000Z' }), // 30m
      row({ houseHelpId: 'h1', helpName: 'Asha', checkOutAt: null }), // open
      row({ houseHelpId: 'h2', helpName: 'Bharat', checkOutAt: '2026-07-12T10:00:00.000Z' }), // 60m
    ]
    const summary = summarizeHouseHelpAttendance(rows)
    expect(summary.map((s) => s.helpName)).toEqual(['Asha', 'Bharat']) // sorted
    expect(summary[0]).toMatchObject({ visits: 3, totalMinutes: 150, openVisits: 1 })
    expect(summary[1]).toMatchObject({ visits: 1, totalMinutes: 60, openVisits: 0 })
  })

  it('returns an empty array for no rows', () => {
    expect(summarizeHouseHelpAttendance([])).toEqual([])
  })
})

describe('formatWorkedMinutes', () => {
  it('formats hours and minutes', () => {
    expect(formatWorkedMinutes(150)).toBe('2h 30m')
    expect(formatWorkedMinutes(45)).toBe('45m')
    expect(formatWorkedMinutes(0)).toBe('0m')
    expect(formatWorkedMinutes(null)).toBe('—')
  })
})

describe('houseHelpAttendanceToCsv', () => {
  it('emits a header and one line per row with computed minutes', () => {
    const csv = houseHelpAttendanceToCsv([
      row({ houseHelpId: 'h1', helpName: 'Asha' }),
      row({ houseHelpId: 'h2', helpName: 'Bharat', checkOutAt: null }),
    ])
    const lines = csv.split('\n')
    expect(lines[0]).toBe('House help,Type,Apartment,Check-in,Check-out,Minutes')
    expect(lines[1]).toContain('Asha,MAID,A-101,')
    expect(lines[1].endsWith(',120')).toBe(true)
    expect(lines[2].endsWith(',')).toBe(true) // open entry -> empty minutes + check-out
  })

  it('quotes cells containing commas', () => {
    const csv = houseHelpAttendanceToCsv([row({ houseHelpId: 'h1', helpName: 'Devi, A.' })])
    expect(csv.split('\n')[1]).toContain('"Devi, A."')
  })
})
