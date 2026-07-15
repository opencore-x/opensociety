import { z } from 'zod'
import { visitorTypeSchema, visitorStatusSchema, preApprovalTypeSchema } from './enums'
import type { PreApprovalType } from './enums'

export const visitorEntrySchema = z.object({
  id: z.string().uuid(),
  // Idempotency key from the offline queue; null for entries created online.
  clientId: z.string().uuid().nullable(),
  apartmentId: z.string().uuid(),
  preApprovalId: z.string().uuid().nullable(),
  visitorName: z.string(),
  visitorPhone: z.string().nullable(),
  type: visitorTypeSchema,
  status: visitorStatusSchema,
  purpose: z.string().nullable(),
  vehicleNumber: z.string().nullable(),
  photoUrl: z.string().nullable(),
  approvedBy: z.string().uuid().nullable(),
  deniedReason: z.string().nullable(),
  checkInBy: z.string().uuid().nullable(),
  checkOutBy: z.string().uuid().nullable(),
  checkInAt: z.string().nullable(),
  checkOutAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Resident raises a visitor request (PENDING until approved).
export const createVisitorEntrySchema = z.object({
  apartmentId: z.string().uuid(),
  visitorName: z.string().min(1),
  visitorPhone: z.string().optional(),
  type: visitorTypeSchema.default('GUEST'),
  purpose: z.string().optional(),
  vehicleNumber: z.string().optional(),
  // Idempotency key set by the offline queue so a replayed registration dedupes
  // to a single entry server-side instead of creating duplicates.
  clientId: z.string().uuid().optional(),
})

export const denyVisitorSchema = z.object({ reason: z.string().min(1) })

// Guard action at the gate.
export const checkInVisitorSchema = z.object({
  guardId: z.string().uuid().optional(),
  photoUrl: z.string().url().optional(),
  vehicleNumber: z.string().optional(),
})

export const visitorPreApprovalSchema = z.object({
  id: z.string().uuid(),
  apartmentId: z.string().uuid(),
  createdBy: z.string().uuid(),
  visitorName: z.string(),
  visitorPhone: z.string().nullable(),
  approvalType: preApprovalTypeSchema,
  code: z.string(),
  validFrom: z.string(),
  validUntil: z.string().nullable(),
  maxUses: z.number().int().nullable(),
  useCount: z.number().int(),
  isActive: z.boolean(),
  createdAt: z.string(),
})

export const createPreApprovalSchema = z.object({
  apartmentId: z.string().uuid(),
  visitorName: z.string().min(1),
  visitorPhone: z.string().optional(),
  approvalType: preApprovalTypeSchema.default('ONE_TIME'),
  validUntil: z.string().datetime().optional(),
  maxUses: z.number().int().positive().optional(),
})

// Guard redeems a pre-approval code at the gate.
export const redeemPreApprovalSchema = z.object({
  code: z.string().min(1),
  guardId: z.string().uuid().optional(),
})

export type VisitorEntry = z.infer<typeof visitorEntrySchema>
export type CreateVisitorEntry = z.infer<typeof createVisitorEntrySchema>
export type DenyVisitor = z.infer<typeof denyVisitorSchema>
export type CheckInVisitor = z.infer<typeof checkInVisitorSchema>
export type VisitorPreApproval = z.infer<typeof visitorPreApprovalSchema>
export type CreatePreApproval = z.infer<typeof createPreApprovalSchema>
export type RedeemPreApproval = z.infer<typeof redeemPreApprovalSchema>

// Pre-approval QR: the QR encodes the redeemable code behind a namespace prefix
// so the guard scanner can recognize our codes and ignore unrelated QRs.
export const PRE_APPROVAL_QR_PREFIX = 'OS-PA:'

// The string to encode in a resident's pre-approval QR.
export function preApprovalQrValue(code: string): string {
  return `${PRE_APPROVAL_QR_PREFIX}${code.trim().toUpperCase()}`
}

// Extract a redeemable code from a scanned QR value. Accepts our prefixed form
// (`OS-PA:CODE`), a URL carrying a `code` query param, or a bare code — returns
// the normalized code, or null when it doesn't look like a pre-approval code.
export function parsePreApprovalQrValue(scanned: string): string | null {
  let candidate = scanned.trim()
  if (candidate === '') return null
  if (candidate.toUpperCase().startsWith(PRE_APPROVAL_QR_PREFIX)) {
    candidate = candidate.slice(PRE_APPROVAL_QR_PREFIX.length)
  } else if (/[?&]code=/i.test(candidate)) {
    const match = candidate.match(/[?&]code=([^&\s]+)/i)
    candidate = match ? match[1] : ''
  }
  candidate = candidate.trim().toUpperCase()
  return /^[A-Z0-9]{6,16}$/.test(candidate) ? candidate : null
}

export type PreApprovalRedeemError = 'invalid or inactive code' | 'code expired' | 'code exhausted'

// Whether a pre-approval code can be redeemed right now — returns the failure
// reason (also used as the API error message) or null when redeemable.
// ONE_TIME codes are single-use regardless of maxUses.
export function preApprovalRedeemError(
  pa: {
    isActive: boolean
    approvalType: PreApprovalType
    validUntilMs: number | null
    maxUses: number | null
    useCount: number
  },
  nowMs: number,
): PreApprovalRedeemError | null {
  if (!pa.isActive) return 'invalid or inactive code'
  if (pa.validUntilMs != null && pa.validUntilMs < nowMs) return 'code expired'
  const effectiveMax = pa.approvalType === 'ONE_TIME' ? 1 : pa.maxUses
  if (effectiveMax != null && pa.useCount >= effectiveMax) return 'code exhausted'
  return null
}

// Quote a CSV cell only when it contains a comma, quote, or newline.
function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// CSV export of a resident's visitor log (one row per entry).
export function visitorEntriesToCsv(rows: VisitorEntry[]): string {
  const header = ['Name', 'Phone', 'Type', 'Status', 'Vehicle', 'Checked in', 'Checked out', 'Created']
  const lines = rows.map((r) =>
    [
      r.visitorName,
      r.visitorPhone ?? '',
      r.type,
      r.status,
      r.vehicleNumber ?? '',
      r.checkInAt ?? '',
      r.checkOutAt ?? '',
      r.createdAt,
    ]
      .map((cell) => csvCell(String(cell)))
      .join(','),
  )
  return [header.join(','), ...lines].join('\n')
}
