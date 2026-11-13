import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { eq } from 'drizzle-orm'
import { apartments, maintenanceBills, payments, pushDeliveries, pushDevices, users, type Database } from '@opensociety/db'
import { enqueuePush, processPushQueue } from './lib/push-queue'

const postgres = new PGlite()
const pg = drizzle(postgres)
// PGlite executes the actual PostgreSQL migrations and claim/settlement SQL.
// Production's Neon batch API uses the same transactional behavior over HTTP.
const db = Object.assign(pg, {
  batch: (queries: { toSQL(): { sql: string; params: unknown[] } }[]) => postgres.transaction(async (tx) => {
    for (const query of queries) {
      const { sql, params } = query.toSQL()
      await tx.query(sql, params)
    }
    return []
  }),
}) as unknown as Database
const resident = randomUUID()
const another = randomUUID()
const token = 'ExpoPushToken[postgres-test]'
const message = { title: 'Test event', body: 'Open the app', data: { screen: 'visitors' as const } }
let now: Date
const fetcher = vi.fn()

beforeAll(async () => {
  await postgres.exec("SET TIME ZONE 'UTC'")
  const directory = new URL('../../../packages/db/drizzle/', import.meta.url)
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', directory), 'utf8'))
  for (const entry of journal.entries) await postgres.exec(readFileSync(new URL(`${entry.tag}.sql`, directory), 'utf8'))
}, 30_000)
afterAll(async () => postgres.close())
beforeEach(async () => {
  await postgres.exec('TRUNCATE users, apartments CASCADE')
  await pg.insert(users).values([
    { id: resident, clerkId: 'resident', name: 'Resident', status: 'APPROVED' },
    { id: another, clerkId: 'another', name: 'Another', status: 'APPROVED' },
  ])
  await pg.insert(pushDevices).values({ token, userId: resident, platform: 'ios', updatedAt: new Date(Date.now() - 60_000) })
  now = new Date(Date.now() + 60_000)
  fetcher.mockReset().mockImplementation(async (url: string, init: RequestInit) => {
    const input = JSON.parse(init.body as string)
    return Response.json({ data: url.includes('getReceipts')
      ? Object.fromEntries(input.ids.map((id: string) => [id, { status: 'ok' }]))
      : input.map(() => ({ status: 'ok', id: randomUUID() })) })
  })
  vi.stubGlobal('fetch', fetcher)
})
afterEach(() => vi.unstubAllGlobals())

describe('push delivery with PostgreSQL', () => {
  it('deduplicates an event and settles only after its receipt becomes due', async () => {
    await enqueuePush(db, [resident], 'event', message)
    await enqueuePush(db, [resident], 'event', message)
    await processPushQueue(db, undefined, now)
    let rows = await pg.select().from(pushDeliveries)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ status: 'receipt', attempts: 1 })
    await processPushQueue(db, undefined, now)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await processPushQueue(db, undefined, new Date(now.getTime() + 16 * 60_000))
    rows = await pg.select().from(pushDeliveries)
    expect(rows[0].status).toBe('delivered')
  })
  it('claims each notification once when dispatchers overlap', async () => {
    await enqueuePush(db, [resident], 'event', message)
    await Promise.all([processPushQueue(db, undefined, now), processPushQueue(db, undefined, now)])
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect((await pg.select().from(pushDeliveries))[0].attempts).toBe(1)
  })
  it('drains 101 recipients in two Expo requests and settles every ticket', async () => {
    await pg.insert(pushDevices).values(Array.from({ length: 100 }, (_, i) => ({ token: `ExpoPushToken[device-${i}]`, userId: resident, platform: 'android' })))
    await enqueuePush(db, [resident], 'broadcast', { ...message, data: { screen: 'notices' } })
    await processPushQueue(db, undefined, now)
    expect(fetcher.mock.calls.map((call) => JSON.parse(call[1].body).length)).toEqual([100, 1])
    expect((await pg.select().from(pushDeliveries)).every((row) => row.status === 'receipt')).toBe(true)
  })
  it('does not send a former account’s queued message to a reassigned device', async () => {
    await enqueuePush(db, [resident], 'event', message)
    await pg.update(pushDevices).set({ userId: another }).where(eq(pushDevices.token, token))
    await processPushQueue(db, undefined, now)
    expect(fetcher).not.toHaveBeenCalled()
    expect((await pg.select().from(pushDeliveries))[0].lastError).toBe('recipient_or_payload_changed')
  })
  it('removes a dead token and its queued deliveries after the Expo receipt', async () => {
    await enqueuePush(db, [resident], 'event', message)
    await processPushQueue(db, undefined, now)
    const [delivery] = await pg.select().from(pushDeliveries)
    fetcher.mockResolvedValueOnce(Response.json({ data: { [delivery.ticketId!]: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }))
    await processPushQueue(db, undefined, new Date(now.getTime() + 16 * 60_000))
    expect(await pg.select().from(pushDevices)).toEqual([])
    expect(await pg.select().from(pushDeliveries)).toEqual([])
  })
  it('preserves a token refreshed after an older delivery failed', async () => {
    await enqueuePush(db, [resident], 'event', message)
    await processPushQueue(db, undefined, now)
    const [delivery] = await pg.select().from(pushDeliveries)
    await pg.update(pushDevices).set({ updatedAt: now }).where(eq(pushDevices.token, token))
    fetcher.mockResolvedValueOnce(Response.json({ data: { [delivery.ticketId!]: { status: 'error', details: { error: 'DeviceNotRegistered' } } } }))
    await processPushQueue(db, undefined, new Date(now.getTime() + 16 * 60_000))
    expect(await pg.select().from(pushDevices)).toHaveLength(1)
    expect((await pg.select().from(pushDeliveries))[0].status).toBe('failed')
  })
  it('does not retry transient failures before their backoff expires', async () => {
    await enqueuePush(db, [resident], 'event', message)
    fetcher.mockResolvedValueOnce(new Response('', { status: 503 }))
    await processPushQueue(db, undefined, now)
    expect((await pg.select().from(pushDeliveries))[0].status).toBe('queued')
    await processPushQueue(db, undefined, now)
    expect(fetcher).toHaveBeenCalledTimes(1)
    await processPushQueue(db, undefined, new Date(now.getTime() + 60_000))
    expect(fetcher).toHaveBeenCalledTimes(2)
    expect((await pg.select().from(pushDeliveries))[0]).toMatchObject({ status: 'receipt', attempts: 2 })
  })
  it('drops reminders paid in full after enqueueing, even before a status update', async () => {
    const [apartment] = await pg.insert(apartments).values({ tower: 'A', apartmentNo: '1' }).returning()
    const [bill] = await pg.insert(maintenanceBills).values({ apartmentId: apartment.id, title: 'Maintenance', totalAmount: 50000 }).returning()
    await enqueuePush(db, [resident], `bill:${bill.id}:reminder:2026-10-02`, { ...message, data: { screen: 'bills' } })
    await pg.insert(payments).values({ billId: bill.id, apartmentId: apartment.id, amount: 50000, method: 'CASH' })
    await processPushQueue(db, undefined, now)
    expect(fetcher).not.toHaveBeenCalled()
    expect((await pg.select().from(pushDeliveries))[0].lastError).toBe('bill_no_longer_payable')
  })
})
