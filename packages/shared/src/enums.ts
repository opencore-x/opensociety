import { z } from 'zod'

export const userRoleSchema = z.enum(['RESIDENT', 'GUARD', 'ADMIN', 'STAFF'])
export const userStatusSchema = z.enum(['PENDING', 'APPROVED', 'SUSPENDED'])
export const residencyRelationSchema = z.enum(['OWNER', 'TENANT', 'FAMILY'])
export const bhkTypeSchema = z.enum(['STUDIO', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'PENTHOUSE'])
export const visitorTypeSchema = z.enum(['GUEST', 'DELIVERY', 'SERVICE', 'CAB', 'OTHER'])
export const visitorStatusSchema = z.enum([
  'PENDING',
  'APPROVED',
  'DENIED',
  'ENTERED',
  'EXITED',
  'CANCELLED',
  'EXPIRED',
])
export const preApprovalTypeSchema = z.enum(['ALWAYS', 'SCHEDULED', 'ONE_TIME'])
export const noticePrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])

export type UserRole = z.infer<typeof userRoleSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type ResidencyRelation = z.infer<typeof residencyRelationSchema>
export type BhkType = z.infer<typeof bhkTypeSchema>
export type VisitorType = z.infer<typeof visitorTypeSchema>
export type VisitorStatus = z.infer<typeof visitorStatusSchema>
export type PreApprovalType = z.infer<typeof preApprovalTypeSchema>
export type NoticePriority = z.infer<typeof noticePrioritySchema>
