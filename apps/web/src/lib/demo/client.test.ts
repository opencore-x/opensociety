import { afterEach, describe, expect, it, vi } from 'vitest'
import { apiClient, setAuthTokenGetter, type ApiClient } from '../api'
import { createDemoClient, resetDemoClient } from './client'
import { createDemoData } from './data'
import { isDemoPath } from './mode'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); setAuthTokenGetter(null); resetDemoClient() })

describe('demo sandbox', () => {
  it('serves every dashboard read without fetching or asking Clerk for credentials', async () => {
    vi.stubGlobal('window', { location: { pathname: '/demo/reports' } })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Live API must not be called'))
    const token = vi.fn().mockResolvedValue('real-token'); setAuthTokenGetter(token)
    const d = createDemoData()
    const reads: [keyof ApiClient, unknown[]][] = [
      ['health', []], ['getSociety', []], ['listApartments', []], ['listUsers', []], ['listGuards', []],
      ['listGuardDevices', [d.guards[0].id]], ['listActiveDuty', []], ['listDutySessions', []],
      ['listVisitors', []], ['listPreApprovals', []], ['listNotices', []], ['listNoticeReads', [d.notices[0].id]],
      ['listTickets', []], ['listHouseHelp', []], ['getHouseHelpReviews', [d.houseHelp[0].id]],
      ['listHouseHelpAssignments', [d.houseHelp[0].id]], ['listHouseHelpEntries', []],
      ['listVehicles', []], ['listVehicleGateLog', []], ['listParkingSlots', []], ['listParkingDirectory', []], ['listVisitorParking', []],
      ['listBills', []], ['getBill', [d.bills[0].id]], ['listDues', []], ['listPayments', []], ['getBillConfig', []],
      ['getFinanceReport', []], ['getCollectionAnalytics', []], ['getTrialBalance', []], ['getIncomeExpenditure', []],
      ['getBalanceSheet', []], ['getReceiptsPayments', []], ['getAging', []], ['listAccounts', []],
      ['listVendors', []], ['listExpenses', []], ['getTdsSummary', []], ['getInterestPreview', []],
      ['getApartmentStatement', [d.apartments[0].id]], ['getVisitorTrends', []], ['getHouseHelpAnalytics', []], ['getMaintenanceAnalytics', []],
    ]
    for (const [method, args] of reads) {
      const value = await Reflect.apply(apiClient[method], apiClient, args)
      expect(value, method).toBeTruthy()
      if (Array.isArray(value)) expect(value.length, method).toBeGreaterThan(0)
    }
    await apiClient.createNotice({ title: 'Demo notice', body: 'Only in this tab', category: 'GENERAL', priority: 'NORMAL' })
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:demo')
    const file = new File(['sample'], 'sample.txt', { type: 'text/plain' })
    const uploaded = await apiClient.uploadFile(file)
    expect(await apiClient.fetchUploadObjectUrl(uploaded.url)).toBe('blob:demo')
    await expect(apiClient.fetchUploadObjectUrl('/uploads/real-secret')).rejects.toThrow()
    expect(await apiClient.invoiceObjectUrl(d.bills[0].id)).toBe('blob:demo')
    expect(await apiClient.visitorTrendsPdfObjectUrl()).toBe('blob:demo')
    expect(await apiClient.reportExportObjectUrl('/reports/trial-balance?format=csv')).toBe('blob:demo')
    await expect(apiClient.reportExportObjectUrl('/uploads/real-secret')).rejects.toThrow()
    expect(token).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('keeps visitors and cached results isolated and restores a fresh demo', async () => {
    const d = createDemoData(), a = createDemoClient(d), b = createDemoClient(d)
    const rows = await a.listApartments()
    rows[0].tower = 'Cache mutation'
    expect((await a.listApartments())[0].tower).toBe('A')
    await a.updateApartment(d.apartments[0].id, { tower: 'Changed' })
    expect((await b.listApartments())[0].tower).toBe('A')
    expect(d.apartments[0].tower).toBe('A')
    vi.stubGlobal('window', { location: { pathname: '/demo' } })
    await apiClient.updateApartment(d.apartments[0].id, { tower: 'Changed' })
    resetDemoClient()
    expect((await apiClient.listApartments())[0].tower).toBe('A')
  })

  it('updates visitor and ticket lifecycles, including linked parking and analytics', async () => {
    const d = createDemoData(), c = createDemoClient(d)
    const visitor = d.visitors[0]
    await c.approveVisitor(visitor.id)
    await expect(c.approveVisitor(visitor.id)).rejects.toThrow()
    await c.checkInVisitor(visitor.id)
    expect((await c.checkOutVisitor(visitor.id)).status).toBe('EXITED')
    await c.checkOutVisitor(d.visitors[2].id)
    expect((await c.listVisitorParking()).summary.occupied).toBe(0)
    const pa = d.preApprovals[0]
    await c.redeemPreApproval(pa.code)
    await expect(c.redeemPreApproval(pa.code)).rejects.toThrow('exhausted')
    const ticket = d.tickets[0], before = await c.getMaintenanceAnalytics()
    await c.assignTicket(ticket.id, d.users[7].id)
    await c.transitionTicket(ticket.id, 'start')
    await c.transitionTicket(ticket.id, 'resolve', 'Replaced the washer')
    expect((await c.getMaintenanceAnalytics()).pending).toBe(before.pending - 1)
    await expect(c.transitionTicket(ticket.id, 'start')).rejects.toThrow()
  })

  it('supports household, resident and notice actions with filters', async () => {
    const d = createDemoData(), c = createDemoClient(d)
    await c.approveUser(d.users[5].id, { apartmentId: d.apartments[1].id, relation: 'TENANT', isPrimary: true })
    expect((await c.listUsers('PENDING')).map(u => u.id)).not.toContain(d.users[5].id)
    const h = d.houseHelp[2]
    await c.updateHouseHelpVerification(h.id, { idVerified: true, backgroundCheck: 'CLEARED' })
    expect((await c.listHouseHelp('DRIVER'))[0].verificationLevel).toBe('VERIFIED')
    await c.assignHouseHelp(h.id, d.apartments[1].id)
    await c.removeHouseHelpAssignment(h.id, d.apartments[1].id)
    expect(await c.listHouseHelpAssignments(h.id)).toHaveLength(1)
    await c.createHouseHelpReview(h.id, { rating: 5, comment: 'Good work' })
    expect((await c.getHouseHelpReviews(h.id)).summary.count).toBe(3)
    await c.createNotice({ title: 'Picnic', body: 'Meet in the garden', category: 'EVENT', priority: 'NORMAL' })
    expect(await c.listNotices({ q: 'picnic', category: 'EVENT' })).toHaveLength(1)
    expect(await c.listNotices({ q: 'picnic', category: 'SECURITY' })).toHaveLength(0)
    expect(await c.listDutySessions({ from: '2000-01-01', to: '2000-01-02' })).toHaveLength(0)
  })

  it('settles expenses once and updates balanced statements', async () => {
    const c = createDemoClient(), expense = (await c.listExpenses({ status: 'PAYABLE' }))[0]
    const before = await c.getFinanceReport()
    await c.payExpense(expense.id)
    expect((await c.getFinanceReport()).cashBankBalance).toBe(before.cashBankBalance - expense.amount - expense.taxAmount + (expense.tdsAmount ?? 0))
    expect((await c.getTrialBalance()).balanced).toBe(true)
    expect((await c.getBalanceSheet()).balanced).toBe(true)
    await expect(c.payExpense(expense.id)).rejects.toThrow()
  })

  it('keeps the live client and its authentication outside demo routes', async () => {
    expect(isDemoPath('/demo')).toBe(true)
    expect(isDemoPath('/demo/billing')).toBe(true)
    expect(isDemoPath('/demography')).toBe(false)
    vi.stubGlobal('window', { location: { pathname: '/admin' } })
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ status: 'ok' })))
    const token = vi.fn().mockResolvedValue('real-token'); setAuthTokenGetter(token)
    await apiClient.health()
    expect(token).toHaveBeenCalledOnce()
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining('/health'), expect.objectContaining({ headers: expect.objectContaining({ authorization: 'Bearer real-token' }) }))
  })
})
