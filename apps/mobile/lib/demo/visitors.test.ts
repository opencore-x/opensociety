import { describe, expect, it } from 'vitest'
import { visitorEntrySchema, visitorPreApprovalSchema } from '@opensociety/shared'
import { createMobileDemoStore } from './store'
import { demoVisitors } from './visitors'

describe('phone demo visitor workflow', () => {
  it('shares registrations and approvals between roles within one sandbox', () => {
    const store = createMobileDemoStore()
    const guard = demoVisitors(store, 'guard')
    const resident = demoVisitors(store, 'resident')
    const entry = guard.createVisitor({ apartmentId: store.apartmentId, visitorName: 'Demo guest', type: 'GUEST' })
    expect(visitorEntrySchema.parse(entry).status).toBe('PENDING')
    expect(resident.listVisitors('PENDING').some(v => v.id === entry.id)).toBe(true)
    expect(resident.approveVisitor(entry.id).status).toBe('APPROVED')
    expect(guard.checkInVisitor(entry.id).status).toBe('ENTERED')
    expect(guard.checkOutVisitor(entry.id).status).toBe('EXITED')
    expect(() => guard.checkInVisitor(entry.id)).toThrow('no longer available')
  })

  it('redeems resident guest codes once and rejects expired codes', () => {
    const store = createMobileDemoStore()
    const guard = demoVisitors(store, 'guard')
    const resident = demoVisitors(store, 'resident')
    const approval = resident.createPreApproval({ apartmentId: store.apartmentId, visitorName: 'Invited guest', approvalType: 'ONE_TIME' })
    expect(visitorPreApprovalSchema.safeParse(approval).success).toBe(true)
    expect(guard.redeemPreApproval(approval.code.toLowerCase()).status).toBe('ENTERED')
    expect(() => guard.redeemPreApproval(approval.code)).toThrow()
    store.data.preApprovals[1].validUntil = '2000-01-01T00:00:00Z'
    expect(() => guard.redeemPreApproval(store.data.preApprovals[1].code)).toThrow()
  })

  it('keeps visitors scoped to the resident and enforces role actions', () => {
    const store = createMobileDemoStore()
    const resident = demoVisitors(store, 'resident')
    const guard = demoVisitors(store, 'guard')
    expect(resident.listVisitors().every(v => v.apartmentId === store.apartmentId)).toBe(true)
    const entry = guard.createVisitor({ apartmentId: store.data.apartments[1].id, visitorName: 'Another flat', type: 'GUEST' })
    expect(() => resident.approveVisitor(entry.id)).toThrow('demo apartment')
    expect(() => guard.approveVisitor(entry.id)).toThrow('resident')
    expect(() => resident.createVisitor({ apartmentId: store.apartmentId, visitorName: 'Guest', type: 'GUEST' })).toThrow('guard')
    const pending = resident.listVisitors('PENDING')[0]
    expect(() => resident.denyVisitor(pending.id, '')).toThrow()
    expect(resident.denyVisitor(pending.id, 'Not expected').status).toBe('DENIED')
  })

  it('deduplicates a retried registration and starts each demo with fresh records', () => {
    const store = createMobileDemoStore()
    const guard = demoVisitors(store, 'guard')
    const input = { apartmentId: store.apartmentId, visitorName: 'Retried guest', type: 'GUEST' as const,
      clientId: '00000000-0000-4000-8000-999999999999' }
    const first = guard.createVisitor(input)
    expect(guard.createVisitor(input).id).toBe(first.id)
    expect(guard.listVisitors().filter(v => v.clientId === input.clientId)).toHaveLength(1)
    expect(demoVisitors(createMobileDemoStore(), 'guard').listVisitors().some(v => v.visitorName === input.visitorName)).toBe(false)
  })
})
