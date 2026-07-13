// Visitor trends analytics (#68) — pure helpers over aggregated gate-log rows.

export type HourCount = { hour: number; count: number }
export type TypeCount = { type: string; count: number }
export type DayCount = { date: string; count: number }

// Zero-fill an hourly histogram to a full 0..23 so charts have every bar.
export function fillHours(rows: HourCount[]): HourCount[] {
  const byHour = new Map(rows.map((r) => [r.hour, r.count]))
  return Array.from({ length: 24 }, (_, hour) => ({ hour, count: byHour.get(hour) ?? 0 }))
}

// The hour (0..23) with the most entries, or null when there are none.
export function peakHour(rows: HourCount[]): number | null {
  let best: number | null = null
  let max = 0
  for (const r of rows) {
    if (r.count > max) {
      max = r.count
      best = r.hour
    }
  }
  return best
}

// Average entries per day over a count of distinct active days (1 decimal).
export function averagePerDay(total: number, distinctDays: number): number {
  if (distinctDays <= 0) return 0
  return Math.round((total / distinctDays) * 10) / 10
}

// "2 PM", "12 AM", "11 PM" — a friendly 12-hour label for an hour 0..23.
export function hourLabel(hour: number): string {
  const period = hour < 12 ? 'AM' : 'PM'
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h} ${period}`
}

export type VisitorTrends = {
  from: string
  to: string
  total: number
  distinctDays: number
  avgPerDay: number
  peakHour: number | null
  byHour: HourCount[]
  byType: TypeCount[]
  byDay: DayCount[]
}

// CSV of the daily visitor counts (date,count).
export function visitorTrendsToCsv(byDay: DayCount[]): string {
  const header = ['Date', 'Visitors']
  const lines = byDay.map((r) => [r.date, String(r.count)].join(','))
  return [header.join(','), ...lines].join('\n')
}
