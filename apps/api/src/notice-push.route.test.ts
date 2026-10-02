import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import type { AppEnv } from './types'

const { state, fakeDb } = vi.hoisted(() => {
  const state = { results: [] as unknown[][], recipients: [] as string[], message: {} as object, where: undefined as unknown }
  const chain = (): unknown => new Proxy(function () {}, { get(_t, key) {
    if (key === 'then') return (resolve: (v: unknown) => void) => resolve(state.results.shift() ?? [])
    if (key === 'where') return (v: unknown) => { state.where = v; return chain() }
    return () => chain()
  } })
  return { state, fakeDb: chain }
})
vi.mock('@opensociety/db', async (orig) => ({ ...(await orig<typeof import('@opensociety/db')>()), createDb: fakeDb }))
vi.mock('./lib/push-events', async (orig) => ({
  ...(await orig<typeof import('./lib/push-events')>()),
  notifyEvent: async (_c: unknown, _key: string, recipients: () => Promise<string[]>, message: object) => {
    state.recipients = await recipients(); state.message = message
  },
}))
const { noticeRoutes } = await import('./routes/notices')
const env = { DATABASE_URL: 'test' } as AppEnv['Bindings']
const admin = { id: 'admin', role: 'ADMIN', status: 'APPROVED' }
const post = (body: object) => noticeRoutes.request('/', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-user-id': 'admin' }, body: JSON.stringify(body),
}, env)
beforeEach(() => { state.recipients = []; state.message = {}; state.results = [] })

describe('notice publication notifications', () => {
  it('notifies residents with a bounded preview', async () => {
    state.results = [[admin], [{ id: 'notice', expiresAt: null }], [{ id: 'r1' }]]
    const res = await post({ title: 'Notice', body: 'x'.repeat(200) })
    expect(res.status).toBe(201)
    expect(state.recipients).toEqual(['r1'])
    expect(state.message).toEqual({ title: 'Notice', body: 'x'.repeat(150), data: { screen: 'notices' } })
  })
  it('targets only current resident memberships in the selected tower', async () => {
    state.results = [[admin], [{ id: 'notice', expiresAt: null }], [{ userId: 'r1' }]]
    expect((await post({ title: 'Notice', body: 'Water maintenance', notifyTower: ' A ' })).status).toBe(201)
    const q = new PgDialect().sqlToQuery(state.where as SQL)
    expect(q.params).toEqual(['A', 'RESIDENT'])
    expect(q.sql).toContain('"residencies"."end_date" is null')
    expect(state.recipients).toEqual(['r1'])
  })
  it('does not notify about notices that are already expired', async () => {
    state.results = [[admin], [{ id: 'notice', expiresAt: new Date(0) }]]
    expect((await post({ title: 'Old notice', body: 'Expired' })).status).toBe(201)
    expect(state.message).toEqual({})
  })
  it('prevents residents from publishing and triggering notifications', async () => {
    state.results = [[{ ...admin, role: 'RESIDENT' }]]
    expect((await post({ title: 'Notice', body: 'Body' })).status).toBe(403)
    expect(state.message).toEqual({})
  })
})
