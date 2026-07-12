import { houseHelpWorkedMinutes } from './house-help-entry'

// A denormalized attendance row for reporting: an entry joined with the help's
// name/type and the flat label, so reports/CSV read without extra lookups.
export type HouseHelpAttendanceRow = {
  // The entry's own id — present on rows from the attendance endpoint; the
  // aggregation/CSV helpers don't need it, so it's optional for callers that
  // synthesize rows.
  id?: string
  houseHelpId: string
  helpName: string
  type: string
  apartment: string | null
  checkInAt: string
  checkOutAt: string | null
}

export type HouseHelpAttendanceSummary = {
  houseHelpId: string
  helpName: string
  type: string
  visits: number
  totalMinutes: number
  openVisits: number
}

// Per-help totals over the given rows: visit count, summed worked minutes
// (open visits contribute 0 and are counted separately). Sorted by name.
export function summarizeHouseHelpAttendance(rows: HouseHelpAttendanceRow[]): HouseHelpAttendanceSummary[] {
  const byHelp = new Map<string, HouseHelpAttendanceSummary>()
  for (const r of rows) {
    const cur =
      byHelp.get(r.houseHelpId) ??
      { houseHelpId: r.houseHelpId, helpName: r.helpName, type: r.type, visits: 0, totalMinutes: 0, openVisits: 0 }
    cur.visits += 1
    const minutes = houseHelpWorkedMinutes(r.checkInAt, r.checkOutAt)
    if (minutes == null) cur.openVisits += 1
    else cur.totalMinutes += minutes
    byHelp.set(r.houseHelpId, cur)
  }
  return [...byHelp.values()].sort((a, b) => a.helpName.localeCompare(b.helpName))
}

// "2h 30m" / "45m" / "—" for a still-open (null) duration.
export function formatWorkedMinutes(minutes: number | null): string {
  if (minutes == null) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function csvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// RFC-4180-ish CSV of the attendance rows (header + one line per entry).
export function houseHelpAttendanceToCsv(rows: HouseHelpAttendanceRow[]): string {
  const header = ['House help', 'Type', 'Apartment', 'Check-in', 'Check-out', 'Minutes']
  const lines = rows.map((r) => {
    const minutes = houseHelpWorkedMinutes(r.checkInAt, r.checkOutAt)
    return [r.helpName, r.type, r.apartment ?? '', r.checkInAt, r.checkOutAt ?? '', minutes == null ? '' : String(minutes)]
      .map(csvCell)
      .join(',')
  })
  return [header.join(','), ...lines].join('\n')
}
