import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import type { Table } from '@opensociety/shared'

// Print-ready PDF of a financial statement (#99). Renders a report Table (its
// first row is the header) as a paginated A4 table: first column left-aligned,
// numeric columns right-aligned. WinAnsi fonts can't encode ₹, so amounts use a
// plain grouped number (the section title names the currency context).
export async function renderTablePdf(opts: { society: string; title: string; meta?: string; table: Table }): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const grey = rgb(0.4, 0.4, 0.4)

  const marginX = 50
  const pageW = 595
  const pageH = 842
  const rows = opts.table.rows
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0)
  // First column takes ~45% of the content width; the rest split evenly.
  const contentW = pageW - marginX * 2
  const firstW = Math.round(contentW * 0.45)
  const restW = cols > 1 ? (contentW - firstW) / (cols - 1) : 0
  const colRight = (i: number) => (i === 0 ? marginX : marginX + firstW + i * restW)
  const colLeft = (i: number) => (i === 0 ? marginX : marginX + firstW + (i - 1) * restW)

  const fmt = (v: string | number | null): string => {
    if (v === null || v === undefined) return ''
    if (typeof v === 'number') return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    return v
  }

  let page = doc.addPage([pageW, pageH])
  let y = pageH - 50
  const newPage = () => {
    page = doc.addPage([pageW, pageH])
    y = pageH - 50
  }
  // WinAnsi (the StandardFont encoding) can't encode ₹; fall back to "Rs".
  const wa = (s: string): string => s.replace(/₹/g, 'Rs')
  const text = (raw: string, x: number, yy: number, size = 9, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(wa(raw), { x, y: yy, size, font: f, color })
  const rightText = (raw: string, xRight: number, yy: number, size = 9, f = font) => {
    const s = wa(raw)
    page.drawText(s, { x: xRight - f.widthOfTextAtSize(s, size), y: yy, size, font: f })
  }

  text(opts.society, marginX, y, 16, bold)
  y -= 18
  text(opts.title, marginX, y, 12, bold)
  y -= 14
  if (opts.meta) {
    text(opts.meta, marginX, y, 9, font, grey)
    y -= 14
  }
  y -= 6

  const drawRow = (row: (string | number | null)[], f = font) => {
    for (let i = 0; i < cols; i++) {
      const cell = row[i]
      if (cell === undefined || cell === null || cell === '') continue
      if (typeof cell === 'number') rightText(fmt(cell), colRight(i) + (i === 0 ? firstW : restW), y, 9, f)
      else text(fmt(cell), colLeft(i), y, 9, f)
    }
    y -= 14
  }

  rows.forEach((row, idx) => {
    if (y < 60) {
      newPage()
    }
    if (idx === 0) {
      drawRow(row, bold)
      page.drawLine({ start: { x: marginX, y: y + 4 }, end: { x: pageW - marginX, y: y + 4 }, thickness: 0.5, color: grey })
    } else {
      drawRow(row)
    }
  })

  return doc.save()
}
