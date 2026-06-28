import type { Apartment, Notice, SocietyConfig, VisitorEntry } from '@opensociety/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`)
  return (await res.json()) as T
}

export const apiClient = {
  health: () => api<{ status: string }>('/health'),
  getSociety: () => api<SocietyConfig | null>('/society'),
  listApartments: () => api<Apartment[]>('/apartments'),
  listVisitors: () => api<VisitorEntry[]>('/visitors'),
  listNotices: () => api<Notice[]>('/notices'),
}
