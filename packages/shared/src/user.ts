import { z } from 'zod'
import { userRoleSchema, userStatusSchema, residencyRelationSchema } from './enums'

export const userSchema = z.object({
  id: z.string().uuid(),
  clerkId: z.string(),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  name: z.string(),
  role: userRoleSchema,
  status: userStatusSchema,
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const updateUserRoleSchema = z.object({ role: userRoleSchema })

// Admin approves a PENDING user and links them to an apartment in one step.
export const approveUserSchema = z.object({
  apartmentId: z.string().uuid(),
  relation: residencyRelationSchema.default('OWNER'),
  isPrimary: z.boolean().default(true),
})

export type User = z.infer<typeof userSchema>
export type UpdateUserRole = z.infer<typeof updateUserRoleSchema>
export type ApproveUser = z.infer<typeof approveUserSchema>
