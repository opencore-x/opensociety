import type { Database } from '@opensociety/db'
import { parkingSlots, visitorEntries } from '@opensociety/db'
import { and, asc, eq, isNull } from 'drizzle-orm'

// Auto-assign the next free visitor slot to a checked-in visitor entry, on a
// first-come basis (lowest slotNumber first). Only visitors that arrived with a
// vehicle take a slot. Idempotent: if the entry already holds a slot, that slot
// is returned. Returns the assigned slot number, or null when the visitor has
// no vehicle or the pool is full.
export async function assignVisitorParking(db: Database, entryId: string): Promise<string | null> {
  const [entry] = await db
    .select({ vehicleNumber: visitorEntries.vehicleNumber })
    .from(visitorEntries)
    .where(eq(visitorEntries.id, entryId))
    .limit(1)
  if (!entry || !entry.vehicleNumber) return null

  const [already] = await db
    .select({ slotNumber: parkingSlots.slotNumber })
    .from(parkingSlots)
    .where(eq(parkingSlots.occupiedByEntryId, entryId))
    .limit(1)
  if (already) return already.slotNumber

  const [free] = await db
    .select({ id: parkingSlots.id, slotNumber: parkingSlots.slotNumber })
    .from(parkingSlots)
    .where(
      and(eq(parkingSlots.isVisitor, true), eq(parkingSlots.isActive, true), isNull(parkingSlots.occupiedByEntryId)),
    )
    .orderBy(asc(parkingSlots.slotNumber))
    .limit(1)
  if (!free) return null

  // Guard against a concurrent grab: only claim the slot if still unoccupied.
  const claimed = await db
    .update(parkingSlots)
    .set({ occupiedByEntryId: entryId, occupiedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(parkingSlots.id, free.id), isNull(parkingSlots.occupiedByEntryId)))
    .returning({ slotNumber: parkingSlots.slotNumber })
  return claimed[0]?.slotNumber ?? assignVisitorParking(db, entryId)
}

// Release whatever visitor slot this entry holds (on check-out). No-op if none.
export async function releaseVisitorParking(db: Database, entryId: string): Promise<void> {
  await db
    .update(parkingSlots)
    .set({ occupiedByEntryId: null, occupiedAt: null, updatedAt: new Date() })
    .where(eq(parkingSlots.occupiedByEntryId, entryId))
}
