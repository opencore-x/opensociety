import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, asc, desc, eq } from 'drizzle-orm'
import { accounts, journalEntries, journalLines } from '@opensociety/db'
import { manualJournalEntrySchema, journalSourceSchema } from '@opensociety/shared'
import { withDb, withAuth, requireRole, actingUserId } from '../middleware'
import { ensureChartOfAccounts } from '../lib/coa'
import { insertJournalEntry } from '../lib/ledger-posting'
import type { AppEnv } from '../types'

// Double-entry ledger admin API (#97). All routes are ADMIN-only.
export const ledgerRoutes = new Hono<AppEnv>()
ledgerRoutes.use('*', withDb)
ledgerRoutes.use('*', withAuth)
ledgerRoutes.use('*', requireRole('ADMIN'))

// Seed/repair the default chart of accounts. Idempotent — run once to switch
// accounting on for a society.
ledgerRoutes.post('/init', async (c) => {
  const result = await ensureChartOfAccounts(c.get('db'))
  return c.json(result, result.inserted > 0 ? 201 : 200)
})

// Chart of accounts, ordered by code.
ledgerRoutes.get('/accounts', async (c) => {
  const rows = await c.get('db').select().from(accounts).orderBy(asc(accounts.code))
  return c.json(rows)
})

// Post a manual/adjusting journal entry (contra, depreciation, opening balances).
// The body schema already enforces the balanced-entry invariant; insert double-
// checks server-side and rejects an unbalanced entry.
ledgerRoutes.post('/journal-entries', zValidator('json', manualJournalEntrySchema), async (c) => {
  const input = c.req.valid('json')
  const id = await insertJournalEntry(
    c.get('db'),
    {
      entryDate: input.entryDate,
      narration: input.narration,
      sourceType: 'MANUAL',
      sourceId: null,
      period: input.entryDate.slice(0, 7),
      lines: input.lines.map((l) => ({
        accountId: l.accountId,
        debit: l.debit,
        credit: l.credit,
        apartmentId: l.apartmentId ?? null,
        memo: l.memo ?? null,
      })),
    },
    actingUserId(c),
  )
  return c.json({ id }, 201)
})

// List journal entries, newest first. Optional ?period=YYYY-MM, ?sourceType=.
ledgerRoutes.get('/journal-entries', async (c) => {
  const db = c.get('db')
  const conds = []
  const period = c.req.query('period')
  if (period) conds.push(eq(journalEntries.period, period))
  const src = journalSourceSchema.safeParse(c.req.query('sourceType'))
  if (src.success) conds.push(eq(journalEntries.sourceType, src.data))
  const rows = await db
    .select()
    .from(journalEntries)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(journalEntries.entryDate), desc(journalEntries.createdAt))
    .limit(500)
  return c.json(rows)
})

// Account ledger drill-down: every line touching an account, chronological, with
// a running balance in the account's normal direction (debit-normal for
// ASSET/EXPENSE, credit-normal for LIABILITY/INCOME/FUND).
ledgerRoutes.get('/accounts/:id/ledger', async (c) => {
  const db = c.get('db')
  const id = c.req.param('id')
  const [acct] = await db.select().from(accounts).where(eq(accounts.id, id)).limit(1)
  if (!acct) return c.json({ error: 'not found' }, 404)

  const rows = await db
    .select({
      entryId: journalLines.entryId,
      debit: journalLines.debit,
      credit: journalLines.credit,
      memo: journalLines.memo,
      apartmentId: journalLines.apartmentId,
      entryDate: journalEntries.entryDate,
      narration: journalEntries.narration,
      sourceType: journalEntries.sourceType,
      sourceId: journalEntries.sourceId,
    })
    .from(journalLines)
    .innerJoin(journalEntries, eq(journalEntries.id, journalLines.entryId))
    .where(eq(journalLines.accountId, id))
    .orderBy(asc(journalEntries.entryDate), asc(journalEntries.createdAt))

  const sign = acct.type === 'ASSET' || acct.type === 'EXPENSE' ? 1 : -1
  let balance = 0
  const entries = rows.map((r) => {
    balance += sign * (r.debit - r.credit)
    return { ...r, balance }
  })
  return c.json({ account: acct, closingBalance: balance, entries })
})
