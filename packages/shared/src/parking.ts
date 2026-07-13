import { z } from 'zod'
import type { UserRole, ParkingSlotType } from './enums'
import { parkingSlotTypeSchema } from './enums'

export const parkingSlotSchema = z.object({
  id: z.string().uuid(),
  slotNumber: z.string(),
  type: parkingSlotTypeSchema,
  apartmentId: z.string().uuid().nullable(),
  isTemporary: z.boolean(),
  assignedUntil: z.string().nullable(),
  assignedBy: z.string().uuid().nullable(),
  assignedAt: z.string().nullable(),
  notes: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createParkingSlotSchema = z.object({
  slotNumber: z.string().min(1),
  type: parkingSlotTypeSchema.default('OPEN'),
  notes: z.string().optional(),
})

export const updateParkingSlotSchema = z.object({
  slotNumber: z.string().min(1).optional(),
  type: parkingSlotTypeSchema.optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
})

// Allocate (or, with apartmentId null, release) a slot. A temporary allocation
// carries an assignedUntil after which the slot reads as available again.
export const assignParkingSlotSchema = z
  .object({
    apartmentId: z.string().uuid().nullable(),
    isTemporary: z.boolean().default(false),
    assignedUntil: z.string().datetime().nullable().default(null),
  })
  .refine((v) => !(v.apartmentId === null && v.isTemporary), {
    message: 'cannot release a slot as a temporary assignment',
    path: ['isTemporary'],
  })
  .refine((v) => !(v.isTemporary && v.assignedUntil === null), {
    message: 'a temporary assignment needs an assignedUntil',
    path: ['assignedUntil'],
  })

// Canonical slot label for storage/matching: upper-case, single-spaced, trimmed.
export function normalizeSlotNumber(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, ' ')
}

// Only admins manage the parking inventory.
export function canManageParking(role: UserRole | undefined): boolean {
  return role === 'ADMIN'
}

export type ParkingSlotStatus = 'AVAILABLE' | 'ASSIGNED' | 'TEMPORARY' | 'INACTIVE'

// Effective status of a slot right now. An inactive slot is INACTIVE regardless
// of assignment; a temporary assignment whose window has lapsed reads AVAILABLE.
export function parkingSlotStatus(
  slot: {
    isActive: boolean
    apartmentId: string | null
    isTemporary: boolean
    assignedUntilMs: number | null
  },
  nowMs: number,
): ParkingSlotStatus {
  if (!slot.isActive) return 'INACTIVE'
  if (slot.apartmentId === null) return 'AVAILABLE'
  if (slot.isTemporary && slot.assignedUntilMs != null && slot.assignedUntilMs < nowMs) return 'AVAILABLE'
  return slot.isTemporary ? 'TEMPORARY' : 'ASSIGNED'
}

export interface ParkingSummary {
  total: number
  active: number
  covered: number
  open: number
  available: number
  assigned: number
  temporary: number
  inactive: number
}

// Roll a slot list up into directory counts (using the effective status above).
export function summarizeParking(
  slots: {
    isActive: boolean
    type: ParkingSlotType
    apartmentId: string | null
    isTemporary: boolean
    assignedUntilMs: number | null
  }[],
  nowMs: number,
): ParkingSummary {
  const s: ParkingSummary = {
    total: slots.length,
    active: 0,
    covered: 0,
    open: 0,
    available: 0,
    assigned: 0,
    temporary: 0,
    inactive: 0,
  }
  for (const slot of slots) {
    if (slot.isActive) {
      s.active++
      if (slot.type === 'COVERED') s.covered++
      else s.open++
    }
    const status = parkingSlotStatus(slot, nowMs)
    if (status === 'AVAILABLE') s.available++
    else if (status === 'ASSIGNED') s.assigned++
    else if (status === 'TEMPORARY') s.temporary++
    else s.inactive++
  }
  return s
}

export type ParkingSlot = z.infer<typeof parkingSlotSchema>
export type CreateParkingSlot = z.infer<typeof createParkingSlotSchema>
export type UpdateParkingSlot = z.infer<typeof updateParkingSlotSchema>
export type AssignParkingSlot = z.infer<typeof assignParkingSlotSchema>
