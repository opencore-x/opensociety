import { afterEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { createDemoData } from './data'
import { exportReport, exportTable } from './exports'

afterEach(() => vi.restoreAllMocks())

describe('local demo exports', () => {
  it('generates real PDF, Excel, CSV and Tally files without fetching', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden'))
    const blobs: Blob[] = []
    vi.spyOn(URL, 'createObjectURL').mockImplementation(blob => { blobs.push(blob as Blob); return 'blob:demo' })
    const d = createDemoData()
    for (const format of ['pdf', 'xlsx', 'csv']) await exportReport(d, `/reports/trial-balance?format=${format}`)
    const pdf = await PDFDocument.load(await blobs[0].arrayBuffer())
    expect(pdf.getPageCount()).toBeGreaterThan(0)
    expect(new Uint8Array(await blobs[1].arrayBuffer()).slice(0, 4)).toEqual(new Uint8Array([80, 75, 3, 4]))
    expect(await blobs[2].text()).toContain('Member Dues Receivable')
    await exportReport(d, '/reports/tally-export')
    expect(await blobs[3].text()).toContain('<VOUCHER')
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('exports every financial statement and rejects unknown paths', async () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:demo')
    for (const path of ['trial-balance', 'balance-sheet', 'income-expenditure', 'receipts-payments']) {
      await expect(exportReport(createDemoData(), `/reports/${path}?format=csv`)).resolves.toBe('blob:demo')
    }
    await expect(exportReport(createDemoData(), '/webhooks')).rejects.toThrow()
    await expect(exportTable({ name: 'Demo', rows: [] }, 'html')).rejects.toThrow()
  })
})
