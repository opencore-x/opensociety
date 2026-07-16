import { describe, it, expect } from 'vitest'
import { buildXlsx } from './lib/xlsx'

describe('buildXlsx (dependency-free .xlsx writer)', () => {
  const buf = buildXlsx([
    { name: 'Trial Balance', rows: [['Account', 'Debit'], ['Bank', 1234], ['Note "x", y', null]] },
    { name: 'Sheet2', rows: [[1, 2, 3]] },
  ])
  const text = new TextDecoder().decode(buf)

  it('starts with the ZIP local-file signature and has an EOCD record', () => {
    expect([buf[0], buf[1], buf[2], buf[3]]).toEqual([0x50, 0x4b, 0x03, 0x04]) // PK\x03\x04
    // End of central directory signature PK\x05\x06 appears near the end.
    let hasEocd = false
    for (let i = buf.length - 22; i >= 0; i--) {
      if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x05 && buf[i + 3] === 0x06) {
        hasEocd = true
        break
      }
    }
    expect(hasEocd).toBe(true)
  })

  it('packages the required OOXML parts', () => {
    expect(text).toContain('[Content_Types].xml')
    expect(text).toContain('xl/workbook.xml')
    expect(text).toContain('xl/worksheets/sheet1.xml')
    expect(text).toContain('xl/worksheets/sheet2.xml')
  })

  it('writes string cells as inline strings and numbers as values (escaped)', () => {
    expect(text).toContain('<t xml:space="preserve">Bank</t>')
    expect(text).toContain('<v>1234</v>')
    expect(text).toContain('Note &quot;x&quot;, y') // xml-escaped
    expect(text).toContain('<sheet name="Trial Balance"')
  })

  it('is non-empty and byte-aligned', () => {
    expect(buf.length).toBeGreaterThan(200)
    expect(buf).toBeInstanceOf(Uint8Array)
  })
})
