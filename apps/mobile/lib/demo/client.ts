import * as s from '@opensociety/shared'
import { clone, find, nowIso, scope, type DemoMethods, type DemoRole, type MobileApi, type MobileDemoStore } from './store'
import { demoVisitors } from './visitors'

export function createMobileDemoClient(store: MobileDemoStore, role: DemoRole): MobileApi {
  const { data: d, newRecord } = store
  const access = scope(store, role)
  const helpRow = (id: string) => {
    const h = find(d.houseHelp, id)
    const ratings = s.summarizeRatings(d.reviews.filter(r => r.houseHelpId === id).map(r => r.rating))
    return { ...h, ratingAvg: ratings.average, reviewCount: ratings.count,
      verificationLevel: s.verificationLevel(h.idVerified, h.backgroundCheck),
      trustScore: s.computeTrustScore({ ratingTrust: ratings.trustScore, idVerified: h.idVerified,
        backgroundCheck: h.backgroundCheck, incidentCount: h.incidentCount,
        tenureDays: Math.max(0, (Date.now() - Date.parse(h.createdAt)) / 86400000) }) }
  }
  const methods: DemoMethods<MobileApi> = {
    ...demoVisitors(store, role),
    health: () => ({ status: 'ok' }),
    getSociety: () => d.society,
    listApartments: () => d.apartments.filter(a => access.visible(a.id)),
    listMyApartments: () => role === 'resident' ? [find(d.apartments, store.apartmentId)] : [],
    listMyResidents: () => role === 'resident' ? d.users.slice(1, 3).map((u, i) => ({
      apartmentId: store.apartmentId, userId: u.id, name: u.name, relation: i ? 'FAMILY' : 'OWNER',
    })) : [],
    listNotices: () => d.notices,
    markNoticeRead: id => {
      const row = find(d.notices, id)
      if (!row.read) { row.read = true; row.readCount = (row.readCount ?? 0) + 1 }
      return { ok: true }
    },
    listBills: () => { access.requireRole('resident'); return d.bills.filter(b => b.apartmentId === store.apartmentId) },
    listPayments: () => { access.requireRole('resident'); return d.payments.filter(p => p.apartmentId === store.apartmentId) },
    getApartmentStatement: apartmentId => {
      access.requireRole('resident')
      const apartment = access.apartment(apartmentId)
      return { apartmentId, apartment: `${apartment.tower}-${apartment.apartmentNo}`, ...s.buildStatement([
        ...d.bills.filter(b => b.apartmentId === apartmentId).map(b => ({ date: b.issuedAt, type: 'BILL' as const,
          description: b.title, debit: b.totalAmount, credit: 0, ref: b.id })),
        ...d.payments.filter(p => p.apartmentId === apartmentId).map(p => ({ date: p.paidAt, type: 'PAYMENT' as const,
          description: `Payment (${p.method})`, debit: 0, credit: p.amount, ref: p.id })),
      ]) }
    },
    listTickets: status => d.tickets.filter(t => access.visible(t.apartmentId) && (!status || t.status === status)),
    createTicket: body => {
      access.requireRole('resident')
      const input = s.createTicketSchema.parse(body)
      access.apartment(input.apartmentId)
      const row: s.Ticket = { ...newRecord(), ...input, raisedBy: store.residentId,
        status: 'OPEN', assignedTo: null, resolutionNote: null, resolvedAt: null }
      d.tickets.unshift(row)
      return row
    },
    listHouseHelp: type => d.houseHelp.filter(h => !type || h.type === type).map(h => helpRow(h.id)),
    listHouseHelpForApartment: apartmentId => {
      access.apartment(apartmentId)
      return d.assignments.filter(a => a.apartmentId === apartmentId).map(a => helpRow(a.houseHelpId))
    },
    rateHouseHelp: (id, body) => {
      access.requireRole('resident')
      find(d.houseHelp, id)
      const input = s.createHouseHelpReviewSchema.parse(body)
      const row = { ...newRecord(), houseHelpId: id, comment: null, ...input }
      d.reviews.unshift(row)
      return { ok: true, id: row.id, rating: row.rating }
    },
    assignHouseHelp: (id, apartmentId) => {
      access.requireRole('resident')
      access.apartment(apartmentId)
      find(d.houseHelp, id)
      const existing = d.assignments.find(a => a.houseHelpId === id && a.apartmentId === apartmentId)
      if (existing) return existing
      const row = { ...newRecord(), houseHelpId: id, apartmentId, assignedBy: store.residentId }
      d.assignments.push(row)
      return row
    },
    removeHouseHelpAssignment: (id, apartmentId) => {
      access.requireRole('resident')
      access.apartment(apartmentId)
      const index = d.assignments.findIndex(a => a.houseHelpId === id && a.apartmentId === apartmentId)
      if (index === -1) throw new Error('Assignment not found.')
      return d.assignments.splice(index, 1)[0]
    },
    listHouseHelpEntries: params => store.entries.filter(e => (!params?.active || !e.checkOutAt)
      && (!params?.houseHelpId || e.houseHelpId === params.houseHelpId)
      && (role === 'guard' || e.apartmentId === store.apartmentId)),
    checkInHouseHelp: (id, body = {}) => {
      access.requireRole('guard')
      const help = find(d.houseHelp, id)
      const input = s.checkInHouseHelpSchema.parse(body)
      if (input.apartmentId) access.apartment(input.apartmentId)
      if (store.entries.some(e => e.houseHelpId === id && !e.checkOutAt)) throw new Error('Already checked in.')
      const row: s.HouseHelpEntry = { ...newRecord(), houseHelpId: id, helpName: help.name, type: help.type,
        apartmentId: input.apartmentId ?? null, checkInAt: nowIso(), checkInBy: store.guardId, checkOutAt: null, checkOutBy: null }
      store.entries.unshift(row)
      return row
    },
    checkOutHouseHelpEntry: id => {
      access.requireRole('guard')
      const row = find(store.entries, id)
      if (row.checkOutAt) throw new Error('Already checked out.')
      row.checkOutAt = nowIso(); row.checkOutBy = store.guardId
      return row
    },
    listVehicles: apartmentId => d.vehicles.filter(v => access.visible(v.apartmentId) && (!apartmentId || v.apartmentId === apartmentId)),
    createVehicle: body => {
      access.requireRole('resident')
      const input = s.createVehicleSchema.parse(body)
      access.apartment(input.apartmentId)
      const registrationNumber = s.normalizePlate(input.registrationNumber)
      if (d.vehicles.some(v => v.registrationNumber === registrationNumber)) throw new Error('Vehicle already registered.')
      const row = { ...newRecord(), make: null, color: null, ...input, registrationNumber, registeredBy: store.residentId, isActive: true }
      d.vehicles.push(row)
      return row
    },
    updateVehicle: (id, body) => {
      access.requireRole('resident')
      const row = find(d.vehicles, id)
      access.apartment(row.apartmentId)
      const input = s.updateVehicleSchema.parse(body)
      if (input.registrationNumber) {
        input.registrationNumber = s.normalizePlate(input.registrationNumber)
        if (d.vehicles.some(v => v.id !== id && v.registrationNumber === input.registrationNumber)) throw new Error('Vehicle already registered.')
      }
      return Object.assign(row, input, { updatedAt: nowIso() })
    },
    verifyVehicle: plate => {
      access.requireRole('guard')
      plate = s.normalizePlate(plate)
      const vehicle = d.vehicles.find(v => v.registrationNumber === plate && v.isActive)
      const apartment = vehicle && access.apartment(vehicle.apartmentId)
      return { plate, registered: !!vehicle, vehicle: vehicle && apartment ? {
        ...vehicle, apartment: `${apartment.tower}-${apartment.apartmentNo}`,
      } : null, parkingSlots: vehicle ? d.parking.filter(p => p.apartmentId === vehicle.apartmentId && p.isActive)
        .map(p => ({ slotNumber: p.slotNumber, type: p.type })) : [] }
    },
    listGuards: () => { access.requireRole('guard'); return d.guards.filter(g => g.id === store.guardId) },
    listActiveDuty: () => { access.requireRole('guard'); return d.duty.filter(duty => duty.guardId === store.guardId && !duty.clockOutAt) },
    clockInGuard: (guardId, coords = {}) => {
      access.requireRole('guard')
      if (guardId !== store.guardId) throw new Error('Choose your demo guard.')
      const guard = find(d.guards, guardId)
      const input = s.clockInSchema.parse(coords)
      if (d.duty.some(duty => duty.guardId === guardId && !duty.clockOutAt)) throw new Error('Already on duty.')
      const row: s.GuardDutySession = { ...newRecord(), guardId, guardName: guard.name, clockInAt: nowIso(),
        clockInLat: input.lat ?? null, clockInLng: input.lng ?? null, clockOutAt: null, clockOutLat: null, clockOutLng: null }
      d.duty.unshift(row)
      return row
    },
    clockOutGuard: (id, coords = {}) => {
      access.requireRole('guard')
      const row = find(d.duty, id)
      if (row.guardId !== store.guardId) throw new Error('Choose your demo guard.')
      if (row.clockOutAt) throw new Error('Already off duty.')
      const input = s.clockOutSchema.parse(coords)
      return Object.assign(row, { clockOutAt: nowIso(), clockOutLat: input.lat ?? null, clockOutLng: input.lng ?? null })
    },
    fetchUploadObjectUrl: () => { throw new Error('Attachments are not included in the phone demo.') },
  }
  return new Proxy(methods, {
    get(target, property: keyof MobileApi) {
      const method = target[property]
      if (typeof method !== 'function') throw new Error(`Unsupported demo action: ${String(property)}`)
      return async (...args: unknown[]) => clone(Reflect.apply(method, target, args))
    },
  }) as unknown as MobileApi
}
