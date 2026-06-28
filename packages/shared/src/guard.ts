import { z } from 'zod'

export const guardSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  phone: z.string().nullable(),
  employeeCode: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createGuardSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeCode: z.string().optional(),
  userId: z.string().uuid().optional(),
})

export const updateGuardSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().nullable().optional(),
  employeeCode: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

export type Guard = z.infer<typeof guardSchema>
export type CreateGuard = z.infer<typeof createGuardSchema>
export type UpdateGuard = z.infer<typeof updateGuardSchema>
