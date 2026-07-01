import type { Context } from 'hono'

// Reads ?limit / ?offset from the query, clamping to safe bounds so a client
// can't request an unbounded page. Invalid/absent values fall back to defaults.
export function parsePagination(c: Context, defaultLimit = 50, maxLimit = 200) {
  const rawLimit = Number(c.req.query('limit'))
  const rawOffset = Number(c.req.query('offset'))
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0
  return { limit, offset }
}
