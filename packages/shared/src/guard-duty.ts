import { z } from 'zod'

export const guardDutySessionSchema = z.object({
  id: z.string().uuid(),
  guardId: z.string().uuid(),
  clockInAt: z.string(),
  clockInLat: z.number().nullable(),
  clockInLng: z.number().nullable(),
  clockOutAt: z.string().nullable(),
  clockOutLat: z.number().nullable(),
  clockOutLng: z.number().nullable(),
  createdAt: z.string(),
  // Present on the enriched duty endpoints (joined guard name).
  guardName: z.string().optional(),
})

const coords = { lat: z.number().min(-90).max(90).optional(), lng: z.number().min(-180).max(180).optional() }
export const clockInSchema = z.object(coords)
export const clockOutSchema = z.object(coords)

// Minutes on duty for a session, or null while still clocked in (open shift).
export function dutySessionMinutes(clockInAt: string | Date, clockOutAt: string | Date | null): number | null {
  if (!clockOutAt) return null
  const ms = new Date(clockOutAt).getTime() - new Date(clockInAt).getTime()
  return Math.max(0, Math.round(ms / 60000))
}

export type GuardDutyRow = {
  guardId: string
  guardName: string
  clockInAt: string
  clockOutAt: string | null
}

export type GuardDutySummary = {
  guardId: string
  guardName: string
  sessions: number
  totalMinutes: number
  onDuty: boolean
}

// Per-guard shift totals: session count, summed minutes (open shifts contribute
// 0), and whether the guard is currently on duty. Sorted by guard name.
export function summarizeGuardDuty(rows: GuardDutyRow[]): GuardDutySummary[] {
  const byGuard = new Map<string, GuardDutySummary>()
  for (const r of rows) {
    const cur =
      byGuard.get(r.guardId) ?? { guardId: r.guardId, guardName: r.guardName, sessions: 0, totalMinutes: 0, onDuty: false }
    cur.sessions += 1
    const minutes = dutySessionMinutes(r.clockInAt, r.clockOutAt)
    if (minutes == null) cur.onDuty = true
    else cur.totalMinutes += minutes
    byGuard.set(r.guardId, cur)
  }
  return [...byGuard.values()].sort((a, b) => a.guardName.localeCompare(b.guardName))
}

// How many of the given entry timestamps fall within a shift window
// [clockInAt, clockOutAt ?? now-open). Powers "entries logged during shift".
export function entriesDuringSession(
  session: { clockInAt: string | Date; clockOutAt: string | Date | null },
  entryTimes: (string | Date)[],
): number {
  const start = new Date(session.clockInAt).getTime()
  const end = session.clockOutAt ? new Date(session.clockOutAt).getTime() : Infinity
  return entryTimes.filter((t) => {
    const ms = new Date(t).getTime()
    return ms >= start && ms <= end
  }).length
}

export type GuardDutySession = z.infer<typeof guardDutySessionSchema>
export type ClockIn = z.infer<typeof clockInSchema>
export type ClockOut = z.infer<typeof clockOutSchema>
