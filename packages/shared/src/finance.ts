import { z } from 'zod'
import { billTypeSchema, billStatusSchema, paymentMethodSchema } from './enums'

// Money is integer paise (₹1 = 100 paise) everywhere.

export const billLineInputSchema = z.object({
  description: z.string().min(1),
  amount: z.number().int().nonnegative(),
  taxRatePct: z.number().int().min(0).max(100).default(0),
  // Optional income/fund account (chart-of-accounts id) this charge credits when
  // posted to the ledger; null/absent => default Maintenance Income head (#97).
  accountId: z.string().uuid().optional(),
})

export const generateBillsSchema = z.object({
  periodMonth: z.string().regex(/^\d{4}-\d{2}$/, 'expected YYYY-MM'),
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(billLineInputSchema).min(1),
})

export const createBillSchema = z.object({
  apartmentId: z.string().uuid(),
  title: z.string().min(1),
  dueDate: z.string().datetime().optional(),
  lineItems: z.array(billLineInputSchema).min(1),
})

export const recordPaymentSchema = z.object({
  billId: z.string().uuid(),
  amount: z.number().int().positive(),
  method: paymentMethodSchema,
  reference: z.string().optional(),
  notes: z.string().optional(),
  paidAt: z.string().datetime().optional(),
})

export const billLineItemSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  description: z.string(),
  amount: z.number(),
  taxRatePct: z.number(),
  taxAmount: z.number(),
  accountId: z.string().uuid().nullable().optional(),
  createdAt: z.string(),
})

export const maintenanceBillSchema = z.object({
  id: z.string().uuid(),
  apartmentId: z.string().uuid(),
  type: billTypeSchema,
  title: z.string(),
  periodMonth: z.string().nullable(),
  subtotal: z.number(),
  taxAmount: z.number(),
  totalAmount: z.number(),
  status: billStatusSchema,
  dueDate: z.string().nullable(),
  issuedAt: z.string(),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Enriched on some endpoints:
  paidAmount: z.number().optional(),
  apartment: z.string().nullable().optional(),
  lineItems: z.array(billLineItemSchema).optional(),
})

export const paymentSchema = z.object({
  id: z.string().uuid(),
  billId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  amount: z.number(),
  method: paymentMethodSchema,
  reference: z.string().nullable(),
  notes: z.string().nullable(),
  paidAt: z.string(),
  recordedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
})

export type BillLineInput = z.infer<typeof billLineInputSchema>
export type ComputedLine = BillLineInput & { taxAmount: number }
export type BillTotals = { lines: ComputedLine[]; subtotal: number; taxAmount: number; total: number }

// GST calc engine: per-line tax = round(amount * rate%), all integer paise;
// totals are the sums. Deterministic and safe to unit-test.
export function computeBill(items: BillLineInput[]): BillTotals {
  const lines = items.map((it) => ({ ...it, taxAmount: Math.round((it.amount * it.taxRatePct) / 100) }))
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)
  const taxAmount = lines.reduce((s, l) => s + l.taxAmount, 0)
  return { lines, subtotal, taxAmount, total: subtotal + taxAmount }
}

// Bill status derived from its total vs the amount paid so far.
export function billStatusFor(total: number, paid: number): 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' {
  if (paid <= 0) return 'ISSUED'
  if (paid >= total) return 'PAID'
  return 'PARTIALLY_PAID'
}

// Paise → "₹1,234.50" (Indian grouping).
export function formatPaise(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const rupees = Math.abs(paise) / 100
  return `${sign}₹${rupees.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const billConfigSchema = z.object({
  id: z.string().uuid(),
  dueDayOfMonth: z.number(),
  lineItems: z.array(billLineInputSchema),
  interestEnabled: z.boolean(),
  interestRatePct: z.number(),
  gracePeriodDays: z.number(),
  updatedBy: z.string().uuid().nullable(),
  updatedAt: z.string(),
})

export const updateBillConfigSchema = z.object({
  dueDayOfMonth: z.number().int().min(1).max(28).default(10),
  lineItems: z.array(billLineInputSchema),
  interestEnabled: z.boolean().default(false),
  interestRatePct: z.number().int().min(0).max(50).default(18),
  gracePeriodDays: z.number().int().min(0).max(90).default(15),
})

// 'YYYY-MM' for a Date (UTC).
export function periodMonthOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

// Due date (ISO) for a billing period + day-of-month; day is clamped to 1..28 so
// it's valid in every month.
export function dueDateForPeriod(periodMonth: string, dayOfMonth: number): string {
  const [y, m] = periodMonth.split('-').map(Number)
  const day = Math.min(Math.max(dayOfMonth, 1), 28)
  return new Date(Date.UTC(y, m - 1, day)).toISOString()
}

// ----- Interest on arrears (#95) -----

// Simple interest (never compound) on an overdue balance, in paise. Accrues from
// the due date + grace period up to `asOf`, at `ratePct` per annum. Returns 0
// when nothing is overdue, the rate is off, or we're still inside the grace
// window. Bye-law 71 caps this (≤21% legacy / ~12% revised MH) — the rate is
// always supplied by config, never assumed here.
export function computeInterest(
  outstanding: number,
  dueDateMs: number,
  asOfMs: number,
  ratePct: number,
  graceDays: number,
): number {
  if (outstanding <= 0 || ratePct <= 0) return 0
  const start = dueDateMs + Math.max(0, graceDays) * 86_400_000
  if (asOfMs <= start) return 0
  const days = Math.floor((asOfMs - start) / 86_400_000)
  if (days <= 0) return 0
  return Math.round((outstanding * ratePct * days) / (100 * 365))
}

// Total simple interest across an apartment's overdue bills (each with its own
// due date + remaining balance), as of `asOf`.
export function sumApartmentInterest(
  bills: { outstanding: number; dueDateMs: number }[],
  asOfMs: number,
  ratePct: number,
  graceDays: number,
): number {
  return bills.reduce((s, b) => s + computeInterest(b.outstanding, b.dueDateMs, asOfMs, ratePct, graceDays), 0)
}

// Title prefix marking auto-generated interest-on-arrears bills (#95), so they
// can be told apart from ordinary charges in statements/reports.
export const INTEREST_BILL_TITLE_PREFIX = 'Interest on arrears'

// ----- Per-flat statement of account (#96) -----

export type StatementEntryType = 'BILL' | 'INTEREST' | 'PAYMENT' | 'ADJUSTMENT'

export type StatementEntryInput = {
  date: string // ISO timestamp
  type: StatementEntryType
  description: string
  debit: number // paise (charges raise the balance)
  credit: number // paise (payments lower it)
  ref?: string | null // source bill/payment id
}

export type StatementEntry = StatementEntryInput & { balance: number }

export type Statement = {
  opening: number
  closing: number
  totalDebit: number
  totalCredit: number
  entries: StatementEntry[]
}

// Merge a flat's charges (debits) and payments (credits) into a dated,
// running-balance statement. Balance is debit-positive = amount the flat owes;
// closing = opening + Σdebit − Σcredit, which reconciles to outstanding dues.
// `opening` is the net balance carried in from before the statement window.
export function buildStatement(rows: StatementEntryInput[], opening = 0): Statement {
  const sorted = [...rows].sort((a, b) => a.date.localeCompare(b.date))
  let balance = opening
  let totalDebit = 0
  let totalCredit = 0
  const entries = sorted.map((r) => {
    balance += r.debit - r.credit
    totalDebit += r.debit
    totalCredit += r.credit
    return { ...r, balance }
  })
  return { opening, closing: balance, totalDebit, totalCredit, entries }
}

export type CollectionRow = { period: string; billed: number; collected: number }
export type MethodRow = { method: string; amount: number }
export type FinanceReport = {
  byMonth: CollectionRow[]
  byMethod: MethodRow[]
  totalBilled: number
  totalCollected: number
}

// Collection rate as a percentage with one decimal (0 when nothing is billed).
export function collectionRatePct(billed: number, collected: number): number {
  if (billed <= 0) return 0
  return Math.round((collected / billed) * 1000) / 10
}

// CSV of the monthly collection summary (rupees, no currency symbol).
export function collectionReportToCsv(rows: CollectionRow[]): string {
  const header = ['Period', 'Billed', 'Collected', 'Collection %']
  const lines = rows.map((r) =>
    [r.period, (r.billed / 100).toFixed(2), (r.collected / 100).toFixed(2), String(collectionRatePct(r.billed, r.collected))].join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

// ----- Collection analytics (#70) -----

export type TowerCollectionRow = { tower: string; billed: number; collected: number }

// CSV of tower-wise collection with the collection rate appended.
export function towerCollectionToCsv(rows: TowerCollectionRow[]): string {
  const header = ['Tower', 'Billed', 'Collected', 'Collection %']
  const lines = rows.map((r) =>
    [r.tower, (r.billed / 100).toFixed(2), (r.collected / 100).toFixed(2), String(collectionRatePct(r.billed, r.collected))].join(','),
  )
  return [header.join(','), ...lines].join('\n')
}

// Whole days between a bill's due date and when it was settled. Negative = paid
// early, 0 = on the due date, positive = paid late.
export function payerTimingDays(dueDateMs: number, paidAtMs: number): number {
  return Math.round((paidAtMs - dueDateMs) / 86_400_000)
}

export type PayerBucket = 'EARLY' | 'ON_TIME' | 'LATE'

export function payerBucket(days: number): PayerBucket {
  if (days < 0) return 'EARLY'
  if (days === 0) return 'ON_TIME'
  return 'LATE'
}

export interface PayerAnalytics {
  early: number
  onTime: number
  late: number
  outstanding: number // bills with a due date not yet fully paid
  fullyPaid: number
  avgDaysToPay: number | null // mean signed days (dueDate -> settled) over fully-paid bills
}

// Bucket every bill (that has a due date) by how promptly it was settled. A bill
// counts as fully paid when its payments cover the total and a settle date is
// known; otherwise it's outstanding.
export function analyzePayers(
  bills: { dueDateMs: number; total: number; paid: number; lastPaidAtMs: number | null }[],
): PayerAnalytics {
  const a: PayerAnalytics = { early: 0, onTime: 0, late: 0, outstanding: 0, fullyPaid: 0, avgDaysToPay: null }
  let daySum = 0
  for (const b of bills) {
    const settled = b.paid >= b.total && b.total > 0 && b.lastPaidAtMs != null
    if (!settled) {
      a.outstanding++
      continue
    }
    a.fullyPaid++
    const days = payerTimingDays(b.dueDateMs, b.lastPaidAtMs as number)
    daySum += days
    if (days < 0) a.early++
    else if (days === 0) a.onTime++
    else a.late++
  }
  if (a.fullyPaid > 0) a.avgDaysToPay = Math.round((daySum / a.fullyPaid) * 10) / 10
  return a
}

export type BillConfig = z.infer<typeof billConfigSchema>
export type UpdateBillConfig = z.infer<typeof updateBillConfigSchema>
export type GenerateBills = z.infer<typeof generateBillsSchema>
export type CreateBill = z.infer<typeof createBillSchema>
export type RecordPayment = z.infer<typeof recordPaymentSchema>
export type BillLineItem = z.infer<typeof billLineItemSchema>
export type MaintenanceBill = z.infer<typeof maintenanceBillSchema>
export type Payment = z.infer<typeof paymentSchema>
export type DuesRow = { apartmentId: string; apartment: string | null; billed: number; paid: number; outstanding: number }
