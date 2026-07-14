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
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const ADMIN = { id: 'a1', role: 'ADMIN', status: 'APPROVED' }
const as = (id?: string): { headers: Record<string, string> } => ({ headers: id ? { 'x-user-id': id } : {} })
const req = (path: string) => reportRoutes.request(path, as('r1'), env)

beforeEach(() => setQueue([]))

const ADMIN_ONLY = [
  '/finance',
  '/collection-analytics',
  '/visitor-trends',
  '/house-help-analytics',
  '/maintenance-analytics',
]

describe('reports routes — admin-only auth contract', () => {
  it('401s unauthenticated requests', async () => {
    const res = await reportRoutes.request('/finance', as(), env)
    expect(res.status).toBe(401)
  })

  it.each(ADMIN_ONLY)('403s a resident on %s', async (path) => {
    setQueue([[RESIDENT]]) // withAuth resolves the resident, then requireRole('ADMIN') rejects
    expect((await req(path)).status).toBe(403)
  })
})

describe('reports routes — handler', () => {
  it('admin GET /finance returns the report shape', async () => {
    // user, then billed/collected/methods queries all empty
    setQueue([[ADMIN], [], [], []])
    const res = await reportRoutes.request('/finance', as('a1'), env)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { byMonth: unknown[]; totalBilled: number; totalCollected: number }
    expect(body).toMatchObject({ byMonth: [], totalBilled: 0, totalCollected: 0 })
  })
})
