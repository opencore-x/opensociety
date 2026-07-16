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
export const noticeCategory = pgEnum('notice_category', [
  'GENERAL',
  'MAINTENANCE',
  'EVENT',
  'SECURITY',
  'BILLING',
  'EMERGENCY',
])
export const ticketStatus = pgEnum('ticket_status', [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
])
export const ticketCategory = pgEnum('ticket_category', [
  'PLUMBING',
  'ELECTRICAL',
  'CARPENTRY',
  'HOUSEKEEPING',
  'SECURITY',
  'OTHER',
])
export const ticketPriority = pgEnum('ticket_priority', ['LOW', 'NORMAL', 'HIGH', 'URGENT'])
export const houseHelpType = pgEnum('house_help_type', [
  'MAID',
  'COOK',
  'DRIVER',
  'NANNY',
  'GARDENER',
  'CARETAKER',
  'OTHER',
])
export const idProofType = pgEnum('id_proof_type', [
  'AADHAAR',
  'PAN',
  'VOTER_ID',
  'DRIVING_LICENSE',
  'PASSPORT',
  'OTHER',
])
export const vehicleType = pgEnum('vehicle_type', ['CAR', 'BIKE', 'SCOOTER', 'BICYCLE', 'OTHER'])
export const parkingSlotType = pgEnum('parking_slot_type', ['COVERED', 'OPEN'])
export const backgroundCheckStatus = pgEnum('background_check_status', ['PENDING', 'CLEARED', 'FLAGGED'])
export const billType = pgEnum('bill_type', ['MONTHLY', 'ONE_TIME'])
export const billStatus = pgEnum('bill_status', ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'])
export const paymentMethod = pgEnum('payment_method', ['CASH', 'CHEQUE', 'UPI', 'BANK_TRANSFER', 'ONLINE'])

// Double-entry ledger (#97). FUND = corpus/sinking/reserve (equity-like for a
// non-profit society).
export const accountType = pgEnum('account_type', ['ASSET', 'LIABILITY', 'INCOME', 'EXPENSE', 'FUND'])
export const journalSource = pgEnum('journal_source', [
  'BILL',
  'PAYMENT',
  'EXPENSE',
  'INTEREST',
  'WAIVER',
  'MANUAL',
  'OPENING',
  'ADJUSTMENT',
])

// Expense & vendor management (#94). TDS sections per the Income Tax Act;
// thresholds/rates are set by annual Finance Acts, so rates are parameterized on
// the entry, never hardcoded.
export const tdsSection = pgEnum('tds_section', ['SEC_194C', 'SEC_194J', 'SEC_194I'])
export const expenseStatus = pgEnum('expense_status', ['PAID', 'PAYABLE'])
