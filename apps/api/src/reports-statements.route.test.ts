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

const { reportRoutes } = await import('./routes/reports')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const get = (path: string, id?: string) => reportRoutes.request(path, { headers: id ? { 'x-user-id': id } : {} }, env)

beforeEach(() => setQueue([]))

describe('statutory statement reports — admin only', () => {
  it('403s a resident on /trial-balance', async () => {
    setQueue([[RESIDENT]])
    expect((await get('/trial-balance', 'r1')).status).toBe(403)
  })

  it('returns a (balanced, empty) trial balance for an admin', async () => {
    setQueue([[ADMIN], []]) // auth, then the account-balances aggregate -> []
    const res = await get('/trial-balance', 'a1')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ rows: [], totalDebit: 0, totalCredit: 0, balanced: true })
  })

  it('403s a resident on /balance-sheet', async () => {
    setQueue([[RESIDENT]])
    expect((await get('/balance-sheet', 'r1')).status).toBe(403)
  })

  it('serves a CSV download for ?format=csv', async () => {
    setQueue([[ADMIN], []]) // auth, then account balances
    const res = await get('/trial-balance?format=csv', 'a1')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/csv')
  })

  it('serves a PDF download for ?format=pdf', async () => {
    setQueue([[ADMIN], [], [{ name: 'Green Valley Heights' }]]) // auth, balances, society
    const res = await get('/balance-sheet?format=pdf', 'a1')
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('application/pdf')
  })
})
