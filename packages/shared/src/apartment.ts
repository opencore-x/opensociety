import { z } from 'zod'
import { bhkTypeSchema } from './enums'

export const apartmentSchema = z.object({
  id: z.string().uuid(),
  tower: z.string(),
  apartmentNo: z.string(),
  floor: z.number().int().nullable(),
  bhkType: bhkTypeSchema.nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createApartmentSchema = z.object({
  tower: z.string().min(1),
  apartmentNo: z.string().min(1),
  floor: z.number().int().optional(),
  bhkType: bhkTypeSchema.optional(),
})

// Society setup imports apartments in bulk (CSV upload -> this payload).
export const createApartmentsBulkSchema = z.object({
  apartments: z.array(createApartmentSchema).min(1).max(5000),
})

// Admin edits a unit; all fields optional. floor/bhkType are nullable so they
// can be cleared. isActive toggles a soft deactivation.
export const updateApartmentSchema = z.object({
  tower: z.string().min(1).optional(),
  apartmentNo: z.string().min(1).optional(),
  floor: z.number().int().nullable().optional(),
  bhkType: bhkTypeSchema.nullable().optional(),
  isActive: z.boolean().optional(),
})

export type Apartment = z.infer<typeof apartmentSchema>
export type CreateApartment = z.infer<typeof createApartmentSchema>
export type CreateApartmentsBulk = z.infer<typeof createApartmentsBulkSchema>
export type UpdateApartment = z.infer<typeof updateApartmentSchema>
