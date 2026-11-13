import * as s from '@opensociety/shared'
import { DEMO_ADMIN, type DemoData } from './data'
import { find, inRange, newRecord, nowIso, type DemoMethods } from './helpers'

export function demoFinance(d: DemoData) {
  const apartment = (id: string) => { const a = find(d.apartments, id); return `${a.tower}-${a.apartmentNo}` }
  const paid = (id: string) => d.payments.filter(p => p.billId === id).reduce((sum, p) => sum + p.amount, 0)
  const bills = () => d.bills.map(b => ({ ...b, paidAmount: paid(b.id), apartment: apartment(b.apartmentId) }))
  const activeBills = () => bills().filter(b => b.status !== 'CANCELLED')
  const account = (code: string) => d.accounts.find(a => a.code === code)!.id
  const postingAccounts = { bank: account('1001'), cash: account('1010'), memberDuesReceivable: account('1100'), memberAdvances: account('2000'), gstOutputPayable: account('2200'), tdsPayable: account('2300'), vendorPayables: account('2100') }
  const createBill = (body: s.CreateBill, periodMonth: string | null = null) => {
    const input = s.createBillSchema.parse(body)
    apartment(input.apartmentId)
    const totals = s.computeBill(input.lineItems)
    const record = newRecord()
    const bill: s.MaintenanceBill = { ...record, apartmentId: input.apartmentId, title: input.title, periodMonth,
      type: periodMonth ? 'MONTHLY' : 'ONE_TIME', subtotal: totals.subtotal, taxAmount: totals.taxAmount, totalAmount: totals.total,
      status: 'ISSUED', dueDate: input.dueDate ?? null, issuedAt: nowIso(), createdBy: DEMO_ADMIN,
      lineItems: totals.lines.map(l => ({ ...newRecord(), ...l, billId: record.id })), paidAmount: 0, apartment: apartment(input.apartmentId) }
    d.bills.unshift(bill)
    return bill
  }
  const journal = (): s.JournalDraft[] => [
    ...activeBills().map(b => s.postBillIssued({ billId: b.id, apartmentId: b.apartmentId, entryDate: b.issuedAt.slice(0, 10), period: b.periodMonth ?? b.issuedAt.slice(0, 7),
      lines: (b.lineItems ?? []).map(l => ({ accountId: l.accountId ?? account('4000'), net: l.amount, tax: l.taxAmount })), accounts: postingAccounts })),
    ...d.payments.map(p => s.postPaymentReceived({ paymentId: p.id, apartmentId: p.apartmentId, amount: p.amount, applied: p.amount, leftoverCredit: 0, method: p.method,
      entryDate: p.paidAt.slice(0, 10), period: p.paidAt.slice(0, 7), accounts: postingAccounts })),
    ...d.expenses.flatMap(e => {
      const entry = s.postExpense({ expenseId: e.id, status: 'PAYABLE', expenseAccountId: e.accountId, amount: e.amount, taxAmount: e.taxAmount,
        tds: e.tdsAmount ?? 0, vendorId: e.vendorId, entryDate: e.createdAt.slice(0, 10), period: e.createdAt.slice(0, 7), accounts: postingAccounts })
      return e.status === 'PAYABLE' ? [entry] : [entry, s.postExpenseSettlement({ expenseId: e.id, vendorId: e.vendorId, method: e.method ?? 'BANK_TRANSFER',
        net: e.amount + e.taxAmount - (e.tdsAmount ?? 0), entryDate: (e.paidAt ?? e.createdAt).slice(0, 10), period: (e.paidAt ?? e.createdAt).slice(0, 7), accounts: postingAccounts })]
    }),
  ]
  const balances = (from?: string, to?: string): s.AccountBalance[] => {
    const entries = journal().filter(j => inRange(j.entryDate, from, to))
    return d.accounts.map(a => ({ ...a, debit: entries.flatMap(j => j.lines).filter(l => l.accountId === a.id).reduce((n, l) => n + l.debit, 0),
      credit: entries.flatMap(j => j.lines).filter(l => l.accountId === a.id).reduce((n, l) => n + l.credit, 0) }))
  }
  const finance = {
    listBills: (params?: { apartmentId?: string; status?: string; period?: string }) => bills().filter(b => (!params?.apartmentId || b.apartmentId === params.apartmentId) && (!params?.status || b.status === params.status) && (!params?.period || b.periodMonth === params.period)),
    getBill: id => find(bills(), id),
    createBill,
    generateBills: body => {
      const input = s.generateBillsSchema.parse(body)
      let created = 0, skipped = 0
      for (const a of d.apartments.filter(a => a.isActive)) {
        if (d.bills.some(b => b.apartmentId === a.id && b.periodMonth === input.periodMonth && b.type === 'MONTHLY')) { skipped++; continue }
        createBill({ ...input, apartmentId: a.id }, input.periodMonth)
        created++
      }
      return { created, skipped }
    },
    cancelBill: id => {
      const bill = find(d.bills, id)
      if (paid(id)) throw new Error('A bill with payments cannot be cancelled.')
      bill.status = 'CANCELLED'
      return bill
    },
    recordPayment: body => {
      const input = s.recordPaymentSchema.parse(body)
      const bill = find(d.bills, input.billId)
      if (bill.status === 'CANCELLED' || input.amount > bill.totalAmount - paid(bill.id)) throw new Error('Payment must not exceed the outstanding amount on an active bill.')
      const payment: s.Payment = { ...newRecord(), ...input, apartmentId: bill.apartmentId, reference: input.reference ?? null, notes: input.notes ?? null, paidAt: input.paidAt ?? nowIso(), recordedBy: DEMO_ADMIN }
      d.payments.unshift(payment)
      bill.status = s.billStatusFor(bill.totalAmount, paid(bill.id))
      bill.updatedAt = nowIso()
      return payment
    },
    listPayments: params => d.payments.filter(p => (!params?.apartmentId || p.apartmentId === params.apartmentId) && (!params?.billId || p.billId === params.billId)),
    listDues: () => d.apartments.map(a => {
      const rows = activeBills().filter(b => b.apartmentId === a.id)
      const billed = rows.reduce((n, b) => n + b.totalAmount, 0), paid = rows.reduce((n, b) => n + b.paidAmount, 0)
      return { apartmentId: a.id, apartment: apartment(a.id), billed, paid, outstanding: billed - paid }
    }),
    getBillConfig: () => d.billConfig,
    updateBillConfig: body => Object.assign(d.billConfig, s.updateBillConfigSchema.parse(body), { updatedAt: nowIso() }),
    listAccounts: () => d.accounts,
    initLedger: () => ({ inserted: 0, total: d.accounts.length }),
    getTrialBalance: (toDate?: string) => ({ ...s.trialBalance(balances(undefined, toDate)), toDate: toDate ?? null }),
    getIncomeExpenditure: (fromDate?: string, toDate?: string) => ({ ...s.incomeExpenditure(balances(fromDate, toDate)), fromDate: fromDate ?? null, toDate: toDate ?? null }),
    getBalanceSheet: (toDate?: string) => ({ ...s.balanceSheet(balances(undefined, toDate), s.incomeExpenditure(balances(undefined, toDate)).surplus), toDate: toDate ?? null }),
    getReceiptsPayments: (fromDate?: string, toDate?: string) => {
      const entries = journal()
      const opening = entries.filter(j => fromDate && j.entryDate < fromDate).flatMap(j => j.lines).filter(l => [postingAccounts.bank, postingAccounts.cash].includes(l.accountId)).reduce((n, l) => n + l.debit - l.credit, 0)
      const lines = entries.filter(j => inRange(j.entryDate, fromDate, toDate)).flatMap((j, i) => j.lines.map(l => {
        const a = find(d.accounts, l.accountId)
        return { entryId: String(i), accountCode: a.code, accountName: a.name, debit: l.debit, credit: l.credit, isCashBank: ['1001', '1010'].includes(a.code) }
      }))
      return { ...s.receiptsAndPayments(lines, opening), fromDate: fromDate ?? null, toDate: toDate ?? null }
    },
    getAging: (asOf = nowIso().slice(0, 10)) => {
      const byApartment = d.apartments.map(a => {
        const rows = activeBills().filter(b => b.apartmentId === a.id && b.issuedAt.slice(0, 10) <= asOf.slice(0, 10))
        const buckets = s.bucketAging(rows.map(b => ({ outstanding: b.totalAmount - d.payments.filter(p => p.billId === b.id && p.paidAt.slice(0, 10) <= asOf.slice(0, 10)).reduce((n, p) => n + p.amount, 0), dueDateMs: Date.parse(b.dueDate ?? b.issuedAt) })), Date.parse(asOf))
        return { apartmentId: a.id, apartment: apartment(a.id), buckets, outstanding: Object.values(buckets).reduce((n, v) => n + v, 0) }
      })
      const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
      for (const a of byApartment) for (const key of s.AGING_BUCKETS) buckets[key] += a.buckets[key]
      return { asOf, byApartment, buckets, total: Object.values(buckets).reduce((n, v) => n + v, 0) }
    },
    getApartmentStatement: (apartmentId: string, from?: string, to?: string) => {
      const entries: s.StatementEntryInput[] = [
        ...activeBills().filter(b => b.apartmentId === apartmentId).map(b => ({ date: b.issuedAt, type: 'BILL' as const, description: b.title, debit: b.totalAmount, credit: 0, ref: b.id })),
        ...d.payments.filter(p => p.apartmentId === apartmentId).map(p => ({ date: p.paidAt, type: 'PAYMENT' as const, description: `Payment (${p.method})`, debit: 0, credit: p.amount, ref: p.id })),
      ]
      const opening = entries.filter(e => from && e.date.slice(0, 10) < from).reduce((n, e) => n + e.debit - e.credit, 0)
      return { ...s.buildStatement(entries.filter(e => inRange(e.date, from, to)), opening), apartmentId, apartment: apartment(apartmentId), from: from ?? null, to: to ?? null }
    },
    getFinanceReport: () => {
      const rows = activeBills()
      const byMonth = [...new Set(rows.map(b => b.periodMonth ?? b.issuedAt.slice(0, 7)))].sort().map(period => {
        const monthly = rows.filter(b => (b.periodMonth ?? b.issuedAt.slice(0, 7)) === period)
        return { period, billed: monthly.reduce((n, b) => n + b.totalAmount, 0), collected: monthly.reduce((n, b) => n + b.paidAmount, 0) }
      })
      const byMethod = [...new Set(d.payments.map(p => p.method))].map(method => ({ method, amount: d.payments.filter(p => p.method === method).reduce((n, p) => n + p.amount, 0) }))
      return { byMonth, byMethod, totalBilled: rows.reduce((n, b) => n + b.totalAmount, 0), totalCollected: d.payments.reduce((n, p) => n + p.amount, 0),
        cashBankBalance: balances().filter(a => ['1001', '1010'].includes(a.code)).reduce((n, a) => n + a.debit - a.credit, 0) }
    },
    getInterestPreview: (asOf = nowIso()) => ({ enabled: d.billConfig.interestEnabled, ratePct: d.billConfig.interestRatePct, graceDays: d.billConfig.gracePeriodDays, asOf,
      rows: d.billConfig.interestEnabled ? d.apartments.map(a => ({ apartmentId: a.id, apartment: apartment(a.id), interest: activeBills().filter(b => b.apartmentId === a.id && b.type === 'MONTHLY').reduce((n, b) => n + s.computeInterest(b.totalAmount - b.paidAmount, Date.parse(b.dueDate ?? b.issuedAt), Date.parse(asOf), d.billConfig.interestRatePct, d.billConfig.gracePeriodDays), 0) })).filter(r => r.interest > 0) : [] }),
  } satisfies Partial<DemoMethods>
  return { ...finance,
    getCollectionAnalytics: () => {
      const report = finance.getFinanceReport(), rows = activeBills()
      const payers = s.analyzePayers(rows.filter(b => b.dueDate).map(b => ({ dueDateMs: Date.parse(b.dueDate!), total: b.totalAmount, paid: b.paidAmount,
        lastPaidAtMs: d.payments.some(p => p.billId === b.id) ? Math.max(...d.payments.filter(p => p.billId === b.id).map(p => Date.parse(p.paidAt))) : null })))
      return { ...report, byMonth: report.byMonth.map(m => ({ ...m, ratePct: s.collectionRatePct(m.billed, m.collected) })),
        byTower: [...new Set(d.apartments.map(a => a.tower))].map(tower => { const bs = rows.filter(b => find(d.apartments, b.apartmentId).tower === tower); return { tower, billed: bs.reduce((n, b) => n + b.totalAmount, 0), collected: bs.reduce((n, b) => n + b.paidAmount, 0) } }),
        payers, overallRatePct: s.collectionRatePct(report.totalBilled, report.totalCollected), fullyPaidPct: s.collectionRatePct(rows.length, payers.fullyPaid) }
    },
    applyInterest: asOf => {
      const preview = finance.getInterestPreview(asOf), period = (asOf ?? nowIso()).slice(0, 7)
      let created = 0, skipped = 0
      for (const row of preview.rows) {
        const title = `${s.INTEREST_BILL_TITLE_PREFIX} ${period}`
        if (d.bills.some(b => b.apartmentId === row.apartmentId && b.title === title)) { skipped++; continue }
        createBill({ apartmentId: row.apartmentId, title, lineItems: [{ description: title, amount: row.interest, taxRatePct: 0, accountId: account('4100') }] })
        created++
      }
      return { created, skipped, period }
    },
    journal,
  } satisfies Partial<DemoMethods> & { journal: () => s.JournalDraft[] }
}
