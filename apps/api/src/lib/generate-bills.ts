import type { Database } from '@opensociety/db'
import { maintenanceBills, billLineItems, apartments } from '@opensociety/db'
import { eq } from 'drizzle-orm'
import { computeBill, type BillLineInput } from '@opensociety/shared'

// Generate a monthly bill (the same line items) for every active flat that does
// not already have one for `periodMonth`. Idempotent per period. Shared by the
// admin generate route and the monthly cron.
export async function generateMonthlyBills(
  db: Database,
  opts: { periodMonth: string; title: string; dueDate?: Date | null; lineItems: BillLineInput[]; createdBy?: string },
): Promise<{ created: number; skipped: number; billIds: string[] }> {
  const totals = computeBill(opts.lineItems)
  const flats = await db.select({ id: apartments.id }).from(apartments).where(eq(apartments.isActive, true))
  const existing = await db
    .select({ apartmentId: maintenanceBills.apartmentId })
    .from(maintenanceBills)
    .where(eq(maintenanceBills.periodMonth, opts.periodMonth))
  const already = new Set(existing.map((r) => r.apartmentId))
  const targets = flats.filter((f) => !already.has(f.id))
  if (targets.length === 0) return { created: 0, skipped: flats.length, billIds: [] }

  const created = await db
    .insert(maintenanceBills)
    .values(
      targets.map((f) => ({
        apartmentId: f.id,
        type: 'MONTHLY' as const,
        title: opts.title,
        periodMonth: opts.periodMonth,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.total,
        dueDate: opts.dueDate ?? null,
        createdBy: opts.createdBy,
      })),
    )
    .returning({ id: maintenanceBills.id })

  await db.insert(billLineItems).values(
    created.flatMap((b) =>
      totals.lines.map((l) => ({
        billId: b.id,
        description: l.description,
        amount: l.amount,
        taxRatePct: l.taxRatePct,
        taxAmount: l.taxAmount,
        accountId: l.accountId ?? null,
      })),
    ),
  )
  return { created: created.length, skipped: already.size, billIds: created.map((b) => b.id) }
}
