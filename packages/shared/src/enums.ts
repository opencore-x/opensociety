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
export const noticeCategorySchema = z.enum([
  'GENERAL',
  'MAINTENANCE',
  'EVENT',
  'SECURITY',
  'BILLING',
  'EMERGENCY',
])
export const ticketStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED'])
export const ticketCategorySchema = z.enum([
  'PLUMBING',
  'ELECTRICAL',
  'CARPENTRY',
  'HOUSEKEEPING',
  'SECURITY',
  'OTHER',
])
export const ticketPrioritySchema = z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export const houseHelpTypeSchema = z.enum([
  'MAID',
  'COOK',
  'DRIVER',
  'NANNY',
  'GARDENER',
  'CARETAKER',
  'OTHER',
])
export const idProofTypeSchema = z.enum([
  'AADHAAR',
  'PAN',
  'VOTER_ID',
  'DRIVING_LICENSE',
  'PASSPORT',
  'OTHER',
])
export const vehicleTypeSchema = z.enum(['CAR', 'BIKE', 'SCOOTER', 'BICYCLE', 'OTHER'])
export const parkingSlotTypeSchema = z.enum(['COVERED', 'OPEN'])
export const billTypeSchema = z.enum(['MONTHLY', 'ONE_TIME'])
export const billStatusSchema = z.enum(['ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'])
export const paymentMethodSchema = z.enum(['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'ONLINE'])

export type UserRole = z.infer<typeof userRoleSchema>
export type UserStatus = z.infer<typeof userStatusSchema>
export type ResidencyRelation = z.infer<typeof residencyRelationSchema>
export type BhkType = z.infer<typeof bhkTypeSchema>
export type VisitorType = z.infer<typeof visitorTypeSchema>
export type VisitorStatus = z.infer<typeof visitorStatusSchema>
export type PreApprovalType = z.infer<typeof preApprovalTypeSchema>
export type NoticePriority = z.infer<typeof noticePrioritySchema>
export type NoticeCategory = z.infer<typeof noticeCategorySchema>
export type TicketStatus = z.infer<typeof ticketStatusSchema>
export type TicketCategory = z.infer<typeof ticketCategorySchema>
export type TicketPriority = z.infer<typeof ticketPrioritySchema>
export type HouseHelpType = z.infer<typeof houseHelpTypeSchema>
export type IdProofType = z.infer<typeof idProofTypeSchema>
export type VehicleType = z.infer<typeof vehicleTypeSchema>
export type ParkingSlotType = z.infer<typeof parkingSlotTypeSchema>
export type BillType = z.infer<typeof billTypeSchema>
export type BillStatus = z.infer<typeof billStatusSchema>
export type PaymentMethod = z.infer<typeof paymentMethodSchema>
