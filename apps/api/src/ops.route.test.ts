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

const { vehicleRoutes } = await import('./routes/vehicles')
const { noticeRoutes } = await import('./routes/notices')
const { guardRoutes } = await import('./routes/guards')
const { uploadRoutes } = await import('./routes/uploads')
import type { Hono } from 'hono'
import type { AppEnv } from './types'

const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const RESIDENT = { id: 'r1', role: 'RESIDENT', status: 'APPROVED' }
type R = Hono<AppEnv>
const call = (routes: R, path: string, method: string, id?: string) =>
  routes.request(
    path,
    { method, headers: id ? { 'x-user-id': id, 'content-type': 'application/json' } : {}, body: method === 'GET' ? undefined : '{}' },
    env,
  )

beforeEach(() => setQueue([]))

describe('unauthenticated requests are rejected (401)', () => {
  it.each([
    ['vehicles GET /', () => call(vehicleRoutes, '/', 'GET')],
    ['notices GET /', () => call(noticeRoutes, '/', 'GET')],
    ['guards GET /', () => call(guardRoutes, '/', 'GET')],
    ['uploads POST /', () => call(uploadRoutes, '/', 'POST')],
  ])('%s', async (_label, run) => {
    expect((await run()).status).toBe(401)
  })
})

describe('role gates reject a resident (403)', () => {
  const cases: [string, R, string, string][] = [
    ['vehicles GET /gate-log (admin/guard)', vehicleRoutes, '/gate-log', 'GET'],
    ['notices POST / (admin)', noticeRoutes, '/', 'POST'],
    ['notices GET /:id/reads (admin)', noticeRoutes, '/n1/reads', 'GET'],
    ['guards POST / (admin)', guardRoutes, '/', 'POST'],
    ['guards PATCH /:id (admin)', guardRoutes, '/g1', 'PATCH'],
    ['guards POST /:id/duty/clock-in (guard/admin)', guardRoutes, '/g1/duty/clock-in', 'POST'],
    ['guards GET /:id/devices (admin)', guardRoutes, '/g1/devices', 'GET'],
  ]

  it.each(cases)('%s', async (_label, routes, path, method) => {
    setQueue([[RESIDENT]]) // withAuth resolves the resident; requireRole rejects
    expect((await call(routes, path, method, 'r1')).status).toBe(403)
  })
})
