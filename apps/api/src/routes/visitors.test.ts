import { describe, it, expect } from 'vitest'
import type { Context } from 'hono'
import type { VisitorStatus } from '@opensociety/shared'
import type { Database } from '@opensociety/db'
import { applyTransition } from './visitors'
import type { AppEnv } from '../types'

type Entry = { id: string; status: VisitorStatus }

// Fake Drizzle client serving one visitor entry. The select chain returns the
// entry; the update chain echoes it merged with the set values.
function fakeDb(entry?: Entry): Database {
  let setVals: Record<string, unknown> = {}
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: async () => (entry ? [entry] : []),
    update: () => chain,
    set: (v: Record<string, unknown>) => {
      setVals = v
      return chain
    },
    returning: async () => (entry ? [{ ...entry, ...setVals }] : []),
  }
  return chain as unknown as Database
}

// Minimal Context capturing the json(body, status) response.
function fakeCtx(db: Database, id: string) {
  return {
    get: (k: string) => (k === 'db' ? db : undefined),
    req: { param: () => id },
    json: (body: unknown, status = 200) => ({ body, status }),
  } as unknown as Context<AppEnv>
}

async function run(entry: Entry | undefined, action: Parameters<typeof applyTransition>[1], extra = {}) {
  return (await applyTransition(fakeCtx(fakeDb(entry), entry?.id ?? 'missing'), action, extra)) as unknown as {
    body: { status?: VisitorStatus; error?: string }
    status: number
  }
}

describe('applyTransition', () => {
  it('404s when the entry does not exist', async () => {
    const res = await run(undefined, 'approve')
    expect(res.status).toBe(404)
  })

  it('approves a PENDING entry', async () => {
    const res = await run({ id: 'v1', status: 'PENDING' }, 'approve')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
  })

  it('409s approving a non-PENDING entry', async () => {
    const res = await run({ id: 'v1', status: 'EXITED' }, 'approve')
    expect(res.status).toBe(409)
    expect(res.body.error).toMatch(/EXITED/)
  })

  it('checks in an APPROVED entry but 409s a PENDING one', async () => {
    expect((await run({ id: 'v1', status: 'APPROVED' }, 'checkin')).status).toBe(200)
    expect((await run({ id: 'v1', status: 'PENDING' }, 'checkin')).status).toBe(409)
  })

  it('checks out an ENTERED entry but 409s one that never entered', async () => {
    const ok = await run({ id: 'v1', status: 'ENTERED' }, 'checkout')
    expect(ok.status).toBe(200)
    expect(ok.body.status).toBe('EXITED')
    expect((await run({ id: 'v1', status: 'APPROVED' }, 'checkout')).status).toBe(409)
  })

  it('denies a PENDING entry but 409s an already-approved one', async () => {
    expect((await run({ id: 'v1', status: 'PENDING' }, 'deny')).status).toBe(200)
    expect((await run({ id: 'v1', status: 'APPROVED' }, 'deny')).status).toBe(409)
  })
})
