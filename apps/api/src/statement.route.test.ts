import { describe, it, expect, beforeEach, vi } from 'vitest'

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

const { apartmentRoutes } = await import('./routes/apartments')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const get = (path: string, id?: string) =>
  apartmentRoutes.request(path, { headers: id ? { 'x-user-id': id } : {} }, env)

beforeEach(() => setQueue([]))

describe('GET /apartments/:id/statement', () => {
  it('401s an unauthenticated request', async () => {
    expect((await get('/apt1/statement')).status).toBe(401)
  })

  it('403s a resident for a flat that is not theirs', async () => {
    setQueue([[RESIDENT], []]) // auth, then empty residency scope
    expect((await get('/apt1/statement', 'r1')).status).toBe(403)
  })

  it('returns a running-balance statement for an admin', async () => {
    setQueue([
      [ADMIN],
      [{ id: 'apt1', tower: 'A', apartmentNo: '101' }],
      [{ id: 'b1', title: 'Maintenance Jan', total: 100000, issuedAt: '2026-01-05T00:00:00.000Z' }],
      [{ id: 'p1', amount: 60000, method: 'UPI', paidAt: '2026-01-20T00:00:00.000Z' }],
    ])
    const res = await get('/apt1/statement', 'a1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      apartment: string
      opening: number
      closing: number
      entries: { type: string; balance: number }[]
    }
    expect(body).toMatchObject({ apartment: 'A-101', opening: 0, closing: 40000 })
    expect(body.entries).toHaveLength(2)
    expect(body.entries[1]).toMatchObject({ type: 'PAYMENT', balance: 40000 })
  })
})
