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
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const req = (path: string, id: string | undefined, method = 'GET') =>
  billRoutes.request(path, { method, headers: id ? { 'x-user-id': id } : {} }, env)

beforeEach(() => setQueue([]))

describe('interest routes — admin only', () => {
  it('403s a resident on POST /apply-interest', async () => {
    setQueue([[RESIDENT]])
    expect((await req('/apply-interest', 'r1', 'POST')).status).toBe(403)
  })

  it('400s apply-interest when interest is disabled in config', async () => {
    setQueue([[ADMIN], [{ id: 'c1', interestEnabled: false, interestRatePct: 18, gracePeriodDays: 15 }]])
    const res = await req('/apply-interest', 'a1', 'POST')
    expect(res.status).toBe(400)
  })

  it('returns an empty preview when no config exists', async () => {
    setQueue([[ADMIN], []])
    const res = await req('/interest-preview', 'a1')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ enabled: false, rows: [] })
  })

  it('403s a resident on POST /:id/cancel', async () => {
    setQueue([[RESIDENT]])
    expect((await req('/some-bill-id/cancel', 'r1', 'POST')).status).toBe(403)
  })
})
