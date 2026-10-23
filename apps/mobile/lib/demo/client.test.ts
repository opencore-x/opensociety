import { afterEach, describe, expect, it, vi } from 'vitest'
import * as s from '@opensociety/shared'
import { createMobileDemoStore } from './store'
import { createMobileDemoClient } from './client'
import { setAuthTokenGetter } from '../../api/client'

function sandbox() {
  const store = createMobileDemoStore()
  return { store, resident: createMobileDemoClient(store, 'resident'), guard: createMobileDemoClient(store, 'guard') }
}

afterEach(() => { vi.unstubAllGlobals(); setAuthTokenGetter(null) })

describe('phone demo API', () => {
  it('fills every screen without contacting the API or requesting credentials', async () => {
    const fetch = vi.fn(() => { throw new Error('Network forbidden') })
    const token = vi.fn(async () => 'real-session-token')
    vi.stubGlobal('fetch', fetch)
    vi.stubGlobal('structuredClone', undefined)
    vi.stubGlobal('crypto', undefined)
    setAuthTokenGetter(token)
    const { resident, guard, store } = sandbox()
    const lists = await Promise.all([
      resident.listApartments(), resident.listMyApartments(), resident.listMyResidents(), resident.listVisitors(),
      resident.listNotices(), resident.listTickets(), resident.listBills(), resident.listPayments(),
      resident.listHouseHelp(), resident.listHouseHelpForApartment(store.apartmentId), resident.listVehicles(),
      guard.listGuards(), guard.listActiveDuty(), guard.listHouseHelpEntries({ active: true }),
    ])
    for (const rows of lists) expect(rows.length).toBeGreaterThan(0)
    expect((await resident.getApartmentStatement(store.apartmentId)).closing).toBe(900000)
    expect((await guard.verifyVehicle('demo 2000')).parkingSlots).toHaveLength(1)
    expect((await resident.getSociety())?.name).toContain('Demo')
    await expect(resident.fetchUploadObjectUrl('/uploads/real-file')).rejects.toThrow('not included')
    expect(fetch).not.toHaveBeenCalled()
    expect(token).not.toHaveBeenCalled()
  })

  it('clones responses and keeps independent demo sessions separate', async () => {
    const { resident, store } = sandbox()
    const notices = await resident.listNotices()
    notices[0].title = 'Changed outside the sandbox'
    expect((await resident.listNotices())[0].title).not.toBe(notices[0].title)
    await resident.markNoticeRead(notices[0].id)
    await resident.markNoticeRead(notices[0].id)
    expect((await resident.listNotices())[0]).toMatchObject({ read: true, readCount: 4 })
    expect((await sandbox().resident.listNotices())[0].read).toBe(false)
    const ticket = await resident.createTicket({ apartmentId: store.apartmentId, title: 'Fan repair',
      description: 'The ceiling fan needs repair.', category: 'ELECTRICAL', priority: 'NORMAL' })
    expect(s.ticketSchema.parse(ticket).raisedBy).toBe(store.residentId)
    expect((await resident.listTickets('OPEN')).some(t => t.id === ticket.id)).toBe(true)
  })

  it('updates vehicles and gate verification together', async () => {
    const { resident, guard, store } = sandbox()
    const vehicle = await resident.createVehicle({ apartmentId: store.apartmentId, registrationNumber: 'demo 9999', type: 'CAR' })
    expect(s.vehicleSchema.parse(vehicle).registrationNumber).toBe('DEMO9999')
    expect((await guard.verifyVehicle('demo-9999')).registered).toBe(true)
    await resident.updateVehicle(vehicle.id, { isActive: false })
    expect((await guard.verifyVehicle('demo9999')).registered).toBe(false)
    await expect(resident.createVehicle({ apartmentId: store.apartmentId, registrationNumber: 'DEMO9999', type: 'CAR' })).rejects.toThrow('already registered')
    await expect(resident.updateVehicle(store.data.vehicles[1].id, { isActive: false })).rejects.toThrow('demo apartment')
  })

  it('supports assignments, ratings and house-help check-in and checkout', async () => {
    const { resident, guard, store } = sandbox()
    const helper = (await resident.listHouseHelp())[1]
    const assignment = await resident.assignHouseHelp(helper.id, store.apartmentId)
    expect((await resident.assignHouseHelp(helper.id, store.apartmentId)).id).toBe(assignment.id)
    await resident.rateHouseHelp(helper.id, { rating: 1 })
    expect((await resident.listHouseHelpForApartment(store.apartmentId)).find(h => h.id === helper.id)?.reviewCount).toBe(3)
    const entry = await guard.checkInHouseHelp(helper.id, { apartmentId: store.apartmentId })
    expect(s.houseHelpEntrySchema.safeParse(entry).success).toBe(true)
    await expect(guard.checkInHouseHelp(helper.id)).rejects.toThrow('Already checked in')
    await guard.checkOutHouseHelpEntry(entry.id)
    expect(await guard.listHouseHelpEntries({ active: true, houseHelpId: helper.id })).toHaveLength(0)
    await resident.removeHouseHelpAssignment(helper.id, store.apartmentId)
    expect((await resident.listHouseHelpForApartment(store.apartmentId)).some(h => h.id === helper.id)).toBe(false)
  })

  it('runs guard shifts and rejects duplicate clock-ins', async () => {
    const { guard, resident, store } = sandbox()
    const active = await guard.listActiveDuty()
    await expect(guard.clockInGuard(store.guardId)).rejects.toThrow('Already on duty')
    await guard.clockOutGuard(active[0].id)
    expect(await guard.listActiveDuty()).toHaveLength(0)
    const shift = await guard.clockInGuard(store.guardId)
    expect(s.guardDutySessionSchema.safeParse(shift).success).toBe(true)
    await expect(resident.clockOutGuard(shift.id)).rejects.toThrow('guard')
    await expect(guard.listBills()).rejects.toThrow('resident')
  })
})
