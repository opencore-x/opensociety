import type { Database } from '@opensociety/db'
import { sql } from 'drizzle-orm'
import { computeBill, type BillLineInput } from '@opensociety/shared'

// The unique monthly index arbitrates concurrent admin/cron runs. Bills and
// their line items commit together, so a failed charge cannot leave an empty bill.
export async function generateMonthlyBills(
  db: Database,
  opts: { periodMonth: string; title: string; dueDate?: Date | null; lineItems: BillLineInput[]; createdBy?: string },
): Promise<{ created: number; skipped: number; billIds: string[] }> {
  if (!opts.lineItems.length) throw new Error('At least one bill line is required')
  const totals = computeBill(opts.lineItems)
  const lines = totals.lines.map((line) => ({
    description: line.description, amount: line.amount, tax_rate_pct: line.taxRatePct,
    tax_amount: line.taxAmount, account_id: line.accountId ?? null,
  }))
  const result = await db.execute<{ id: string | null; total: number }>(sql`
    with active as (select id from apartments where is_active = true),
    created as (
      insert into maintenance_bills (apartment_id, type, title, period_month, subtotal, tax_amount, total_amount, due_date, created_by)
      select id, 'MONTHLY', ${opts.title}, ${opts.periodMonth}, ${totals.subtotal}, ${totals.taxAmount}, ${totals.total},
        ${opts.dueDate?.toISOString() ?? null}::timestamp, ${opts.createdBy ?? null}::uuid from active
      on conflict (apartment_id, period_month) where type = 'MONTHLY' and period_month is not null do nothing
      returning id
    ), charges as (
      insert into bill_line_items (bill_id, description, amount, tax_rate_pct, tax_amount, account_id)
      select created.id, line.description, line.amount, line.tax_rate_pct, line.tax_amount, line.account_id
      from created cross join jsonb_to_recordset(${JSON.stringify(lines)}::jsonb)
        as line(description text, amount integer, tax_rate_pct integer, tax_amount integer, account_id uuid)
    )
    select created.id, (select count(*)::int from active) as total
    from (select 1) singleton left join created on true
  `)
  const billIds = result.rows.flatMap((row) => row.id ? [row.id] : [])
  return { created: billIds.length, skipped: Number(result.rows[0]?.total ?? 0) - billIds.length, billIds }
}
