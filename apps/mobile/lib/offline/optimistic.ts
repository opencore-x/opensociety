import * as Crypto from 'expo-crypto'
import type { CreateVisitorEntry, VisitorEntry } from '@opensociety/shared'

// Optimistic visitor entries created offline get a client-side id with this
// prefix. Real entries carry a server UUID, so the prefix lets the UI tell a
// not-yet-synced entry apart and block gate actions that need a server id.
export const LOCAL_ID_PREFIX = 'local-'

export function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX)
}

// A fresh UUID for a new registration. Fed to createVisitor as its idempotency
// key so a replayed offline entry dedupes to one row server-side. expo-crypto
// guarantees a real v4 UUID on native and web (the server validates uuid()),
// unlike globalThis.crypto.randomUUID which isn't present in Hermes.
export function newClientId(): string {
  return Crypto.randomUUID()
}

function tempId(clientId?: string): string {
  return `${LOCAL_ID_PREFIX}${clientId ?? newClientId()}`
}

// Build the visitor entry to show immediately when a guard registers someone,
// before (or without) the server responding. Mirrors the server's own defaults
// for a freshly created entry: PENDING, no check-in/out, timestamps = now.
export function buildOptimisticVisitor(
  vars: CreateVisitorEntry,
  nowIso: string = new Date().toISOString(),
): VisitorEntry {
  return {
    id: tempId(vars.clientId),
    clientId: vars.clientId ?? null,
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
