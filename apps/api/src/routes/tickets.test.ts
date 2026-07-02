import { describe, it, expect } from 'vitest'
import type { Context } from 'hono'
import type { TicketStatus } from '@opensociety/shared'
import type { Database } from '@opensociety/db'
import { applyTicketTransition } from './tickets'
import type { AppEnv } from '../types'

type Ticket = { id: string; status: TicketStatus }

// Fake Drizzle client serving one ticket: the select returns it, the update
// chain echoes the ticket merged with the set values.
function fakeDb(ticket?: Ticket): Database {
  let setVals: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (ticket ? [ticket] : []),
    update: () => chain,
    set: (v: Record<string, unknown>) => {
      setVals = v
      return chain
    },
    returning: async () => (ticket ? [{ ...ticket, ...setVals }] : []),
  }
  return chain as unknown as Database
}

function fakeCtx(db: Database, id: string) {
  return {
    get: (k: string) => (k === 'db' ? db : undefined),
    req: { param: () => id },
    json: (body: unknown, status = 200) => ({ body, status }),
  } as unknown as Context<AppEnv>
}

async function run(
  ticket: Ticket | undefined,
  action: Parameters<typeof applyTicketTransition>[1],
  extra = {},
) {
  const ctx = fakeCtx(fakeDb(ticket), ticket?.id ?? 'missing')
  return (await applyTicketTransition(ctx, action, extra)) as unknown as {
    body: { status?: TicketStatus; error?: string; resolutionNote?: string }
    status: number
  }
}

describe('applyTicketTransition', () => {
  it('404s when the ticket does not exist', async () => {
    expect((await run(undefined, 'start')).status).toBe(404)
  })

  it('starts an OPEN ticket', async () => {
    const res = await run({ id: 't1', status: 'OPEN' }, 'start')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('IN_PROGRESS')
  })

  it('409s starting a RESOLVED ticket', async () => {
    const res = await run({ id: 't1', status: 'RESOLVED' }, 'start')
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/RESOLVED/)
  })

  it('resolves an IN_PROGRESS ticket and applies the extra set values', async () => {
    const res = await run({ id: 't1', status: 'IN_PROGRESS' }, 'resolve', { resolutionNote: 'done' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('RESOLVED')
    expect(res.body.resolutionNote).toBe('done')
  })

  it('closes and reopens a RESOLVED ticket but 409s closing an OPEN one', async () => {
    expect((await run({ id: 't1', status: 'RESOLVED' }, 'close')).body.status).toBe('CLOSED')
    expect((await run({ id: 't1', status: 'RESOLVED' }, 'reopen')).body.status).toBe('IN_PROGRESS')
    expect((await run({ id: 't1', status: 'OPEN' }, 'close')).status).toBe(409)
  })

  it('cancels OPEN or IN_PROGRESS but 409s cancelling a terminal ticket', async () => {
    expect((await run({ id: 't1', status: 'OPEN' }, 'cancel')).body.status).toBe('CANCELLED')
    expect((await run({ id: 't1', status: 'IN_PROGRESS' }, 'cancel')).body.status).toBe('CANCELLED')
    expect((await run({ id: 't1', status: 'CLOSED' }, 'cancel')).status).toBe(409)
  })
})
