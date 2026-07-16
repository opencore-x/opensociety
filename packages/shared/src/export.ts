import type { TrialBalance, IncomeExpenditure, BalanceSheet, ReceiptsPayments } from './statements'
import type { DuesRow } from './finance'

// Report export helpers (#99). Pure: turn each financial report into a tabular
// matrix (for XLSX/CSV) and build Tally-import XML. Amounts are shown in rupees
// (paise / 100) since that is what accountants/Excel expect in an export.

export type CellValue = string | number | null
export type Table = { name: string; rows: CellValue[][] }

const rupees = (paise: number): number => Math.round(paise) / 100

// ----- Report → table (rows) -----

export function trialBalanceTable(tb: TrialBalance): Table {
  const rows: CellValue[][] = [['Code', 'Account', 'Type', 'Debit', 'Credit']]
  for (const r of tb.rows) rows.push([r.code, r.name, r.type, rupees(r.debit), rupees(r.credit)])
  rows.push(['', 'Total', '', rupees(tb.totalDebit), rupees(tb.totalCredit)])
  return { name: 'Trial Balance', rows }
}

export function incomeExpenditureTable(ie: IncomeExpenditure): Table {
  const rows: CellValue[][] = [['Section', 'Code', 'Account', 'Amount']]
  for (const r of ie.income) rows.push(['Income', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Total Income', rupees(ie.totalIncome)])
  for (const r of ie.expense) rows.push(['Expenditure', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Total Expenditure', rupees(ie.totalExpense)])
  rows.push(['', '', ie.surplus >= 0 ? 'Surplus' : 'Deficit', rupees(ie.surplus)])
  rows.push(['', '', 'Mutual (exempt) income', rupees(ie.mutualIncome)])
  rows.push(['', '', 'Non-mutual (taxable) income', rupees(ie.nonMutualIncome)])
  return { name: 'Income & Expenditure', rows }
}

export function balanceSheetTable(bs: BalanceSheet): Table {
  const rows: CellValue[][] = [['Section', 'Code', 'Account', 'Amount']]
  for (const r of bs.assets) rows.push(['Assets', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Total Assets', rupees(bs.totalAssets)])
  for (const r of bs.liabilities) rows.push(['Liabilities', r.code, r.name, rupees(r.amount)])
  for (const r of bs.funds) rows.push(['Funds', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Current Surplus/Deficit', rupees(bs.currentSurplus)])
  rows.push(['', '', 'Total Liabilities & Funds', rupees(bs.totalLiabilitiesAndFunds)])
  return { name: 'Balance Sheet', rows }
}

export function receiptsPaymentsTable(rp: ReceiptsPayments): Table {
  const rows: CellValue[][] = [['Section', 'Code', 'Account', 'Amount']]
  rows.push(['Opening', '', 'Opening Balance (Cash + Bank)', rupees(rp.openingBalance)])
  for (const r of rp.receipts) rows.push(['Receipts', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Total Receipts', rupees(rp.totalReceipts)])
  for (const r of rp.payments) rows.push(['Payments', r.code, r.name, rupees(r.amount)])
  rows.push(['', '', 'Total Payments', rupees(rp.totalPayments)])
  rows.push(['Closing', '', 'Closing Balance (Cash + Bank)', rupees(rp.closingBalance)])
  return { name: 'Receipts & Payments', rows }
}

export function duesTable(dues: DuesRow[]): Table {
  const rows: CellValue[][] = [['Apartment', 'Billed', 'Paid', 'Outstanding']]
  for (const r of dues) rows.push([r.apartment ?? r.apartmentId, rupees(r.billed), rupees(r.paid), rupees(r.outstanding)])
  return { name: 'Outstanding Dues', rows }
}

// ----- CSV -----

function csvCell(v: CellValue): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function tableToCsv(rows: CellValue[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\n')
}

// ----- Tally XML (import) -----

export type TallyLedgerEntry = { ledger: string; debit: number; credit: number } // paise
export type TallyVoucher = {
  date: string // 'YYYY-MM-DD'
  type: 'Receipt' | 'Payment' | 'Journal' | 'Contra'
  narration: string
  entries: TallyLedgerEntry[]
}
export type TallyLedgerMaster = { name: string; parent: string }

function tallyEscape(s: string): string {
  return s.replace(/[<>&]/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' })[ch]!)
}

const tallyDate = (iso: string): string => iso.slice(0, 10).replace(/-/g, '')
const tallyAmount = (paise: number): string => (paise / 100).toFixed(2)

// Map a chart-of-accounts type to a default Tally parent group.
export function tallyParentForType(type: string): string {
  switch (type) {
    case 'ASSET':
      return 'Current Assets'
    case 'LIABILITY':
      return 'Current Liabilities'
    case 'INCOME':
      return 'Indirect Incomes'
    case 'EXPENSE':
      return 'Indirect Expenses'
    case 'FUND':
      return 'Capital Account'
    default:
      return 'Suspense A/c'
  }
}

// Build a Tally-import ENVELOPE with ledger masters + vouchers. Debits carry a
// negative AMOUNT (ISDEEMEDPOSITIVE=Yes), credits a positive one — Tally's
// import convention.
export function buildTallyXml(vouchers: TallyVoucher[], ledgers: TallyLedgerMaster[]): string {
  const masters = ledgers
    .map(
      (l) =>
        `<TALLYMESSAGE xmlns:UDF="TallyUDF"><LEDGER NAME="${tallyEscape(l.name)}" ACTION="Create"><NAME>${tallyEscape(l.name)}</NAME><PARENT>${tallyEscape(l.parent)}</PARENT></LEDGER></TALLYMESSAGE>`,
    )
    .join('')

  const vouchersXml = vouchers
    .map((v) => {
      const legs = v.entries
        .map((e) => {
          const isDebit = e.debit > 0
          const amount = isDebit ? `-${tallyAmount(e.debit)}` : tallyAmount(e.credit)
          return `<ALLLEDGERENTRIES.LIST><LEDGERNAME>${tallyEscape(e.ledger)}</LEDGERNAME><ISDEEMEDPOSITIVE>${isDebit ? 'Yes' : 'No'}</ISDEEMEDPOSITIVE><AMOUNT>${amount}</AMOUNT></ALLLEDGERENTRIES.LIST>`
        })
        .join('')
      return `<TALLYMESSAGE xmlns:UDF="TallyUDF"><VOUCHER VCHTYPE="${v.type}" ACTION="Create"><DATE>${tallyDate(v.date)}</DATE><NARRATION>${tallyEscape(v.narration)}</NARRATION><VOUCHERTYPENAME>${v.type}</VOUCHERTYPENAME>${legs}</VOUCHER></TALLYMESSAGE>`
    })
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?><ENVELOPE><HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER><BODY><IMPORTDATA><REQUESTDESC><REPORTNAME>All Masters</REPORTNAME></REQUESTDESC><REQUESTDATA>${masters}${vouchersXml}</REQUESTDATA></IMPORTDATA></BODY></ENVELOPE>`
}
