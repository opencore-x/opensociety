import { z } from 'zod'
import type { UserRole } from './enums'
import { vehicleTypeSchema } from './enums'

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  apartmentId: z.string().uuid(),
  registeredBy: z.string().uuid().nullable(),
  registrationNumber: z.string(),
  type: vehicleTypeSchema,
  make: z.string().nullable(),
  color: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createVehicleSchema = z.object({
  apartmentId: z.string().uuid(),
  registrationNumber: z.string().min(1),
  type: vehicleTypeSchema.default('CAR'),
  make: z.string().optional(),
  color: z.string().optional(),
})

export const updateVehicleSchema = z.object({
  registrationNumber: z.string().min(1).optional(),
  type: vehicleTypeSchema.optional(),
  make: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// Canonical plate form for storage/matching: upper-case, no spaces or hyphens.
export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '')
}

// A vehicle may be managed by an admin (any flat) or by a resident, but only
// for a flat they currently live in. `isResidentOfApartment` is resolved by the
// route against the target apartment.
export function canManageVehicle(role: UserRole | undefined, isResidentOfApartment: boolean): boolean {
  if (role === 'ADMIN') return true
  return role === 'RESIDENT' && isResidentOfApartment
}

export type Vehicle = z.infer<typeof vehicleSchema>
export type CreateVehicle = z.infer<typeof createVehicleSchema>
export type UpdateVehicle = z.infer<typeof updateVehicleSchema>
