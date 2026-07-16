import { z } from 'zod'
import { paymentMethodSchema, tdsSectionSchema, expenseStatusSchema } from './enums'

// Expense & vendor contracts (#94). Money is integer paise.

// TDS withheld = round(base * rate%). `base` is the expense value excluding GST
// (TDS is deducted on the invoice value, not the tax). Rates/thresholds are set
// by the annual Finance Act, so `ratePct` is always supplied, never assumed.
export function computeTds(base: number, ratePct: number): number {
  if (base <= 0 || ratePct <= 0) return 0
  return Math.round((base * ratePct) / 100)
}

// Indicative default rates for the UI only (verify against the current Finance
// Act). NOT used for computation — the caller passes the actual rate.
export const TDS_SECTION_INFO: Record<z.infer<typeof tdsSectionSchema>, { label: string; typicalRatePct: number }> = {
  SEC_194C: { label: '194C — Contractors', typicalRatePct: 2 },
  SEC_194J: { label: '194J — Professional/Technical', typicalRatePct: 10 },
  SEC_194I: { label: '194I — Rent', typicalRatePct: 10 },
}

export const createVendorSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional(),
  pan: z.string().optional(),
  gstin: z.string().optional(),
  contact: z.string().optional(),
  bankAccount: z.string().optional(),
})

export const updateVendorSchema = createVendorSchema.partial().extend({ isActive: z.boolean().optional() })

export const tdsInputSchema = z.object({
  section: tdsSectionSchema,
  ratePct: z.number().int().min(0).max(100),
})

export const createExpenseSchema = z.object({
  vendorId: z.string().uuid().nullable().optional(),
  accountId: z.string().uuid(),
  amount: z.number().int().positive(),
  taxAmount: z.number().int().nonnegative().default(0),
  status: expenseStatusSchema.default('PAID'),
  description: z.string().min(1),
  billRef: z.string().optional(),
  method: paymentMethodSchema.nullable().optional(),
  paidAt: z.string().datetime().optional(),
  attachmentUrl: z.string().optional(),
  tds: tdsInputSchema.optional(),
})

export const vendorSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  category: z.string().nullable(),
  pan: z.string().nullable(),
  gstin: z.string().nullable(),
  contact: z.string().nullable(),
  bankAccount: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export const expenseSchema = z.object({
  id: z.string().uuid(),
  vendorId: z.string().uuid().nullable(),
  accountId: z.string().uuid(),
  amount: z.number(),
  taxAmount: z.number(),
  status: expenseStatusSchema,
  description: z.string(),
  billRef: z.string().nullable(),
  method: paymentMethodSchema.nullable(),
  paidAt: z.string().nullable(),
  attachmentUrl: z.string().nullable(),
  recordedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  // Enriched on list endpoints:
  vendor: z.string().nullable().optional(),
  account: z.string().optional(),
  tdsAmount: z.number().optional(),
})

export type CreateVendor = z.infer<typeof createVendorSchema>
export type UpdateVendor = z.infer<typeof updateVendorSchema>
export type CreateExpense = z.infer<typeof createExpenseSchema>
export type Vendor = z.infer<typeof vendorSchema>
export type Expense = z.infer<typeof expenseSchema>
export type TdsInput = z.infer<typeof tdsInputSchema>
