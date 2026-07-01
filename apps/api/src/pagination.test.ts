import { describe, it, expect } from 'vitest'
import type { Context } from 'hono'
import { parsePagination } from './pagination'

// Minimal Context stub exposing just req.query, which is all parsePagination reads.
function ctx(query: Record<string, string>): Context {
  return { req: { query: (k: string) => query[k] } } as unknown as Context
}

describe('parsePagination', () => {
  it('defaults to limit 50 / offset 0 when absent', () => {
    expect(parsePagination(ctx({}))).toEqual({ limit: 50, offset: 0 })
  })

  it('honours valid limit and offset', () => {
    expect(parsePagination(ctx({ limit: '25', offset: '10' }))).toEqual({ limit: 25, offset: 10 })
  })

  it('clamps limit to the max (200)', () => {
    expect(parsePagination(ctx({ limit: '9999' })).limit).toBe(200)
  })

  it('floors fractional values', () => {
    expect(parsePagination(ctx({ limit: '10.9', offset: '5.7' }))).toEqual({ limit: 10, offset: 5 })
  })

  it('falls back on invalid / non-positive input', () => {
    expect(parsePagination(ctx({ limit: 'abc', offset: '-5' }))).toEqual({ limit: 50, offset: 0 })
    expect(parsePagination(ctx({ limit: '0' })).limit).toBe(50)
  })

  it('respects custom defaults and caps', () => {
    expect(parsePagination(ctx({}), 10, 20)).toEqual({ limit: 10, offset: 0 })
    expect(parsePagination(ctx({ limit: '100' }), 10, 20).limit).toBe(20)
  })
})
