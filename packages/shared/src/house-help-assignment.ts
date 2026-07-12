import { z } from 'zod'
import type { UserRole } from './enums'

export const houseHelpAssignmentSchema = z.object({
  id: z.string().uuid(),
  houseHelpId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  assignedBy: z.string().uuid().nullable(),
  createdAt: z.string(),
})

export const createHouseHelpAssignmentSchema = z.object({
  apartmentId: z.string().uuid(),
})

// Assignments may be managed by an admin (any apartment) or by a resident, but
// only for an apartment they currently live in. `isResidentOfApartment` is the
// residency check the route resolves against the target apartment.
export function canManageHouseHelpAssignment(
  role: UserRole | undefined,
  isResidentOfApartment: boolean,
): boolean {
  if (role === 'ADMIN') return true
  return role === 'RESIDENT' && isResidentOfApartment
}

export type HouseHelpAssignment = z.infer<typeof houseHelpAssignmentSchema>
export type CreateHouseHelpAssignment = z.infer<typeof createHouseHelpAssignmentSchema>
