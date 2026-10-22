import { describe, expect, it } from 'vitest'
import * as s from '@opensociety/shared'
import { createDemoData } from './data'

describe('demo society', () => {
  it('populates every dashboard collection with valid contracts', () => {
    const d = createDemoData()
    const collections = [
      [d.apartments, s.apartmentSchema], [d.users, s.userSchema], [d.guards, s.guardSchema],
      [d.duty, s.guardDutySessionSchema], [d.devices, s.guardDeviceSchema], [d.visitors, s.visitorEntrySchema],
      [d.preApprovals, s.visitorPreApprovalSchema], [d.notices, s.noticeSchema], [d.tickets, s.ticketSchema],
      [d.houseHelp, s.houseHelpSchema], [d.reviews, s.houseHelpReviewSchema], [d.assignments, s.houseHelpAssignmentSchema],
      [d.vehicles, s.vehicleSchema], [d.accounts, s.accountSchema], [d.bills, s.maintenanceBillSchema],
      [d.payments, s.paymentSchema], [d.vendors, s.vendorSchema], [d.expenses, s.expenseSchema],
    ] as const
    for (const [rows, schema] of collections) {
      expect(rows.length).toBeGreaterThan(0)
      for (const row of rows) expect(schema.safeParse(row).success, JSON.stringify(row)).toBe(true)
    }
    expect(s.societyConfigSchema.safeParse(d.society).success).toBe(true)
    expect(s.billConfigSchema.safeParse(d.billConfig).success).toBe(true)
    expect(d.attendance.length).toBeGreaterThan(0)
    expect(d.parking.some(p => p.isVisitor && p.occupiedByEntryId)).toBe(true)
  })

  it('links records and reconciles bill balances to payments', () => {
    const d = createDemoData()
    const apartmentIds = new Set(d.apartments.map(a => a.id))
    for (const row of [...d.bills, ...d.visitors, ...d.vehicles, ...d.tickets, ...d.assignments]) {
      expect(apartmentIds.has(row.apartmentId)).toBe(true)
    }
    for (const bill of d.bills) {
      const paid = d.payments.filter(p => p.billId === bill.id).reduce((sum, p) => sum + p.amount, 0)
      expect(bill.paidAmount).toBe(paid)
      expect(bill.status).toBe(s.billStatusFor(bill.totalAmount, paid))
    }
  })

  it('refreshes dates for each visit and never shares mutable records', () => {
    const now = new Date('2030-01-01T12:00:00Z')
    const a = createDemoData(now)
    const b = createDemoData(now)
    a.apartments[0].tower = 'Changed'
    expect(b.apartments[0].tower).toBe('A')
    expect(b.bills.some(bill => bill.periodMonth === '2030-01')).toBe(true)
    expect(b.preApprovals.every(p => new Date(p.validUntil!).getTime() > now.getTime())).toBe(true)
  })
})
