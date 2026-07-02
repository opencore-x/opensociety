import { describe, it, expect } from 'vitest'
import type { Context } from 'hono'
import type { VisitorStatus, UserRole } from '@opensociety/shared'
import { residencies, type Database } from '@opensociety/db'
import { applyTransition } from './visitors'
import type { AppEnv } from '../types'

type Entry = { id: string; status: VisitorStatus; apartmentId?: string }
type Auth = { userId?: string; userRole?: UserRole }

// Fake Drizzle client serving one visitor entry plus a residency lookup. The
// entry select returns the entry; a select from `residencies` returns
// `residencyRows`; the update chain echoes the entry merged with set values.
function fakeDb(entry?: Entry, residencyRows: unknown[] = []): Database {
  let setVals: Record<string, unknown> = {}
  let table: unknown
  const chain = {
    select: () => chain,
    from: (t: unknown) => {
      table = t
      return chain
    },
    where: () => chain,
    limit: async () => (table === residencies ? residencyRows : entry ? [entry] : []),
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
function fakeCtx(db: Database, id: string, auth: Auth = {}) {
  return {
    get: (k: string) =>
      k === 'db' ? db : k === 'userId' ? auth.userId : k === 'userRole' ? auth.userRole : undefined,
    req: { param: () => id },
    json: (body: unknown, status = 200) => ({ body, status }),
  } as unknown as Context<AppEnv>
}

async function run(
  entry: Entry | undefined,
  action: Parameters<typeof applyTransition>[1],
  extra = {},
  opts: { residencyRows?: unknown[]; auth?: Auth } = {},
) {
  const ctx = fakeCtx(fakeDb(entry, opts.residencyRows ?? []), entry?.id ?? 'missing', opts.auth)
  return (await applyTransition(ctx, action, extra)) as unknown as {
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

describe('applyTransition — resident apartment ownership', () => {
  const resident: Auth = { userId: 'u1', userRole: 'RESIDENT' }
  const entry: Entry = { id: 'v1', status: 'PENDING', apartmentId: 'apt-x' }

  it('403s a resident approving a visitor for an apartment they do not live in', async () => {
    const res = await run(entry, 'approve', {}, { auth: resident, residencyRows: [] })
    expect(res.status).toBe(403)
    expect(res.body.error).toMatch(/resident/i)
  })

  it('lets a resident approve a visitor for their own apartment', async () => {
    const res = await run(entry, 'approve', {}, { auth: resident, residencyRows: [{ id: 'r1' }] })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('APPROVED')
  })

  it('403s a resident denying a visitor for someone else’s apartment', async () => {
    const res = await run(entry, 'deny', {}, { auth: resident, residencyRows: [] })
    expect(res.status).toBe(403)
  })

  it('lets an admin approve regardless of residency', async () => {
    const res = await run(entry, 'approve', {}, { auth: { userId: 'a1', userRole: 'ADMIN' }, residencyRows: [] })
    expect(res.status).toBe(200)
  })

  it('does not apply the ownership check to guard check-in', async () => {
    const res = await run(
      { id: 'v1', status: 'APPROVED', apartmentId: 'apt-x' },
      'checkin',
      {},
      { auth: { userId: 'g1', userRole: 'GUARD' }, residencyRows: [] },
    )
    expect(res.status).toBe(200)
  })
})
