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

const { houseHelpRoutes } = await import('./routes/house-help')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const GUARD = { id: 'g1', role: 'GUARD', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const hdr = (id: string) => ({ 'x-user-id': id, 'content-type': 'application/json' })
const post = (path: string, id: string, body: unknown) =>
  houseHelpRoutes.request(path, { method: 'POST', headers: hdr(id), body: JSON.stringify(body) }, env)

beforeEach(() => setQueue([]))

describe('house-help review authz', () => {
  it('lets a resident post a review (RESIDENT/ADMIN)', async () => {
    setQueue([[RESIDENT], [{ id: 'h1' }], [{ id: 'rev1', rating: 5 }]]) // user, help-exists, upsert returning
    expect((await post('/h1/reviews', 'r1', { rating: 5 })).status).toBe(201)
  })

  it('403s a GUARD posting a review', async () => {
    setQueue([[GUARD]])
    expect((await post('/h1/reviews', 'g1', { rating: 5 })).status).toBe(403)
  })

  it('404s a review for a missing house help', async () => {
    setQueue([[RESIDENT], []]) // user, help-exists returns nothing
    expect((await post('/nope/reviews', 'r1', { rating: 5 })).status).toBe(404)
  })

  it('400s an out-of-range rating', async () => {
    setQueue([[RESIDENT]]) // rejected by zValidator before any handler query
    expect((await post('/h1/reviews', 'r1', { rating: 9 })).status).toBe(400)
  })
})

describe('house-help verification authz (admin only)', () => {
  it('lets an admin set verification', async () => {
    setQueue([[ADMIN], [{ id: 'h1', idVerified: true }]]) // user, update returning
    expect((await post('/h1/verification', 'a1', { idVerified: true })).status).toBe(200)
  })

  it('403s a resident', async () => {
    setQueue([[RESIDENT]])
    expect((await post('/h1/verification', 'r1', { idVerified: true })).status).toBe(403)
  })

  it('403s a guard', async () => {
    setQueue([[GUARD]])
    expect((await post('/h1/verification', 'g1', { idVerified: true })).status).toBe(403)
  })

  it('404s an unknown house help', async () => {
    setQueue([[ADMIN], []]) // user, update returns nothing
    expect((await post('/nope/verification', 'a1', { idVerified: true })).status).toBe(404)
  })
})
