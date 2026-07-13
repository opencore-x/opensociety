import { describe, it, expect } from 'vitest'
import {
  normalizeSlotNumber,
  canManageParking,
  parkingSlotStatus,
  summarizeParking,
  assignParkingSlotSchema,
  isVisitorSlotFree,
  nextFreeVisitorSlot,
  visitorParkingSummary,
} from '@opensociety/shared'
import type { ParkingSlotType } from '@opensociety/shared'

const NOW = 1_000_000

function slot(overrides: {
  isActive?: boolean
  type?: ParkingSlotType
  apartmentId?: string | null
  isTemporary?: boolean
  assignedUntilMs?: number | null
}) {
  return {
    isActive: true,
    type: 'OPEN' as ParkingSlotType,
    apartmentId: null,
    isTemporary: false,
    assignedUntilMs: null,
    ...overrides,
  }
}

describe('normalizeSlotNumber', () => {
  it('trims, upper-cases and collapses whitespace', () => {
    expect(normalizeSlotNumber('  b1 05 ')).toBe('B1 05')
    expect(normalizeSlotNumber('p-12')).toBe('P-12')
    expect(normalizeSlotNumber('a\t 7')).toBe('A 7')
  })
})

describe('canManageParking', () => {
  it('only admins manage parking', () => {
    expect(canManageParking('ADMIN')).toBe(true)
    expect(canManageParking('RESIDENT')).toBe(false)
    expect(canManageParking('GUARD')).toBe(false)
    expect(canManageParking(undefined)).toBe(false)
  })
})

describe('parkingSlotStatus', () => {
  it('reports AVAILABLE for an unassigned active slot', () => {
    expect(parkingSlotStatus(slot({ apartmentId: null }), NOW)).toBe('AVAILABLE')
  })

  it('reports ASSIGNED for a permanent allocation', () => {
    expect(parkingSlotStatus(slot({ apartmentId: 'a', isTemporary: false }), NOW)).toBe('ASSIGNED')
  })

  it('reports TEMPORARY while the window is open', () => {
    expect(
      parkingSlotStatus(slot({ apartmentId: 'a', isTemporary: true, assignedUntilMs: NOW + 1 }), NOW),
    ).toBe('TEMPORARY')
  })

  it('reports AVAILABLE once a temporary window has lapsed', () => {
    expect(
      parkingSlotStatus(slot({ apartmentId: 'a', isTemporary: true, assignedUntilMs: NOW - 1 }), NOW),
    ).toBe('AVAILABLE')
  })

  it('reports INACTIVE regardless of assignment', () => {
    expect(parkingSlotStatus(slot({ isActive: false, apartmentId: 'a' }), NOW)).toBe('INACTIVE')
  })

  it('treats a temporary allocation with no expiry as still TEMPORARY', () => {
    expect(
      parkingSlotStatus(slot({ apartmentId: 'a', isTemporary: true, assignedUntilMs: null }), NOW),
    ).toBe('TEMPORARY')
  })
})

describe('summarizeParking', () => {
  it('rolls slots up into directory counts', () => {
    const s = summarizeParking(
      [
        slot({ type: 'COVERED', apartmentId: 'a' }), // covered, assigned
        slot({ type: 'OPEN', apartmentId: null }), // open, available
        slot({ type: 'OPEN', apartmentId: 'b', isTemporary: true, assignedUntilMs: NOW + 1 }), // temp
        slot({ type: 'COVERED', apartmentId: 'c', isTemporary: true, assignedUntilMs: NOW - 1 }), // lapsed -> available
        slot({ type: 'OPEN', isActive: false, apartmentId: 'd' }), // inactive
      ],
      NOW,
    )
    expect(s.total).toBe(5)
    expect(s.active).toBe(4)
    expect(s.covered).toBe(2)
    expect(s.open).toBe(2)
    expect(s.available).toBe(2)
    expect(s.assigned).toBe(1)
    expect(s.temporary).toBe(1)
    expect(s.inactive).toBe(1)
  })
})

describe('visitor parking pool', () => {
  const vslot = (o: { isActive?: boolean; isVisitor?: boolean; occupiedByEntryId?: string | null; slotNumber?: string }) => ({
    isActive: true,
    isVisitor: true,
    occupiedByEntryId: null,
    slotNumber: 'V-1',
    ...o,
  })

  it('isVisitorSlotFree only for active, unoccupied visitor slots', () => {
    expect(isVisitorSlotFree(vslot({}))).toBe(true)
    expect(isVisitorSlotFree(vslot({ occupiedByEntryId: 'e1' }))).toBe(false)
    expect(isVisitorSlotFree(vslot({ isActive: false }))).toBe(false)
    expect(isVisitorSlotFree(vslot({ isVisitor: false }))).toBe(false)
  })

  it('nextFreeVisitorSlot returns the first free slot in order, else null', () => {
    const slots = [
      vslot({ slotNumber: 'V-1', occupiedByEntryId: 'e1' }),
      vslot({ slotNumber: 'V-2' }),
      vslot({ slotNumber: 'V-3' }),
    ]
    expect(nextFreeVisitorSlot(slots)?.slotNumber).toBe('V-2')
    const full = [vslot({ slotNumber: 'V-1', occupiedByEntryId: 'e1' }), vslot({ slotNumber: 'V-2', occupiedByEntryId: 'e2' })]
    expect(nextFreeVisitorSlot(full)).toBeNull()
  })

  it('visitorParkingSummary counts only active visitor slots and flags full', () => {
    const s = visitorParkingSummary([
      vslot({ occupiedByEntryId: 'e1' }),
      vslot({}),
      vslot({ isActive: false }), // ignored
      { isActive: true, isVisitor: false, occupiedByEntryId: null }, // resident slot, ignored
    ])
    expect(s).toEqual({ total: 2, occupied: 1, available: 1, isFull: false })

    const full = visitorParkingSummary([vslot({ occupiedByEntryId: 'e1' }), vslot({ occupiedByEntryId: 'e2' })])
    expect(full).toEqual({ total: 2, occupied: 2, available: 0, isFull: true })

    expect(visitorParkingSummary([])).toEqual({ total: 0, occupied: 0, available: 0, isFull: false })
  })
})

describe('assignParkingSlotSchema', () => {
  it('accepts a permanent allocation', () => {
    expect(
      assignParkingSlotSchema.safeParse({ apartmentId: '11111111-1111-1111-1111-111111111111' }).success,
    ).toBe(true)
  })

  it('accepts a release (apartmentId null)', () => {
    expect(assignParkingSlotSchema.safeParse({ apartmentId: null }).success).toBe(true)
  })

  it('accepts a temporary allocation with an expiry', () => {
    expect(
      assignParkingSlotSchema.safeParse({
        apartmentId: '11111111-1111-1111-1111-111111111111',
        isTemporary: true,
        assignedUntil: '2027-01-01T00:00:00.000Z',
      }).success,
    ).toBe(true)
  })

  it('rejects a temporary allocation with no expiry', () => {
    expect(
      assignParkingSlotSchema.safeParse({
        apartmentId: '11111111-1111-1111-1111-111111111111',
        isTemporary: true,
      }).success,
    ).toBe(false)
  })

  it('rejects a temporary release', () => {
    expect(
      assignParkingSlotSchema.safeParse({ apartmentId: null, isTemporary: true, assignedUntil: null }).success,
    ).toBe(false)
  })
})
