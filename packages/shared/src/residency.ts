import { z } from 'zod'
import { residencyRelationSchema } from './enums'

export const residencySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  relation: residencyRelationSchema,
  isPrimary: z.boolean(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  createdAt: z.string(),
})

export const createResidencySchema = z.object({
  userId: z.string().uuid(),
  apartmentId: z.string().uuid(),
  relation: residencyRelationSchema.default('OWNER'),
  isPrimary: z.boolean().default(false),
})

export type Residency = z.infer<typeof residencySchema>
export type CreateResidency = z.infer<typeof createResidencySchema>
