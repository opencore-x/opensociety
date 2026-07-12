import { z } from 'zod'
import type { UserRole } from './enums'
import { houseHelpTypeSchema, idProofTypeSchema } from './enums'

export const houseHelpSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  phone: z.string().nullable(),
  type: houseHelpTypeSchema,
  photoUrl: z.string().nullable(),
  idProofType: idProofTypeSchema.nullable(),
  idProofNumber: z.string().nullable(),
  idProofUrl: z.string().nullable(),
  isActive: z.boolean(),
  registeredBy: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createHouseHelpSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  type: houseHelpTypeSchema.default('OTHER'),
  photoUrl: z.string().url().optional(),
  idProofType: idProofTypeSchema.optional(),
  idProofNumber: z.string().optional(),
  idProofUrl: z.string().url().optional(),
})

export const updateHouseHelpSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  type: houseHelpTypeSchema.optional(),
  photoUrl: z.string().url().nullable().optional(),
  idProofType: idProofTypeSchema.nullable().optional(),
  idProofNumber: z.string().nullable().optional(),
  idProofUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
})

// A house help profile may be managed by an admin, or by the resident who
// registered it. Everyone else (other residents, guards) is read-only.
export function canManageHouseHelp(
  role: UserRole | undefined,
  registeredBy: string | null,
  actingUserId: string | undefined,
): boolean {
  if (role === 'ADMIN') return true
  if (role !== 'RESIDENT') return false
  return !!actingUserId && registeredBy === actingUserId
}

export type HouseHelp = z.infer<typeof houseHelpSchema>
export type CreateHouseHelp = z.infer<typeof createHouseHelpSchema>
export type UpdateHouseHelp = z.infer<typeof updateHouseHelpSchema>
