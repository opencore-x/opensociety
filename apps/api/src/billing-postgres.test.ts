import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { apartments, billLineItems, maintenanceBills, type Database } from '@opensociety/db'
import { generateMonthlyBills } from './lib/generate-bills'

const postgres = new PGlite()
const pg = drizzle(postgres)
const db = pg as unknown as Database
const options = {
  periodMonth: '2026-10', title: 'October maintenance', dueDate: new Date('2026-10-10T00:00:00Z'),
  lineItems: [{ description: 'Maintenance', amount: 10000, taxRatePct: 18 }],
}

beforeAll(async () => {
  const directory = new URL('../../../packages/db/drizzle/', import.meta.url)
  const journal = JSON.parse(readFileSync(new URL('meta/_journal.json', directory), 'utf8'))
  for (const entry of journal.entries) await postgres.exec(readFileSync(new URL(`${entry.tag}.sql`, directory), 'utf8'))
}, 30_000)
afterAll(async () => postgres.close())
beforeEach(async () => { await postgres.exec('TRUNCATE apartments CASCADE') })

it('generates complete monthly bills for 1,000 apartments and safely repeats a run', async () => {
  await pg.insert(apartments).values(Array.from({ length: 1000 }, (_, i) => ({ tower: 'A', apartmentNo: String(i + 1) })))
  await pg.insert(apartments).values({ tower: 'B', apartmentNo: '1', isActive: false })
  const result = await generateMonthlyBills(db, options)
  expect(result.created).toBe(1000)
  expect(result.skipped).toBe(0)
  const bills = await pg.select().from(maintenanceBills)
  expect(bills).toHaveLength(1000)
  expect(bills.every((bill) => bill.totalAmount === 11800 && bill.taxAmount === 1800)).toBe(true)
  expect(await pg.select().from(billLineItems)).toHaveLength(1000)
  expect(await generateMonthlyBills(db, options)).toEqual({ created: 0, skipped: 1000, billIds: [] })
}, 15_000)

it('allows only one bill when generation calls overlap', async () => {
  await pg.insert(apartments).values({ tower: 'A', apartmentNo: '1' })
  const runs = await Promise.all([generateMonthlyBills(db, options), generateMonthlyBills(db, options)])
  expect(runs.map((run) => run.created).sort()).toEqual([0, 1])
  expect(await pg.select().from(billLineItems)).toHaveLength(1)
})

it('rolls back the bill when a charge references a missing ledger account', async () => {
  await pg.insert(apartments).values({ tower: 'A', apartmentNo: '1' })
  await expect(generateMonthlyBills(db, {
    ...options, lineItems: [{ ...options.lineItems[0], accountId: randomUUID() }],
  })).rejects.toThrow()
  expect(await pg.select().from(maintenanceBills)).toHaveLength(0)
  expect(await pg.select().from(billLineItems)).toHaveLength(0)
  expect((await generateMonthlyBills(db, options)).created).toBe(1)
})

it('handles a society with no active apartments', async () => {
  expect(await generateMonthlyBills(db, options)).toEqual({ created: 0, skipped: 0, billIds: [] })
})
