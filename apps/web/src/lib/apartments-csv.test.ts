import { describe, expect, it } from 'vitest'

import { parseBulk } from './apartments-csv'

describe('parseBulk', () => {
  it('parses a well-formed row with all fields', () => {
    const { rows, errors } = parseBulk('A,101,1,2BHK')
    expect(errors).toEqual([])
    expect(rows).toEqual([{ tower: 'A', apartmentNo: '101', floor: 1, bhkType: '2BHK' }])
  })

  it('parses minimal rows (tower + number only)', () => {
    const { rows, errors } = parseBulk('B,201')
    expect(errors).toEqual([])
    expect(rows).toEqual([{ tower: 'B', apartmentNo: '201' }])
  })

  it('ignores blank lines and trims whitespace', () => {
    const { rows, errors } = parseBulk('\n  A, 101 ,2, 3bhk \n\n')
    expect(errors).toEqual([])
    expect(rows).toEqual([{ tower: 'A', apartmentNo: '101', floor: 2, bhkType: '3BHK' }])
  })

  it('uppercases bhk before validating', () => {
    const { rows } = parseBulk('A,1,,penthouse')
    expect(rows[0].bhkType).toBe('PENTHOUSE')
  })

  it('reports missing tower/number with the correct line number', () => {
    const { rows, errors } = parseBulk('A,101\n,102\nB,')
    expect(rows).toHaveLength(1)
    expect(errors).toContain('Line 2: tower and number are required')
    expect(errors).toContain('Line 3: tower and number are required')
  })

  it('reports a non-numeric floor but still keeps the row', () => {
    const { rows, errors } = parseBulk('A,101,ground')
    expect(errors).toContain('Line 1: floor "ground" is not a number')
    expect(rows[0]).toEqual({ tower: 'A', apartmentNo: '101' })
  })

  it('reports an invalid bhk', () => {
    const { errors } = parseBulk('A,101,1,6BHK')
    expect(errors).toContain('Line 1: invalid BHK "6BHK"')
  })

  it('returns empty result for empty input', () => {
    expect(parseBulk('')).toEqual({ rows: [], errors: [] })
    expect(parseBulk('   \n  ')).toEqual({ rows: [], errors: [] })
  })

  it('parses multiple rows independently', () => {
    const { rows, errors } = parseBulk('A,101,1,2BHK\nA,102,1,3BHK\nB,201,2')
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
  })
})
