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

const { billRoutes } = await import('./routes/bills')
const { paymentRoutes } = await import('./routes/payments')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const as = (id?: string): { headers: Record<string, string> } => ({ headers: id ? { 'x-user-id': id } : {} })
const post = (routes: typeof billRoutes, path: string, id: string) =>
  routes.request(path, { method: 'POST', headers: { 'x-user-id': id, 'content-type': 'application/json' }, body: '{}' }, env)

beforeEach(() => setQueue([]))

describe('bills routes — admin-only writes', () => {
  it('401s an unauthenticated GET /', async () => {
    expect((await billRoutes.request('/', as(), env)).status).toBe(401)
  })

  it.each(['/generate', '/'])('403s a resident on POST %s', async (path) => {
    setQueue([[RESIDENT]])
    expect((await post(billRoutes, path, 'r1')).status).toBe(403)
  })

  it('403s a resident on GET /dues', async () => {
    setQueue([[RESIDENT]])
    expect((await billRoutes.request('/dues', as('r1'), env)).status).toBe(403)
  })
})

describe('payments routes — admin-only record', () => {
  it('401s an unauthenticated POST /', async () => {
    expect((await paymentRoutes.request('/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }, env)).status).toBe(401)
  })

  it('403s a resident recording a payment', async () => {
    setQueue([[RESIDENT]])
    expect((await post(paymentRoutes, '/', 'r1')).status).toBe(403)
  })
})
