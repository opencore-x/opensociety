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

const { vehicleRoutes } = await import('./routes/vehicles')
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const GUARD = { id: 'g1', role: 'GUARD', status: 'APPROVED' }
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
const get = (path: string, id?: string) => vehicleRoutes.request(path, { headers: id ? { 'x-user-id': id } : {} }, env)

beforeEach(() => setQueue([]))

describe('GET /vehicles/verify', () => {
  it('401s an unauthenticated request', async () => {
    expect((await get('/verify?plate=KA01AB1234')).status).toBe(401)
  })

  it('403s a resident (guard/admin only)', async () => {
    setQueue([[RESIDENT]]) // withAuth resolves the user; requireRole rejects
    expect((await get('/verify?plate=KA01AB1234', 'r1')).status).toBe(403)
  })

  it('400s without a plate', async () => {
    setQueue([[GUARD]])
    expect((await get('/verify', 'g1')).status).toBe(400)
  })

  it('flags an unknown plate (registered:false)', async () => {
    setQueue([[GUARD], []]) // user, no matching vehicle
    const res = await get('/verify?plate=XX00XX0000', 'g1')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ registered: false, vehicle: null, parkingSlots: [] })
  })

  it('returns owner flat + slots for a registered plate (and normalizes the input)', async () => {
    const match = {
      id: 'v1',
      registrationNumber: 'KA01AB1234',
      type: 'CAR',
      make: 'Honda',
      color: 'White',
      isActive: true,
      apartmentId: 'apt1',
      tower: 'A',
      apartmentNo: '101',
    }
    const slots = [{ slotNumber: 'B1-05', type: 'COVERED' }]
    setQueue([[GUARD], [match], slots]) // user, vehicle match, slots
    const res = await get('/verify?plate=ka 01 ab 1234', 'g1')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      plate: string
      registered: boolean
      vehicle: { apartment: string; registrationNumber: string } | null
      parkingSlots: unknown[]
    }
    expect(body).toMatchObject({ plate: 'KA01AB1234', registered: true, parkingSlots: slots })
    expect(body.vehicle).toMatchObject({ apartment: 'A-101', registrationNumber: 'KA01AB1234' })
  })
})
