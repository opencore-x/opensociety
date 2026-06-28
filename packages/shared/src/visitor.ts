import { z } from 'zod'
import { visitorTypeSchema, visitorStatusSchema, preApprovalTypeSchema } from './enums'

export const visitorEntrySchema = z.object({
  id: z.string().uuid(),
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
