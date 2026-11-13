import { createDemoData, demoId } from '@opensociety/shared/demo'
import type { HouseHelpEntry } from '@opensociety/shared'
import type { apiClient } from '../../api/client'

export type MobileApi = typeof apiClient
export type DemoRole = 'resident' | 'guard'
export type DemoMethods<T> = { [K in keyof T]: T[K] extends (...args: infer A) => Promise<infer R> ? (...args: A) => R : never }

// Demo records contain only JSON values. This also works on Hermes without
// relying on browser globals such as structuredClone or crypto.randomUUID.
export function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T }
export function find<T extends { id: string }>(rows: T[], id: string): T {
  const row = rows.find(item => item.id === id)
  if (!row) throw new Error('Demo record not found.')
  return row
}
export const nowIso = () => new Date().toISOString()

export function createMobileDemoStore() {
  const data = createDemoData()
  const apartmentId = data.apartments[0].id
  const residentId = data.users[1].id
  const guardId = data.guards[0].id
  data.visitors.slice(0, 4).forEach(v => { v.apartmentId = apartmentId })
  data.tickets.forEach(ticket => { ticket.apartmentId = apartmentId; ticket.raisedBy = residentId })
  data.notices.forEach((notice, i) => { notice.read = i > 1 })
  const entries: HouseHelpEntry[] = data.attendance.map(row => ({
    ...row, apartmentId: data.assignments.find(a => a.houseHelpId === row.houseHelpId)?.apartmentId ?? null,
    checkInBy: guardId, checkOutBy: row.checkOutAt ? guardId : null, createdAt: row.checkInAt,
  }))
  let sequence = 2000
  return {
    data, apartmentId, residentId, guardId, entries,
    newRecord: () => ({ id: demoId(sequence++), createdAt: nowIso(), updatedAt: nowIso() }),
  }
}
export type MobileDemoStore = ReturnType<typeof createMobileDemoStore>

export function scope(store: MobileDemoStore, role: DemoRole) {
  return {
    requireRole(expected: DemoRole) {
      if (role !== expected) throw new Error(`Switch to the ${expected} demo to try this action.`)
    },
    apartment(id: string) {
      const row = find(store.data.apartments, id)
      if (role === 'resident' && id !== store.apartmentId) throw new Error('Choose your demo apartment.')
      return row
    },
    visible(id: string) { return role === 'guard' || id === store.apartmentId },
  }
}
