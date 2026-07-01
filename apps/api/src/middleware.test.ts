import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import type { Database } from '@opensociety/db'
import type { UserRole, UserStatus } from '@opensociety/shared'
import { withAuth, requireAuth, requireRole } from './middleware'
import type { AppEnv } from './types'

type ActingUser = { id: string; role: UserRole; status: UserStatus }

// Fake Drizzle client: the select().from().where().limit() chain resolves to the
// preset user (or [] when none), which is all withAuth's lookup needs.
function fakeDb(user?: ActingUser): Database {
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (user ? [user] : []),
  }
  return chain as unknown as Database
}

// App exercising the guards: /open needs any auth, /admin needs ADMIN,
// /gate needs GUARD or ADMIN. The db is injected so withAuth resolves `user`.
function buildApp(user?: ActingUser) {
  const app = new Hono<AppEnv>()
  app.use('*', async (c, next) => {
    c.set('db', fakeDb(user))
    await next()
  })
  app.use('*', withAuth)
  app.get('/open', requireAuth, (c) => c.json({ ok: true }))
  app.get('/admin', requireRole('ADMIN'), (c) => c.json({ ok: true }))
  app.get('/gate', requireRole('GUARD', 'ADMIN'), (c) => c.json({ ok: true }))
  return app
}

const env = {} as AppEnv['Bindings'] // no CLERK_SECRET_KEY -> dev x-user-id path
const asUser = (id: string) => ({ headers: { 'x-user-id': id } })

describe('requireAuth', () => {
  it('401s when no acting user is present', async () => {
    const res = await buildApp().request('/open', {}, env)
    expect(res.status).toBe(401)
  })

  it('401s when the header resolves to no user row', async () => {
    const res = await buildApp(undefined).request('/open', asUser('ghost'), env)
    expect(res.status).toBe(401)
  })

  it('passes an authenticated user through', async () => {
    const app = buildApp({ id: 'u1', role: 'RESIDENT', status: 'APPROVED' })
    const res = await app.request('/open', asUser('u1'), env)
    expect(res.status).toBe(200)
  })
})

describe('requireRole', () => {
  it('403s an authenticated but under-privileged user', async () => {
    const app = buildApp({ id: 'u1', role: 'RESIDENT', status: 'APPROVED' })
    const res = await app.request('/admin', asUser('u1'), env)
    expect(res.status).toBe(403)
  })

  it('401s an unauthenticated request', async () => {
    const res = await buildApp().request('/admin', {}, env)
    expect(res.status).toBe(401)
  })

  it('allows the matching role', async () => {
    const app = buildApp({ id: 'a1', role: 'ADMIN', status: 'APPROVED' })
    const res = await app.request('/admin', asUser('a1'), env)
    expect(res.status).toBe(200)
  })

  it('allows any role in the permitted set', async () => {
    const app = buildApp({ id: 'g1', role: 'GUARD', status: 'APPROVED' })
    const res = await app.request('/gate', asUser('g1'), env)
    expect(res.status).toBe(200)
  })

  it('rejects a role outside the permitted set', async () => {
    const app = buildApp({ id: 'r1', role: 'RESIDENT', status: 'APPROVED' })
    const res = await app.request('/gate', asUser('r1'), env)
    expect(res.status).toBe(403)
  })
})
