import * as s from '@opensociety/shared'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import type { DemoData } from './data'
import { demoFinance } from './finance'
import { find } from './helpers'

export async function exportTable(table: s.Table, format: string) {
  let blob: Blob
  if (format === 'csv') blob = new Blob([s.tableToCsv(table.rows)], { type: 'text/csv;charset=utf-8' })
  else if (format === 'xlsx') blob = new Blob([new Uint8Array(s.buildXlsx([table]))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  else if (format === 'pdf') {
    const pdf = await PDFDocument.create(), font = await pdf.embedFont(StandardFonts.Helvetica)
    let page = pdf.addPage([842, 595]), y = 555
    const draw = (value: string) => {
      // The built-in PDF font supports Latin text. Keep user-entered Unicode
      // out of its encoder; the CSV and Excel exports preserve it in full.
      const line = value.replace(/[^\x20-\x7e]/g, '?')
      for (let offset = 0; offset < Math.max(1, line.length); offset += 120) {
        if (y < 35) { page = pdf.addPage([842, 595]); y = 555 }
        page.drawText(line.slice(offset, offset + 120), { x: 35, y, size: 10, font }); y -= 17
      }
    }
    draw('OpenSociety demo | Fictional sample data | Amounts in INR')
    draw(table.name)
    for (const row of table.rows) draw(row.map(cell => cell ?? '').join('  |  '))
    blob = new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
  } else throw new Error('Unsupported demo export format.')
  return URL.createObjectURL(blob)
}

export async function exportReport(d: DemoData, path: string) {
  const url = new URL(path, 'https://demo.invalid'), f = demoFinance(d)
  const from = url.searchParams.get('fromDate') ?? undefined, to = url.searchParams.get('toDate') ?? undefined
  if (url.pathname === '/reports/tally-export') {
    const vouchers: s.TallyVoucher[] = f.journal().map(j => ({ date: j.entryDate, type: j.sourceType === 'PAYMENT' ? 'Receipt' : 'Journal',
      narration: `DEMO: ${j.narration}`, entries: j.lines.map(l => ({ ledger: find(d.accounts, l.accountId).name, debit: l.debit, credit: l.credit })) }))
    const xml = s.buildTallyXml(vouchers, d.accounts.filter(a => !a.isGroup).map(a => ({ name: a.name, parent: s.tallyParentForType(a.type) })))
    return URL.createObjectURL(new Blob([xml], { type: 'application/xml' }))
  }
  let table: s.Table
  switch (url.pathname) {
    case '/reports/trial-balance': table = s.trialBalanceTable(f.getTrialBalance(to)); break
    case '/reports/income-expenditure': table = s.incomeExpenditureTable(f.getIncomeExpenditure(from, to)); break
    case '/reports/balance-sheet': table = s.balanceSheetTable(f.getBalanceSheet(to)); break
    case '/reports/receipts-payments': table = s.receiptsPaymentsTable(f.getReceiptsPayments(from, to)); break
    case '/bills/dues': table = s.duesTable(f.listDues()); break
    default: throw new Error('This report is not available in the demo.')
  }
  return exportTable(table, url.searchParams.get('format') ?? 'pdf')
}
