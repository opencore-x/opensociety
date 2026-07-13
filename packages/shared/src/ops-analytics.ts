// House-help & maintenance analytics (#69) — pure helpers over aggregated rows.

export type LabelCount = { label: string; count: number }
export type DowCount = { dow: number; count: number }

// Whole hours between ticket creation and resolution (1 decimal), floored at 0.
export function resolutionHours(createdMs: number, resolvedMs: number): number {
  return Math.max(0, Math.round(((resolvedMs - createdMs) / 3_600_000) * 10) / 10)
}

// Mean resolution time (hours) over resolved tickets, or null when none resolved.
export function avgResolutionHours(rows: { createdMs: number; resolvedMs: number | null }[]): number | null {
  const resolved = rows.filter((r) => r.resolvedMs != null)
  if (resolved.length === 0) return null
  const sum = resolved.reduce((s, r) => s + resolutionHours(r.createdMs, r.resolvedMs as number), 0)
  return Math.round((sum / resolved.length) * 10) / 10
}

const DOW_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// Postgres `extract(dow ...)` uses 0=Sunday .. 6=Saturday.
export function dayOfWeekLabel(dow: number): string {
  return DOW_LABELS[dow] ?? String(dow)
}

// Zero-fill a day-of-week histogram to Sun..Sat.
export function fillDaysOfWeek(rows: DowCount[]): DowCount[] {
  const byDow = new Map(rows.map((r) => [r.dow, r.count]))
  return Array.from({ length: 7 }, (_, dow) => ({ dow, count: byDow.get(dow) ?? 0 }))
}

export type HouseHelpAnalytics = {
  totalActive: number
  totalAttendance: number
  byType: LabelCount[]
  attendanceByDow: DowCount[]
}

export type MaintenanceAnalytics = {
  total: number
  pending: number
  avgResolutionHours: number | null
  byCategory: LabelCount[]
  byStatus: LabelCount[]
}
