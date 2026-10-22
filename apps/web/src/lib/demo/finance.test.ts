import { describe, expect, it } from 'vitest'
import { createDemoData } from './data'
import { demoFinance } from './finance'

describe('demo finance', () => {
  it('reconciles dues, statements, cash flow and the ledger after a payment', () => {
    const f = demoFinance(createDemoData())
    const bill = f.listBills().find(b => b.status === 'ISSUED')!
    const before = f.getFinanceReport()
    f.recordPayment({ billId: bill.id, amount: 100000, method: 'UPI' })
    expect(f.getBill(bill.id).status).toBe('PARTIALLY_PAID')
    expect(f.getFinanceReport().totalCollected).toBe(before.totalCollected + 100000)
    expect(f.getFinanceReport().cashBankBalance).toBe(before.cashBankBalance + 100000)
    const dues = f.listDues().find(a => a.apartmentId === bill.apartmentId)!
    expect(f.getApartmentStatement(bill.apartmentId).closing).toBe(dues.outstanding)
    expect(f.getTrialBalance().balanced).toBe(true)
    expect(f.getBalanceSheet().balanced).toBe(true)
    expect(f.getReceiptsPayments().closingBalance).toBe(f.getFinanceReport().cashBankBalance)
    expect(() => f.recordPayment({ billId: bill.id, amount: bill.totalAmount, method: 'UPI' })).toThrow()
    expect(() => f.cancelBill(bill.id)).toThrow()
  })

  it('generates monthly bills once and excludes cancellations from reports', () => {
    const d = createDemoData(), f = demoFinance(d)
    const input = { periodMonth: '2031-02', title: 'February maintenance', lineItems: [{ description: 'Maintenance', amount: 10000, taxRatePct: 18 }] }
    expect(f.generateBills(input)).toEqual({ created: 12, skipped: 0 })
    expect(f.generateBills(input)).toEqual({ created: 0, skipped: 12 })
    const bill = f.listBills({ period: '2031-02' })[0], before = f.getFinanceReport()
    expect(bill.totalAmount).toBe(11800)
    f.cancelBill(bill.id)
    expect(f.getFinanceReport().totalBilled).toBe(before.totalBilled - 11800)
    expect(f.getTrialBalance().balanced).toBe(true)
    expect(() => f.recordPayment({ billId: bill.id, amount: 100, method: 'CASH' })).toThrow()
  })

  it('honors date ranges and carries forward the opening balance', () => {
    const d = createDemoData(new Date('2030-03-25T12:00:00Z')), f = demoFinance(d)
    const id = d.apartments[0].id
    const previous = f.getApartmentStatement(id, undefined, '2030-02-28')
    const current = f.getApartmentStatement(id, '2030-03-01')
    expect(current.opening).toBe(previous.closing)
    expect(current.entries.every(e => e.date >= '2030-03-01')).toBe(true)
    expect(f.getTrialBalance('2029-12-31').rows).toHaveLength(0)
    expect(f.getAging('2030-03-25').total).toBe(f.listDues().reduce((n, a) => n + a.outstanding, 0))
  })

  it('calculates overdue interest and prevents repeated charges in the same month', () => {
    const f = demoFinance(createDemoData(new Date('2030-03-25T12:00:00Z')))
    const preview = f.getInterestPreview('2030-03-25')
    expect(preview.rows.length).toBeGreaterThan(0)
    expect(f.applyInterest('2030-03-25').created).toBe(preview.rows.length)
    expect(f.applyInterest('2030-03-25').created).toBe(0)
    expect(f.getTrialBalance().balanced).toBe(true)
    f.updateBillConfig({ dueDayOfMonth: 10, lineItems: [], interestEnabled: false, interestRatePct: 18, gracePeriodDays: 15 })
    expect(f.getInterestPreview().rows).toEqual([])
  })
})
