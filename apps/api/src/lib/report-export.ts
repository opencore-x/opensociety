import { tableToCsv, type Table } from '@opensociety/shared'
import { buildXlsx } from './xlsx'

// Return a report Table as an .xlsx or .csv download when ?format is set, else
// null so the caller falls back to its JSON response (#99).
export function tableExport(format: string | undefined, table: Table, baseName: string): Response | null {
  if (format === 'xlsx') {
    const buf = buildXlsx([table])
    const body = new ArrayBuffer(buf.byteLength)
    new Uint8Array(body).set(buf)
    return new Response(body, {
      headers: {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': `attachment; filename="${baseName}.xlsx"`,
      },
    })
  }
  if (format === 'csv') {
    return new Response(tableToCsv(table.rows), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${baseName}.csv"`,
      },
    })
  }
  return null
}
