import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

// The standard PDF fonts (WinAnsi) can't encode the ₹ glyph, so invoices use "Rs".
function money(paise: number): string {
  return `Rs ${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export type InvoiceData = {
  society: { name: string; address: string; city: string; state: string; pincode: string; gstin: string | null }
  apartment: string
  invoiceNo: string
  bill: {
    title: string
    periodMonth: string | null
    status: string
    dueDate: string | null
    subtotal: number
    taxAmount: number
    totalAmount: number
  }
  lineItems: { description: string; amount: number; taxRatePct: number; taxAmount: number }[]
  paidAmount: number
}

export async function renderInvoicePdf(data: InvoiceData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const grey = rgb(0.4, 0.4, 0.4)

  const text = (s: string, x: number, y: number, size = 10, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(s, { x, y, size, font: f, color })

  let y = 792
  text(data.society.name, 50, y, 18, bold)
  y -= 20
  text(`${data.society.address}, ${data.society.city}, ${data.society.state} ${data.society.pincode}`, 50, y, 9, font, grey)
  y -= 13
  if (data.society.gstin) {
    text(`GSTIN: ${data.society.gstin}`, 50, y, 9, font, grey)
    y -= 13
  }

  y -= 14
  text('TAX INVOICE', 50, y, 14, bold)
  y -= 20
  text(`Invoice: ${data.invoiceNo}`, 50, y, 9)
  text(`Flat: ${data.apartment}`, 320, y, 9)
  y -= 13
  text(`Bill: ${data.bill.title}`, 50, y, 9)
  y -= 13
  text(`Period: ${data.bill.periodMonth ?? 'One-time'}`, 50, y, 9)
  text(`Due: ${data.bill.dueDate ? new Date(data.bill.dueDate).toLocaleDateString('en-IN') : '-'}`, 320, y, 9)
  y -= 26

  // Line items table
  text('Description', 50, y, 9, bold)
  text('Amount', 300, y, 9, bold)
  text('GST%', 380, y, 9, bold)
  text('Tax', 430, y, 9, bold)
  text('Total', 500, y, 9, bold)
  y -= 4
  page.drawLine({ start: { x: 50, y }, end: { x: 545, y }, thickness: 0.5, color: grey })
  y -= 14
  for (const li of data.lineItems) {
    text(li.description.slice(0, 40), 50, y, 9)
    text(money(li.amount), 300, y, 9)
    text(`${li.taxRatePct}%`, 380, y, 9)
    text(money(li.taxAmount), 430, y, 9)
    text(money(li.amount + li.taxAmount), 500, y, 9)
    y -= 14
  }

  y -= 6
  page.drawLine({ start: { x: 330, y }, end: { x: 545, y }, thickness: 0.5, color: grey })
  y -= 16
  text('Subtotal', 380, y, 10)
  text(money(data.bill.subtotal), 480, y, 10)
  y -= 14
  text('GST', 380, y, 10)
  text(money(data.bill.taxAmount), 480, y, 10)
  y -= 16
  text('Total', 380, y, 11, bold)
  text(money(data.bill.totalAmount), 480, y, 11, bold)
  y -= 14
  text('Paid', 380, y, 10)
  text(money(data.paidAmount), 480, y, 10)
  y -= 16
  text('Balance due', 380, y, 11, bold)
  text(money(data.bill.totalAmount - data.paidAmount), 480, y, 11, bold)

  y -= 40
  text(`Status: ${data.bill.status}`, 50, y, 10)
  y -= 24
  text('Payment: pay via UPI / cash / cheque at the society office and quote the invoice number.', 50, y, 8, font, grey)

  return doc.save()
}
