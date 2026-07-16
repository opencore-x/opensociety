import type { Database } from '@opensociety/db'
import { accounts } from '@opensociety/db'
import { eq } from 'drizzle-orm'
import { DEFAULT_CHART_OF_ACCOUNTS } from '@opensociety/shared'

// Idempotently seed the default chart of accounts (#97). Safe to call
// repeatedly: existing codes are left untouched, only missing accounts are
// inserted, and parent links are (re)resolved from parentCode.
export async function ensureChartOfAccounts(db: Database): Promise<{ inserted: number; total: number }> {
  const before = await db.select({ code: accounts.code }).from(accounts)
  const have = new Set(before.map((r) => r.code))
  const missing = DEFAULT_CHART_OF_ACCOUNTS.filter((a) => !have.has(a.code))
  if (missing.length) {
    await db
      .insert(accounts)
      .values(
        missing.map((a) => ({
          code: a.code,
          name: a.name,
          type: a.type,
          isGroup: a.isGroup ?? false,
          isMutual: a.isMutual ?? null,
        })),
      )
      .onConflictDoNothing()
  }

  const all = await db.select({ id: accounts.id, code: accounts.code, parentId: accounts.parentId }).from(accounts)
  const idByCode = new Map(all.map((r) => [r.code, r.id]))
  const parentByCode = new Map(all.map((r) => [r.code, r.parentId]))
  for (const a of DEFAULT_CHART_OF_ACCOUNTS) {
    if (!a.parentCode) continue
    const id = idByCode.get(a.code)
    const parentId = idByCode.get(a.parentCode)
    if (id && parentId && parentByCode.get(a.code) !== parentId) {
      await db.update(accounts).set({ parentId }).where(eq(accounts.id, id))
    }
  }
  return { inserted: missing.length, total: idByCode.size }
}
