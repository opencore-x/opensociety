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

const { expenseRoutes } = await import('./routes/expenses')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const ACCOUNT = '00000000-0000-0000-0000-0000000000aa'
const post = (path: string, id: string | undefined, body: unknown) =>
  expenseRoutes.request(
    path,
    { method: 'POST', headers: { 'content-type': 'application/json', ...(id ? { 'x-user-id': id } : {}) }, body: JSON.stringify(body) },
    env,
  )

beforeEach(() => setQueue([]))

describe('expense routes — admin only', () => {
  it('401s an unauthenticated GET /vendors', async () => {
    expect((await expenseRoutes.request('/vendors', {}, env)).status).toBe(401)
  })
  it('403s a resident recording an expense', async () => {
    setQueue([[RESIDENT]])
    expect((await post('/', 'r1', {})).status).toBe(403)
  })
})

describe('POST /expenses — validation + create', () => {
  it('400s a create missing the required account head', async () => {
    setQueue([[ADMIN]])
    expect((await post('/', 'a1', { amount: 100000, description: 'x' })).status).toBe(400)
  })

  it('201s a valid PAID expense (posting is a safe no-op before ledger init)', async () => {
    // auth, then the expense insert...returning; the account-resolution query
    // defaults to [] so posting skips (ledger not initialized).
    setQueue([[ADMIN], [{ id: 'exp-1', status: 'PAID', method: 'BANK_TRANSFER', vendorId: null, accountId: ACCOUNT, amount: 100000, taxAmount: 0, createdAt: '2026-07-10T00:00:00.000Z' }]])
    const res = await post('/', 'a1', {
      accountId: ACCOUNT,
      amount: 100000,
      description: 'Security — July',
      status: 'PAID',
      method: 'BANK_TRANSFER',
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ id: 'exp-1', status: 'PAID' })
  })
})
