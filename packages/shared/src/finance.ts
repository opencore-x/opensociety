import { z } from 'zod'
import { billTypeSchema, billStatusSchema, paymentMethodSchema } from './enums'

// Money is integer paise (₹1 = 100 paise) everywhere.

export const billLineInputSchema = z.object({
  description: z.string().min(1),
  amount: z.number().int().nonnegative(),
  taxRatePct: z.number().int().min(0).max(100).default(0),
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

export type GenerateBills = z.infer<typeof generateBillsSchema>
export type CreateBill = z.infer<typeof createBillSchema>
export type RecordPayment = z.infer<typeof recordPaymentSchema>
export type BillLineItem = z.infer<typeof billLineItemSchema>
export type MaintenanceBill = z.infer<typeof maintenanceBillSchema>
export type Payment = z.infer<typeof paymentSchema>
export type DuesRow = { apartmentId: string; apartment: string | null; billed: number; paid: number; outstanding: number }
