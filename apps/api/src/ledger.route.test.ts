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

const { ledgerRoutes } = await import('./routes/ledger')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const A = '00000000-0000-0000-0000-000000000001'
const B = '00000000-0000-0000-0000-000000000002'
const jsonReq = (path: string, id: string | undefined, body: unknown, method = 'POST') =>
  ledgerRoutes.request(
    path,
    {
      method,
      headers: { 'content-type': 'application/json', ...(id ? { 'x-user-id': id } : {}) },
      body: JSON.stringify(body),
    },
    env,
  )

beforeEach(() => setQueue([]))

describe('ledger routes — admin only', () => {
  it('401s an unauthenticated GET /accounts', async () => {
    expect((await ledgerRoutes.request('/accounts', {}, env)).status).toBe(401)
  })

  it('403s a resident on GET /accounts', async () => {
    setQueue([[RESIDENT]])
    expect((await ledgerRoutes.request('/accounts', { headers: { 'x-user-id': 'r1' } }, env)).status).toBe(403)
  })

  it('403s a resident on POST /init', async () => {
    setQueue([[RESIDENT]])
    expect((await jsonReq('/init', 'r1', {})).status).toBe(403)
  })
})

describe('POST /journal-entries — balanced-entry guard', () => {
  it('403s a resident', async () => {
    setQueue([[RESIDENT]])
    const res = await jsonReq('/journal-entries', 'r1', {
      entryDate: '2026-07-10',
      narration: 'x',
      lines: [
        { accountId: A, debit: 100, credit: 0 },
        { accountId: B, debit: 0, credit: 100 },
      ],
    })
    expect(res.status).toBe(403)
  })

  it('400s an unbalanced entry from an admin', async () => {
    setQueue([[ADMIN]])
    const res = await jsonReq('/journal-entries', 'a1', {
      entryDate: '2026-07-10',
      narration: 'bad',
      lines: [
        { accountId: A, debit: 100, credit: 0 },
        { accountId: B, debit: 0, credit: 90 },
      ],
    })
    expect(res.status).toBe(400)
  })

  it('201s a balanced entry from an admin', async () => {
    setQueue([[ADMIN], [{ id: 'entry-1' }]])
    const res = await jsonReq('/journal-entries', 'a1', {
      entryDate: '2026-07-10',
      narration: 'Opening balance',
      lines: [
        { accountId: A, debit: 100000, credit: 0 },
        { accountId: B, debit: 0, credit: 100000 },
      ],
    })
    expect(res.status).toBe(201)
    expect(await res.json()).toEqual({ id: 'entry-1' })
  })
})
