import { describe, it, expect, beforeEach, vi } from 'vitest'

// Route-level integration tests. We mock createDb so the route's own withDb
// middleware hands every query to a fake Drizzle client whose awaited results
// come from a per-test queue (each `await db...` shifts the next, default []).
const { fakeDb, setQueue } = vi.hoisted(() => {
  let queue: unknown[][] = []
  const makeChain = (): unknown =>
    new Proxy(function () {}, {
      get(_t, prop) {
        if (prop === 'then') {
          const r = queue.length ? (queue.shift() as unknown[]) : []
          return (resolve: (v: unknown) => void) => resolve(r)
        }
        return () => makeChain()
      },
      apply: () => makeChain(),
    })
  return { fakeDb: () => makeChain(), setQueue: (q: unknown[][]) => (queue = q) }
})

vi.mock('@opensociety/db', async (orig) => ({
  ...(await orig<typeof import('@opensociety/db')>()),
  createDb: () => fakeDb(),
}))

const { parkingRoutes } = await import('./routes/parking')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const GUARD = { id: 'g1', role: 'GUARD', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const as = (id?: string): { headers: Record<string, string> } => ({ headers: id ? { 'x-user-id': id } : {} })
const req = (path: string, opts: RequestInit = {}) => parkingRoutes.request(path, opts, env)

beforeEach(() => setQueue([]))

describe('parking routes — auth contract', () => {
  it('401s an unauthenticated GET /slots', async () => {
    expect((await req('/slots', as())).status).toBe(401)
  })

  it('403s a resident on the admin GET /slots', async () => {
    setQueue([[RESIDENT]]) // withAuth resolves the user, then requireRole rejects
    expect((await req('/slots', as('r1'))).status).toBe(403)
  })

  it('403s a resident on GET /visitor (admin/guard only)', async () => {
    setQueue([[RESIDENT]])
    expect((await req('/visitor', as('r1'))).status).toBe(403)
  })
})

describe('parking routes — handlers', () => {
  it('admin GET /slots returns the resolved rows', async () => {
    // [user], then the slots+apartments query, then the ratings/agg query
    setQueue([[ADMIN], [{ id: 's1', slotNumber: 'P-1', apartmentId: null, isVisitor: false }], []])
    const res = await req('/slots', as('a1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })

  it('guard GET /visitor returns slots + summary', async () => {
    setQueue([[GUARD], []]) // user, then the visitor-slots query (empty pool)
    const res = await req('/visitor', as('g1'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { slots: unknown[]; summary: { isFull: boolean } }
    expect(body.slots).toEqual([])
    expect(body.summary.isFull).toBe(false)
  })

  it('409s creating a slot whose number already exists', async () => {
    setQueue([[ADMIN], [{ id: 'dupe' }]]) // user, then the dup-check finds a row
    const res = await req('/slots', {
      ...as('a1'),
      method: 'POST',
      headers: { ...as('a1').headers, 'content-type': 'application/json' },
      body: JSON.stringify({ slotNumber: 'P-1', type: 'OPEN' }),
    })
    expect(res.status).toBe(409)
  })

  it('201s creating a fresh slot', async () => {
    // user, dup-check empty, insert returning the created row
    setQueue([[ADMIN], [], [{ id: 's9', slotNumber: 'P-9', type: 'OPEN', isVisitor: false }]])
    const res = await req('/slots', {
      ...as('a1'),
      method: 'POST',
      headers: { ...as('a1').headers, 'content-type': 'application/json' },
      body: JSON.stringify({ slotNumber: 'P-9', type: 'OPEN' }),
    })
    expect(res.status).toBe(201)
  })
})
