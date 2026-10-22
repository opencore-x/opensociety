import type { apiClient } from '../api'

export type DemoMethods = {
  [K in keyof typeof apiClient]: (...args: Parameters<(typeof apiClient)[K]>) =>
    Awaited<ReturnType<(typeof apiClient)[K]>> | ReturnType<(typeof apiClient)[K]>
}

export const nowIso = () => new Date().toISOString()
export const newRecord = () => ({ id: crypto.randomUUID(), createdAt: nowIso(), updatedAt: nowIso() })
export function find<T extends { id: string }>(rows: T[], id: string): T {
  const row = rows.find(r => r.id === id)
  if (!row) throw new Error('This demo record no longer exists. Reset the demo to start again.')
  return row
}
export function inRange(date: string, from?: string, to?: string) {
  const day = date.slice(0, 10)
  return (!from || day >= from.slice(0, 10)) && (!to || day <= to.slice(0, 10))
}
export function groupCount<T>(rows: T[], key: (row: T) => string) {
  const counts = new Map<string, number>()
  for (const row of rows) counts.set(key(row), (counts.get(key(row)) ?? 0) + 1)
  return [...counts].map(([label, count]) => ({ label, count }))
}
