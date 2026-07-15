import { describe, it, expect, beforeEach, vi } from 'vitest'

// Route-level tests with a mocked Drizzle client (see visitors.route.test.ts).
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
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const get = (path: string, id?: string) =>
  apartmentRoutes.request(path, { headers: id ? { 'x-user-id': id } : {} }, env)

beforeEach(() => setQueue([]))

describe('GET /apartments/mine/residents', () => {
  it('401s an unauthenticated request', async () => {
    expect((await get('/mine/residents')).status).toBe(401)
  })

  it('returns co-residents of the acting user', async () => {
    const rows = [{ apartmentId: 'apt1', userId: 'r2', name: 'Asha', relation: 'FAMILY' }]
    setQueue([[RESIDENT], rows]) // withAuth resolves the user, then the residents query
    const res = await get('/mine/residents', 'r1')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(rows)
  })
})
