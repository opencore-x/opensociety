import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { hourLabel } from '@opensociety/shared'
import type { VisitorTrends } from '@opensociety/shared'

// A simple one-page PDF summary of the visitor-trends analytics for a range.
export async function renderVisitorTrendsPdf(society: string, data: VisitorTrends): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const grey = rgb(0.4, 0.4, 0.4)
  const text = (s: string, x: number, y: number, size = 10, f = font, color = rgb(0, 0, 0)) =>
    page.drawText(s, { x, y, size, font: f, color })

  let y = 792
  text(society, 50, y, 18, bold)
  y -= 20
  text('Visitor Trends Report', 50, y, 13, bold)
  y -= 15
  text(`Range: ${data.from} to ${data.to}`, 50, y, 9, font, grey)
  y -= 26

  text('Summary', 50, y, 11, bold)
  y -= 16
  text(`Total visitors: ${data.total}`, 50, y, 10)
  text(`Avg / day: ${data.avgPerDay}`, 220, y, 10)
  text(`Peak hour: ${data.peakHour === null ? '-' : hourLabel(data.peakHour)}`, 380, y, 10)
  y -= 26

  text('By type', 50, y, 11, bold)
  y -= 4
  page.drawLine({ start: { x: 50, y }, end: { x: 300, y }, thickness: 0.5, color: grey })
  y -= 14
  for (const t of data.byType) {
    text(t.type, 50, y, 9)
    text(String(t.count), 250, y, 9)
    y -= 13
  }
  y -= 14

  text('Entries by hour (IST)', 50, y, 11, bold)
  y -= 4
  page.drawLine({ start: { x: 50, y }, end: { x: 300, y }, thickness: 0.5, color: grey })
  y -= 14
  for (const h of data.byHour) {
    if (h.count === 0) continue
    text(hourLabel(h.hour), 50, y, 9)
    // A tiny inline bar so busy hours read at a glance.
    page.drawRectangle({ x: 130, y, width: Math.min(h.count * 8, 380), height: 8, color: rgb(0.13, 0.7, 0.4) })
    text(String(h.count), 130 + Math.min(h.count * 8, 380) + 6, y, 8, font, grey)
    y -= 13
  }

  return doc.save()
}
