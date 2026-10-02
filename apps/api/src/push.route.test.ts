import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { AppEnv } from './types'

const { state, fakeDb } = vi.hoisted(() => {
  const state = { user: { id: 'resident', status: 'APPROVED', role: 'RESIDENT' }, values: {}, where: undefined as unknown, updates: {} }
  const chain = (): unknown => new Proxy(function () {}, {
    get(_target, key) {
      if (key === 'then') return (resolve: (v: unknown) => void) => resolve([])
      if (key === 'limit') return async () => [state.user]
      if (key === 'values') return (v: object) => { state.values = v; return chain() }
      if (key === 'where') return (v: unknown) => { state.where = v; return chain() }
      if (key === 'onConflictDoUpdate') return (v: object) => { state.updates = v; return chain() }
      return () => chain()
    },
  })
  return { state, fakeDb: chain }
})
vi.mock('@opensociety/db', async (orig) => ({
  ...(await orig<typeof import('@opensociety/db')>()),
  createDb: () => fakeDb(),
}))
const { pushRoutes } = await import('./routes/push')
const token = 'ExponentPushToken[example_token]'
const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const request = (method: string, body: object, authenticated = true) => pushRoutes.request('/tokens', {
  method, headers: { 'content-type': 'application/json', ...(authenticated ? { 'x-user-id': 'resident' } : {}) },
  body: JSON.stringify(body),
}, env)

beforeEach(() => { state.user.status = 'APPROVED'; state.values = {}; state.updates = {} })

describe('push device registration', () => {
  it('requires authentication and resident approval', async () => {
    expect((await request('POST', { token, platform: 'ios' }, false)).status).toBe(401)
    state.user.status = 'PENDING'
    expect((await request('POST', { token, platform: 'ios' })).status).toBe(403)
  })
  it('validates Expo tokens and platforms', async () => {
    expect((await request('POST', { token: 'not-a-token', platform: 'ios' })).status).toBe(400)
    expect((await request('POST', { token, platform: 'web' })).status).toBe(400)
  })
  it('assigns the token to the authenticated user, including on account switches', async () => {
    expect((await request('POST', { token, platform: 'ios', userId: 'victim' })).status).toBe(200)
    expect(state.values).toMatchObject({ token, platform: 'ios', userId: 'resident' })
    expect(state.updates).toMatchObject({ set: { userId: 'resident', platform: 'ios' } })
  })
  it('only unregisters a token belonging to the current user', async () => {
    expect((await request('DELETE', { token, userId: 'victim' })).status).toBe(200)
    const query = new PgDialect().sqlToQuery(state.where as SQL)
    expect(query.sql).toContain('"push_devices"."user_id" =')
    expect(query.params).toEqual([token, 'resident'])
  })
})
