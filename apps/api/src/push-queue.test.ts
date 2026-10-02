import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@opensociety/db'
import { PgDialect } from 'drizzle-orm/pg-core'
import type { SQL } from 'drizzle-orm'
import { enqueuePush, processPushQueue } from './lib/push-queue'

function fakeDb(results: unknown[][]) {
  const sets: Record<string, unknown>[] = []
  const queries: string[] = []
  const inserts: unknown[] = []
  const chain = (): unknown => new Proxy(function () {}, {
    get(_target, key) {
      if (key === 'then') return (resolve: (v: unknown) => void) => resolve(results.shift() ?? [])
      if (key === 'set') return (v: Record<string, unknown>) => { sets.push(v); return chain() }
      if (key === 'values') return (v: unknown) => { inserts.push(v); return chain() }
      if (key === 'where') return (v: SQL) => { queries.push(new PgDialect().sqlToQuery(v).sql); return chain() }
      return () => chain()
    },
  })
  return { db: chain() as Database, sets, queries, inserts }
}
const now = new Date('2026-10-02T00:00:00Z')
const message = { title: 'OpenSociety', body: 'Open the app', data: { screen: 'visitors' } }
const row = {
  id: 'delivery', token: 'ExpoPushToken[token]', userId: 'resident', message,
  attempts: 1, ticketId: null, nextAttemptAt: new Date(now.getTime() + 60_000),
  expiresAt: new Date(now.getTime() + 86400_000), createdAt: now,
}
afterEach(() => vi.unstubAllGlobals())

describe('push delivery queue', () => {
  it('drops queued messages when the device changes accounts', async () => {
    const { db, sets } = fakeDb([[row], [{ token: row.token, userId: 'someone-else' }], [], []])
    const fetcher = vi.fn()
    vi.stubGlobal('fetch', fetcher)
    await processPushQueue(db, undefined, now)
    expect(fetcher).not.toHaveBeenCalled()
    expect(sets).toContainEqual(expect.objectContaining({ status: 'failed', lastError: 'recipient_or_payload_changed' }))
  })
  it('claims a locked batch and records tickets separately from delivery', async () => {
    const { db, sets, queries } = fakeDb([[row], [{ token: row.token, userId: row.userId }], [], []])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [{ status: 'ok', id: 'ticket' }] })))
    await processPushQueue(db, undefined, now)
    expect(queries[0]).toContain('for update skip locked')
    expect(sets).toContainEqual(expect.objectContaining({ status: 'receipt', ticketId: 'ticket' }))
    expect(sets).not.toContainEqual(expect.objectContaining({ status: 'delivered' }))
  })
  it('backs off transient failures and stops retrying after five attempts', async () => {
    for (const attempts of [1, 5]) {
      const { db, sets } = fakeDb([[{ ...row, attempts }], [{ token: row.token, userId: row.userId }], []])
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
      await processPushQueue(db, undefined, now)
      expect(sets).toContainEqual(expect.objectContaining({ status: attempts === 5 ? 'failed' : 'queued', lastError: 'expo_http_503' }))
    }
  })
  it('marks a notification delivered only after a successful receipt', async () => {
    const { db, sets } = fakeDb([[], [{ ...row, status: 'receipt', ticketId: 'ticket' }], []])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { ticket: { status: 'ok' } } })))
    await processPushQueue(db, undefined, now)
    expect(sets).toContainEqual(expect.objectContaining({ status: 'delivered', ticketId: 'ticket' }))
  })
  it('does no work for empty recipients and validates notification payloads', async () => {
    const { db, inserts } = fakeDb([])
    await enqueuePush(db, [], 'event', { ...message, data: { screen: 'visitors' } }, now)
    expect(inserts).toEqual([])
    await expect(enqueuePush(db, ['resident'], 'event', { title: '', body: 'body', data: { screen: 'visitors' } }, now)).rejects.toThrow()
  })
})
