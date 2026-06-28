import type { CreateApartment } from '@opensociety/shared'
import { bhkTypeSchema } from '@opensociety/shared'

export type ParseResult = { rows: CreateApartment[]; errors: string[] }

// Parses bulk apartment CSV input — one unit per line: `tower,number,floor,bhk`.
// floor and bhk are optional; invalid values are reported as errors rather than
// silently dropped, so the UI can block import until they're fixed.
export function parseBulk(text: string): ParseResult {
  const rows: CreateApartment[] = []
  const errors: string[] = []
  text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const [tower, apartmentNo, floor, bhk] = line.split(',').map((s) => s.trim())
      if (!tower || !apartmentNo) {
        errors.push(`Line ${i + 1}: tower and number are required`)
        return
      }
      const row: CreateApartment = { tower, apartmentNo }
      if (floor) {
        const n = Number(floor)
        if (Number.isNaN(n)) errors.push(`Line ${i + 1}: floor "${floor}" is not a number`)
        else row.floor = n
      }
      if (bhk) {
        const parsed = bhkTypeSchema.safeParse(bhk.toUpperCase())
        if (!parsed.success) errors.push(`Line ${i + 1}: invalid BHK "${bhk}"`)
        else row.bhkType = parsed.data
      }
      rows.push(row)
    })
  return { rows, errors }
}
