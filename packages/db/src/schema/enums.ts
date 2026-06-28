import { pgEnum } from 'drizzle-orm/pg-core'

export const userRole = pgEnum('user_role', ['RESIDENT', 'GUARD', 'ADMIN', 'STAFF'])
export const userStatus = pgEnum('user_status', ['PENDING', 'APPROVED', 'SUSPENDED'])
export const residencyRelation = pgEnum('residency_relation', ['OWNER', 'TENANT', 'FAMILY'])
export const bhkType = pgEnum('bhk_type', ['STUDIO', '1BHK', '2BHK', '3BHK', '4BHK', '5BHK', 'PENTHOUSE'])
export const visitorType = pgEnum('visitor_type', ['GUEST', 'DELIVERY', 'SERVICE', 'CAB', 'OTHER'])
export const visitorStatus = pgEnum('visitor_status', [
  'PENDING',
  'APPROVED',
  'DENIED',
  'ENTERED',
  'EXITED',
  'CANCELLED',
  'EXPIRED',
])
export const preApprovalType = pgEnum('pre_approval_type', ['ALWAYS', 'SCHEDULED', 'ONE_TIME'])
export const noticePriority = pgEnum('notice_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT'])
