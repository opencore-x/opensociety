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

const { visitorRoutes } = await import('./routes/visitors')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const GUARD = { id: 'g1', role: 'GUARD', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const post = (path: string, user: { id: string }, body = '{}') =>
  visitorRoutes.request(
    path,
    { method: 'POST', headers: { 'x-user-id': user.id, 'content-type': 'application/json' }, body },
    env,
  )

beforeEach(() => setQueue([]))

describe('visitor routes — role gates', () => {
  it('401s an unauthenticated GET /', async () => {
    expect((await visitorRoutes.request('/', {}, env)).status).toBe(401)
  })

  // [endpoint, a user whose role is NOT permitted there]
  const forbidden: [string, typeof ADMIN][] = [
    ['/pre-approvals', GUARD], // create pre-approval: RESIDENT/ADMIN
    ['/pre-approvals/redeem', RESIDENT], // redeem: GUARD/ADMIN
    ['/pre-approvals/x/revoke', RESIDENT], // revoke: ADMIN
    ['/pre-approvals/x/revoke', GUARD],
    ['/', RESIDENT], // log a visitor: GUARD/ADMIN
    ['/x/approve', GUARD], // approve: RESIDENT/ADMIN
    ['/x/deny', GUARD], // deny: RESIDENT/ADMIN
    ['/x/checkin', RESIDENT], // gate check-in: GUARD/ADMIN
    ['/x/checkout', RESIDENT], // gate check-out: GUARD/ADMIN
  ]

  it.each(forbidden)('403s %s for a disallowed role', async (path, user) => {
    setQueue([[user]]) // withAuth resolves the user; requireRole rejects before the handler
    expect((await post(path, user)).status).toBe(403)
  })
})

describe('visitor routes — handler', () => {
  it('a guard logs a visitor (201)', async () => {
    setQueue([[GUARD], [{ id: 'v1', visitorName: 'Guest', status: 'PENDING' }]]) // user, insert returning
    const res = await post('/', GUARD, JSON.stringify({ apartmentId: '11111111-1111-1111-1111-111111111111', visitorName: 'Guest' }))
    expect(res.status).toBe(201)
  })

  it('an admin may also log a visitor (201)', async () => {
    setQueue([[ADMIN], [{ id: 'v2', visitorName: 'Guest', status: 'PENDING' }]])
    const res = await post('/', ADMIN, JSON.stringify({ apartmentId: '11111111-1111-1111-1111-111111111111', visitorName: 'Guest' }))
    expect(res.status).toBe(201)
  })
})

describe('visitor routes — idempotent create (offline replay)', () => {
  const APARTMENT_ID = '11111111-1111-1111-1111-111111111111'
  const CLIENT_ID = '22222222-2222-2222-2222-222222222222'
  const entry = (over: Record<string, unknown> = {}) => ({
    id: 'v1',
    clientId: CLIENT_ID,
    visitorName: 'Rahul',
    status: 'PENDING',
    ...over,
  })

  it('creates a new entry (201) for an unseen clientId', async () => {
    setQueue([[GUARD], [entry()]]) // user, insert…returning() yields the new row
    const res = await post('/', GUARD, JSON.stringify({ apartmentId: APARTMENT_ID, visitorName: 'Rahul', clientId: CLIENT_ID }))
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: 'v1', clientId: CLIENT_ID })
  })

  it('dedupes a replayed clientId to the existing row (200, not a duplicate)', async () => {
    setQueue([[GUARD], [], [entry()]]) // user, insert hits the unique index → [], then select existing
    const res = await post('/', GUARD, JSON.stringify({ apartmentId: APARTMENT_ID, visitorName: 'Rahul', clientId: CLIENT_ID }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ id: 'v1', clientId: CLIENT_ID })
  })
})
