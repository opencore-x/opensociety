import * as s from '@opensociety/shared'
import { find, nowIso, scope, type DemoMethods, type DemoRole, type MobileApi, type MobileDemoStore } from './store'

type VisitorApi = Pick<MobileApi, 'listVisitors' | 'createVisitor' | 'approveVisitor' | 'denyVisitor' | 'checkInVisitor' | 'checkOutVisitor' | 'createPreApproval' | 'redeemPreApproval'>

export function demoVisitors(store: MobileDemoStore, role: DemoRole): DemoMethods<VisitorApi> {
  const { data: d, newRecord } = store
  const access = scope(store, role)
  const action = (id: string, name: s.VisitorAction, reason?: string) => {
    access.requireRole(name === 'approve' || name === 'deny' ? 'resident' : 'guard')
    const row = find(d.visitors, id)
    access.apartment(row.apartmentId)
    if (!s.canTransition(name, row.status)) throw new Error('This visitor action is no longer available.')
    if (name === 'deny') s.denyVisitorSchema.parse({ reason })
    row.status = s.VISITOR_TRANSITIONS[name].to
    row.updatedAt = nowIso()
    if (name === 'approve') row.approvedBy = store.residentId
    if (name === 'deny') row.deniedReason = reason ?? null
    if (name === 'checkin') { row.checkInAt = nowIso(); row.checkInBy = store.guardId }
    if (name === 'checkout') { row.checkOutAt = nowIso(); row.checkOutBy = store.guardId }
    return row
  }
  const visitor = (input: s.CreateVisitorEntry): s.VisitorEntry => ({
    ...newRecord(), clientId: null, visitorPhone: null, purpose: null, vehicleNumber: null, photoUrl: null,
    ...input, status: 'PENDING', preApprovalId: null, approvedBy: null, deniedReason: null,
    checkInBy: null, checkInAt: null, checkOutBy: null, checkOutAt: null,
  })
  return {
    listVisitors: status => d.visitors.filter(v => access.visible(v.apartmentId) && (!status || v.status === status)),
    createVisitor: body => {
      access.requireRole('guard')
      const input = s.createVisitorEntrySchema.parse(body)
      access.apartment(input.apartmentId)
      const existing = input.clientId && d.visitors.find(v => v.clientId === input.clientId)
      if (existing) return existing
      const row = visitor(input)
      d.visitors.unshift(row)
      return row
    },
    approveVisitor: id => action(id, 'approve'),
    denyVisitor: (id, reason) => action(id, 'deny', reason),
    checkInVisitor: id => action(id, 'checkin'),
    checkOutVisitor: id => action(id, 'checkout'),
    createPreApproval: body => {
      access.requireRole('resident')
      const input = s.createPreApprovalSchema.parse(body)
      access.apartment(input.apartmentId)
      const record = newRecord()
      const row: s.VisitorPreApproval = {
        ...record, visitorPhone: null, validUntil: null, maxUses: null, ...input, createdBy: store.residentId,
        code: `DEMO${record.id.slice(-4)}`, validFrom: nowIso(), useCount: 0, isActive: true,
      }
      d.preApprovals.unshift(row)
      return row
    },
    redeemPreApproval: code => {
      access.requireRole('guard')
      const pa = d.preApprovals.find(p => p.code === code.trim().toUpperCase())
      if (!pa) throw new Error('Invalid demo visitor code.')
      const error = s.preApprovalRedeemError({ ...pa, validUntilMs: pa.validUntil ? Date.parse(pa.validUntil) : null }, Date.now())
      if (error) throw new Error(error)
      const row: s.VisitorEntry = {
        ...visitor({ apartmentId: pa.apartmentId, visitorName: pa.visitorName, type: 'GUEST' }),
        visitorPhone: pa.visitorPhone, preApprovalId: pa.id, approvedBy: pa.createdBy, status: 'ENTERED',
        checkInBy: store.guardId, checkInAt: nowIso(), purpose: 'Pre-approved visit',
      }
      pa.useCount++
      d.visitors.unshift(row)
      return row
    },
  }
}
