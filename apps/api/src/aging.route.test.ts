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

describe('GET /reports/aging', () => {
  it('403s a resident', async () => {
    setQueue([[RESIDENT]])
    expect((await get('/aging', 'r1')).status).toBe(403)
  })

  it('buckets outstanding bills by age for an admin', async () => {
    const asOf = '2026-03-31'
    const due = (n: number) => new Date(Date.UTC(2026, 2, 31) - n * 86_400_000).toISOString()
    setQueue([
      [ADMIN],
      [
        { apartmentId: 'apt1', tower: 'A', apartmentNo: '101', total: 10000, dueDate: due(10), paid: 0 }, // 0-30
        { apartmentId: 'apt2', tower: 'B', apartmentNo: '201', total: 50000, dueDate: due(120), paid: 10000 }, // 90+ (40000)
      ],
    ])
    const res = await get(`/aging?asOf=${asOf}`, 'a1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      buckets: Record<string, number>
      total: number
      byApartment: { apartment: string; outstanding: number }[]
    }
    expect(body.buckets).toEqual({ '0-30': 10000, '31-60': 0, '61-90': 0, '90+': 40000 })
    expect(body.total).toBe(50000)
    expect(body.byApartment[0]).toMatchObject({ apartment: 'B-201', outstanding: 40000 })
  })
})
