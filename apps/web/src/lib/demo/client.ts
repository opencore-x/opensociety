import * as s from '@opensociety/shared'
import { DEMO_ADMIN, createDemoData } from './data'
import { demoFinance } from './finance'
import { find, groupCount, inRange, newRecord, nowIso, type DemoMethods } from './helpers'
import type { apiClient } from '../api'

export function createDemoClient(initial = createDemoData()) {
  const d = structuredClone(initial)
  const finance = demoFinance(d)
  const files = new Map<string, File>()
  const apartment = (id: string) => { const a = find(d.apartments, id); return `${a.tower}-${a.apartmentNo}` }
  const addApartment = (body: s.CreateApartment) => {
    const input = s.createApartmentSchema.parse(body)
    if (d.apartments.some(a => a.tower === input.tower && a.apartmentNo === input.apartmentNo)) throw new Error('This apartment already exists.')
    const row = { ...newRecord(), floor: null, bhkType: null, isActive: true, ...input }
    d.apartments.push(row)
    return row
  }
  const visitorAction = (id: string, action: s.VisitorAction, reason?: string) => {
    const row = find(d.visitors, id)
    if (!s.canTransition(action, row.status)) throw new Error('This visitor action is no longer available.')
    if (action === 'deny') s.denyVisitorSchema.parse({ reason })
    row.status = s.VISITOR_TRANSITIONS[action].to
    row.updatedAt = nowIso()
    if (action === 'approve') row.approvedBy = DEMO_ADMIN
    if (action === 'deny') row.deniedReason = reason ?? null
    if (action === 'checkin') { row.checkInAt = nowIso(); row.checkInBy = d.guards[0].id }
    if (action === 'checkout') {
      row.checkOutAt = nowIso(); row.checkOutBy = d.guards[0].id
      for (const slot of d.parking.filter(p => p.occupiedByEntryId === id)) { slot.occupiedByEntryId = null; slot.occupiedAt = null }
    }
    return row
  }
  const helpRow = (id: string) => {
    const h = find(d.houseHelp, id), ratings = s.summarizeRatings(d.reviews.filter(r => r.houseHelpId === id).map(r => r.rating))
    return { ...h, ratingAvg: ratings.average, reviewCount: ratings.count, verificationLevel: s.verificationLevel(h.idVerified, h.backgroundCheck),
      trustScore: s.computeTrustScore({ ratingTrust: ratings.trustScore, idVerified: h.idVerified, backgroundCheck: h.backgroundCheck, incidentCount: h.incidentCount, tenureDays: Math.max(0, (Date.now() - Date.parse(h.createdAt)) / 86400000) }) }
  }
  const methods: DemoMethods = {
    ...finance,
    health: () => ({ status: 'ok' }),
    getSociety: () => d.society,
    updateSociety: body => Object.assign(d.society, s.updateSocietyConfigSchema.parse(body), { updatedAt: nowIso() }),
    listApartments: () => d.apartments,
    createApartment: addApartment,
    createApartmentsBulk: body => {
      const input = s.createApartmentsBulkSchema.parse(body)
      const keys = new Set(d.apartments.map(a => `${a.tower}/${a.apartmentNo}`))
      for (const a of input.apartments) { const key = `${a.tower}/${a.apartmentNo}`; if (keys.has(key)) throw new Error(`Duplicate apartment: ${key}`); keys.add(key) }
      const apartments = input.apartments.map(addApartment)
      return { count: apartments.length, apartments }
    },
    updateApartment: (id, body) => {
      const row = find(d.apartments, id), input = s.updateApartmentSchema.parse(body)
      if (d.apartments.some(a => a.id !== id && a.tower === (input.tower ?? row.tower) && a.apartmentNo === (input.apartmentNo ?? row.apartmentNo))) throw new Error('This apartment already exists.')
      return Object.assign(row, input, { updatedAt: nowIso() })
    },
    listUsers: status => d.users.filter(u => !status || u.status === status),
    approveUser: (id, body) => { const input = s.approveUserSchema.parse(body); find(d.apartments, input.apartmentId); return Object.assign(find(d.users, id), { status: 'APPROVED' as const, updatedAt: nowIso() }) },
    updateUserRole: (id, role) => Object.assign(find(d.users, id), { role: s.userRoleSchema.parse(role), updatedAt: nowIso() }),
    listGuards: () => d.guards,
    createGuard: body => { const row = { ...newRecord(), userId: null, phone: null, employeeCode: null, isActive: true, ...s.createGuardSchema.parse(body) }; d.guards.push(row); return row },
    updateGuard: (id, body) => Object.assign(find(d.guards, id), s.updateGuardSchema.parse(body), { updatedAt: nowIso() }),
    listGuardDevices: id => d.devices.filter(x => x.guardId === id),
    revokeGuardDevice: (id, deviceId) => { const device = find(d.devices.filter(x => x.guardId === id), deviceId); device.revokedAt = nowIso(); return device },
    listActiveDuty: () => d.duty.filter(x => !x.clockOutAt),
    listDutySessions: params => d.duty.filter(x => (!params?.guardId || x.guardId === params.guardId) && inRange(x.clockInAt, params?.from, params?.to)),
    listVisitors: status => d.visitors.filter(v => !status || v.status === status),
    approveVisitor: id => visitorAction(id, 'approve'),
    denyVisitor: (id, reason) => visitorAction(id, 'deny', reason),
    checkInVisitor: id => visitorAction(id, 'checkin'),
    checkOutVisitor: id => visitorAction(id, 'checkout'),
    listPreApprovals: () => d.preApprovals,
    createPreApproval: body => {
      const input = s.createPreApprovalSchema.parse(body); find(d.apartments, input.apartmentId)
      const row: s.VisitorPreApproval = { ...newRecord(), visitorPhone: null, validUntil: null, maxUses: null, ...input, createdBy: DEMO_ADMIN,
        code: crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase(), validFrom: nowIso(), useCount: 0, isActive: true }
      d.preApprovals.unshift(row); return row
    },
    revokePreApproval: id => Object.assign(find(d.preApprovals, id), { isActive: false }),
    redeemPreApproval: code => {
      const pa = d.preApprovals.find(p => p.code === code.trim().toUpperCase())
      if (!pa) throw new Error('Invalid demo visitor code.')
      const error = s.preApprovalRedeemError({ ...pa, validUntilMs: pa.validUntil ? Date.parse(pa.validUntil) : null }, Date.now())
      if (error) throw new Error(error)
      const row: s.VisitorEntry = { ...newRecord(), clientId: null, apartmentId: pa.apartmentId, preApprovalId: pa.id, visitorName: pa.visitorName,
        visitorPhone: pa.visitorPhone, type: 'GUEST', status: 'ENTERED', purpose: 'Pre-approved visit', vehicleNumber: null, photoUrl: null, approvedBy: pa.createdBy,
        deniedReason: null, checkInBy: d.guards[0].id, checkInAt: nowIso(), checkOutBy: null, checkOutAt: null }
      pa.useCount++; d.visitors.unshift(row); return row
    },
    listNotices: params => d.notices.filter(n => s.noticeMatchesQuery(n, params?.q ?? '') && (!params?.category || n.category === params.category) && inRange(n.publishedAt, params?.from, params?.to)),
    createNotice: body => { const row = { ...newRecord(), attachmentUrl: null, attachmentName: null, expiresAt: null, ...s.createNoticeSchema.parse(body), publishedBy: DEMO_ADMIN, publishedAt: nowIso(), readCount: 0, read: true }; d.notices.unshift(row); return row },
    listNoticeReads: id => d.users.slice(1, 1 + (find(d.notices, id).readCount ?? 0)).map(u => ({ userId: u.id, name: u.name, readAt: nowIso() })),
    uploadFile: file => { if (file.size > 5 * 1024 * 1024) throw new Error('Demo attachments must be smaller than 5 MB.'); const key = crypto.randomUUID(); files.set(`/uploads/${key}`, file); return { key, url: `/uploads/${key}` } },
    fetchUploadObjectUrl: path => { const file = files.get(path); if (!file) throw new Error('This attachment is no longer available. Attach it again in this demo.'); return URL.createObjectURL(file) },
    listTickets: status => d.tickets.filter(ticket => !status || ticket.status === status),
    createTicket: body => { const input = s.createTicketSchema.parse(body); find(d.apartments, input.apartmentId); const row: s.Ticket = { ...newRecord(), ...input, raisedBy: DEMO_ADMIN, status: 'OPEN', assignedTo: null, resolutionNote: null, resolvedAt: null }; d.tickets.unshift(row); return row },
    transitionTicket: (id, action, resolutionNote) => {
      const row = find(d.tickets, id)
      if (!s.canTicketTransition(action, row.status)) throw new Error('This ticket action is no longer available.')
      return Object.assign(row, { status: s.TICKET_TRANSITIONS[action].to, resolutionNote: resolutionNote ?? row.resolutionNote, resolvedAt: action === 'resolve' ? nowIso() : action === 'reopen' ? null : row.resolvedAt, updatedAt: nowIso() })
    },
    assignTicket: (id, assignedTo) => { find(d.users, assignedTo); return Object.assign(find(d.tickets, id), { assignedTo, updatedAt: nowIso() }) },
    listHouseHelp: type => d.houseHelp.filter(h => !type || h.type === type).map(h => helpRow(h.id)),
    getHouseHelpReviews: id => { const reviews = d.reviews.filter(r => r.houseHelpId === id); return { reviews, summary: { ...s.summarizeRatings(reviews.map(r => r.rating)), trustScore: helpRow(id).trustScore } } },
    createHouseHelpReview: (id, body) => { find(d.houseHelp, id); const input = s.createHouseHelpReviewSchema.parse(body), row = { ...newRecord(), houseHelpId: id, comment: null, ...input }; d.reviews.unshift(row); return { ok: true, id: row.id, rating: row.rating } },
    updateHouseHelpVerification: (id, body) => Object.assign(find(d.houseHelp, id), s.updateVerificationSchema.parse(body), { updatedAt: nowIso() }),
    createHouseHelp: body => {
      const row = { ...newRecord(), phone: null, photoUrl: null, idProofType: null, idProofNumber: null, idProofUrl: null, isActive: true, registeredBy: DEMO_ADMIN,
        ratingAvg: null, reviewCount: 0, trustScore: 0, idVerified: false, backgroundCheck: 'PENDING' as const, incidentCount: 0, verificationLevel: 'UNVERIFIED' as const, ...s.createHouseHelpSchema.parse(body) }
      d.houseHelp.push(row); return row
    },
    updateHouseHelp: (id, body) => Object.assign(find(d.houseHelp, id), s.updateHouseHelpSchema.parse(body), { updatedAt: nowIso() }),
    listHouseHelpAssignments: id => d.assignments.filter(a => a.houseHelpId === id),
    assignHouseHelp: (id, apartmentId) => {
      find(d.houseHelp, id); find(d.apartments, apartmentId)
      const existing = d.assignments.find(a => a.houseHelpId === id && a.apartmentId === apartmentId)
      if (existing) return existing
      const row = { ...newRecord(), houseHelpId: id, apartmentId, assignedBy: DEMO_ADMIN }; d.assignments.push(row); return row
    },
    removeHouseHelpAssignment: (id, apartmentId) => { const row = d.assignments.find(a => a.houseHelpId === id && a.apartmentId === apartmentId); if (!row) throw new Error('Assignment not found.'); d.assignments.splice(d.assignments.indexOf(row), 1); return row },
    listHouseHelpEntries: params => d.attendance.filter(a => inRange(a.checkInAt, params?.from, params?.to)),
    listVehicles: apartmentId => d.vehicles.filter(v => !apartmentId || v.apartmentId === apartmentId),
    createVehicle: body => { const input = s.createVehicleSchema.parse(body); find(d.apartments, input.apartmentId); const row = { ...newRecord(), make: null, color: null, ...input, registrationNumber: s.normalizePlate(input.registrationNumber), registeredBy: DEMO_ADMIN, isActive: true }; if (d.vehicles.some(v => v.registrationNumber === row.registrationNumber)) throw new Error('Vehicle already registered.'); d.vehicles.push(row); return row },
    updateVehicle: (id, body) => { const input = s.updateVehicleSchema.parse(body); if (input.registrationNumber) input.registrationNumber = s.normalizePlate(input.registrationNumber); if (input.registrationNumber && d.vehicles.some(v => v.id !== id && v.registrationNumber === input.registrationNumber)) throw new Error('Vehicle already registered.'); return Object.assign(find(d.vehicles, id), input, { updatedAt: nowIso() }) },
    listVehicleGateLog: () => d.visitors.filter(v => v.vehicleNumber).map(v => ({ ...v, apartment: apartment(v.apartmentId), registered: d.vehicles.some(r => r.registrationNumber === v.vehicleNumber) })),
    listParkingSlots: () => d.parking.map(p => ({ ...p, apartment: p.apartmentId ? apartment(p.apartmentId) : null })),
    listParkingDirectory: () => d.parking.filter(p => p.isActive).map(p => ({ ...p, apartment: p.apartmentId ? apartment(p.apartmentId) : null })),
    listVisitorParking: () => {
      const slots = d.parking.filter(p => p.isVisitor && p.isActive).map(p => { const v = d.visitors.find(v => v.id === p.occupiedByEntryId); return { ...p, visitorName: v?.visitorName ?? null, vehicleNumber: v?.vehicleNumber ?? null } })
      const occupied = slots.filter(p => p.occupiedByEntryId).length
      return { slots, summary: { total: slots.length, occupied, available: slots.length - occupied, isFull: slots.length > 0 && occupied === slots.length } }
    },
    createParkingSlot: body => {
      const input = s.createParkingSlotSchema.parse(body)
      if (d.parking.some(p => p.slotNumber === input.slotNumber)) throw new Error('Slot already exists.')
      const row = { ...newRecord(), ...input, apartmentId: null, apartment: null, isTemporary: false, assignedUntil: null, assignedBy: null, assignedAt: null, occupiedByEntryId: null, occupiedAt: null, notes: input.notes ?? null, isActive: true }; d.parking.push(row); return row
    },
    updateParkingSlot: (id, body) => Object.assign(find(d.parking, id), s.updateParkingSlotSchema.parse(body), { updatedAt: nowIso() }),
    assignParkingSlot: (id, body) => { const input = s.assignParkingSlotSchema.parse(body), row = find(d.parking, id); if (input.apartmentId) find(d.apartments, input.apartmentId); if (row.isVisitor) throw new Error('Visitor slots cannot be assigned to apartments.'); return Object.assign(row, input, { apartment: input.apartmentId ? apartment(input.apartmentId) : null, assignedBy: DEMO_ADMIN, assignedAt: nowIso() }) },
    deleteParkingSlot: id => { const row = find(d.parking, id); if (row.occupiedByEntryId || row.apartmentId) throw new Error('Release the slot before removing it.'); d.parking.splice(d.parking.indexOf(row), 1); return { ok: true } },
    listVendors: () => d.vendors,
    createVendor: body => { const row = { ...newRecord(), category: null, pan: null, gstin: null, contact: null, bankAccount: null, isActive: true, ...s.createVendorSchema.parse(body) }; d.vendors.push(row); return row },
    updateVendor: (id, body) => Object.assign(find(d.vendors, id), s.updateVendorSchema.parse(body)),
    listExpenses: params => d.expenses.filter(e => (!params?.accountId || e.accountId === params.accountId) && (!params?.vendorId || e.vendorId === params.vendorId) && (!params?.status || e.status === params.status) && inRange(e.createdAt, params?.from, params?.to)).map(e => ({ ...e, vendor: e.vendorId ? find(d.vendors, e.vendorId).name : null, account: find(d.accounts, e.accountId).name })),
    createExpense: body => {
      const input = s.createExpenseSchema.parse(body), account = find(d.accounts, input.accountId)
      if (account.type !== 'EXPENSE' || account.isGroup) throw new Error('Choose an expense account.')
      if (input.vendorId) find(d.vendors, input.vendorId)
      const row = { ...newRecord(), vendorId: null, billRef: null, method: null, attachmentUrl: null, ...input, paidAt: input.status === 'PAID' ? input.paidAt ?? nowIso() : null,
        recordedBy: DEMO_ADMIN, tdsAmount: input.tds ? s.computeTds(input.amount, input.tds.ratePct) : 0, tdsSection: input.tds?.section }
      d.expenses.unshift(row); return row
    },
    payExpense: (id, method) => { const row = find(d.expenses, id); if (row.status === 'PAID') throw new Error('This expense is already paid.'); return Object.assign(row, { status: 'PAID' as const, paidAt: nowIso(), method: s.paymentMethodSchema.parse(method ?? 'BANK_TRANSFER') }) },
    getTdsSummary: (from, to) => s.tdsSectionSchema.options.map(section => { const rows = d.expenses.filter(e => e.tdsSection === section && inRange(e.createdAt, from, to)); return { section, amount: rows.reduce((n, e) => n + (e.tdsAmount ?? 0), 0), count: rows.length } }).filter(r => r.count),
    getVisitorTrends: (from, to) => {
      const rows = d.visitors.filter(v => inRange(v.createdAt, from, to)), byDay = groupCount(rows, v => v.createdAt.slice(0, 10)).map(r => ({ date: r.label, count: r.count })).sort((a, b) => a.date.localeCompare(b.date))
      const byHour = s.fillHours(groupCount(rows, v => String(new Date(v.createdAt).getUTCHours())).map(r => ({ hour: Number(r.label), count: r.count })))
      return { from: from ?? byDay[0]?.date ?? nowIso().slice(0, 10), to: to ?? nowIso().slice(0, 10), total: rows.length, distinctDays: byDay.length, avgPerDay: s.averagePerDay(rows.length, byDay.length), peakHour: s.peakHour(byHour), byHour, byDay, byType: groupCount(rows, v => v.type).map(r => ({ type: r.label, count: r.count })) }
    },
    getHouseHelpAnalytics: () => ({ totalActive: d.houseHelp.filter(h => h.isActive).length, totalAttendance: d.attendance.length, byType: groupCount(d.houseHelp.filter(h => h.isActive), h => h.type), attendanceByDow: s.fillDaysOfWeek(groupCount(d.attendance, a => String(new Date(a.checkInAt).getUTCDay())).map(r => ({ dow: Number(r.label), count: r.count }))) }),
    getMaintenanceAnalytics: () => ({ total: d.tickets.length, pending: d.tickets.filter(ticket => ['OPEN', 'IN_PROGRESS'].includes(ticket.status)).length, avgResolutionHours: s.avgResolutionHours(d.tickets.map(ticket => ({ createdMs: Date.parse(ticket.createdAt), resolvedMs: ticket.resolvedAt ? Date.parse(ticket.resolvedAt) : null }))), byCategory: groupCount(d.tickets, ticket => ticket.category), byStatus: groupCount(d.tickets, ticket => ticket.status) }),
    reportExportObjectUrl: async path => (await import('./exports')).exportReport(d, path),
    visitorTrendsPdfObjectUrl: async (from, to) => {
      const report = await methods.getVisitorTrends(from, to)
      return (await import('./exports')).exportTable({ name: 'Demo visitor trends', rows: [['Date', 'Visitors'], ...report.byDay.map(r => [r.date, r.count])] }, 'pdf')
    },
    invoiceObjectUrl: async id => {
      const bill = finance.getBill(id)
      return (await import('./exports')).exportTable({ name: `DEMO invoice: ${bill.apartment}`, rows: [[bill.title], ['Description', 'Amount (INR)'], ...(bill.lineItems ?? []).map(l => [l.description, (l.amount + l.taxAmount) / 100]), ['Total', bill.totalAmount / 100], ['Paid', bill.paidAmount! / 100]] }, 'pdf')
    },
  }
  // Clone responses like an HTTP boundary so query caches cannot mutate the store.
  return new Proxy(methods, { get(target, property: keyof DemoMethods) {
    const method = target[property]
    if (typeof method !== 'function') throw new Error(`Unsupported demo action: ${String(property)}`)
    return async (...args: unknown[]) => structuredClone(await Reflect.apply(method, target, args))
  } }) as typeof apiClient
}

let client: ReturnType<typeof createDemoClient> | undefined
export function getDemoClient() {
  if (typeof window === 'undefined') throw new Error('The demo is only available in the browser.')
  return client ??= createDemoClient()
}
export function resetDemoClient() { client = undefined }
