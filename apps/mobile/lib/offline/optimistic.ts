import type { CreateVisitorEntry, VisitorEntry } from '@opensociety/shared'

// Optimistic visitor entries created offline get a client-side id with this
// prefix. Real entries carry a server UUID, so the prefix lets the UI tell a
// not-yet-synced entry apart and block gate actions that need a server id.
export const LOCAL_ID_PREFIX = 'local-'

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX)
}

function tempId(): string {
  const uuid = globalThis.crypto?.randomUUID?.()
  return `${LOCAL_ID_PREFIX}${uuid ?? `${Date.now()}-${Math.round(Math.random() * 1e9)}`}`
}

// Build the visitor entry to show immediately when a guard registers someone,
// before (or without) the server responding. Mirrors the server's own defaults
// for a freshly created entry: PENDING, no check-in/out, timestamps = now.
export function buildOptimisticVisitor(
  vars: CreateVisitorEntry,
  nowIso: string = new Date().toISOString(),
): VisitorEntry {
  return {
    id: tempId(),
    apartmentId: vars.apartmentId,
    preApprovalId: null,
    visitorName: vars.visitorName,
    visitorPhone: vars.visitorPhone ?? null,
    type: vars.type ?? 'GUEST',
    status: 'PENDING',
    purpose: vars.purpose ?? null,
    vehicleNumber: vars.vehicleNumber ?? null,
    photoUrl: null,
    approvedBy: null,
    deniedReason: null,
    checkInBy: null,
    checkOutBy: null,
    checkInAt: null,
    checkOutAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}
