import { z } from 'zod'

export const societyConfigSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  pincode: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

// Single-tenant: one society per deployment, so this is an upsert of the single row.
export const updateSocietyConfigSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().regex(/^\d{6}$/, 'pincode must be 6 digits'),
})

export type SocietyConfig = z.infer<typeof societyConfigSchema>
export type UpdateSocietyConfig = z.infer<typeof updateSocietyConfigSchema>
