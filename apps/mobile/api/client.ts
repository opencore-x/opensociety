import type {
  Apartment,
  CreateVisitorEntry,
  Notice,
  SocietyConfig,
  VisitorEntry,
  VisitorStatus,
} from '@opensociety/shared'

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787'

// Dev auth stand-in until Clerk tokens are wired into the mobile app.
// Pass a userId to act as that resident/admin (sent as the x-user-id header).
async function api<T>(path: string, init?: RequestInit, userId?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(userId ? { 'x-user-id': userId } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) throw new Error(`API ${path} -> ${res.status}`)
  return (await res.json()) as T
}

export const apiClient = {
  health: () => api<{ status: string }>('/health'),
  getSociety: () => api<SocietyConfig | null>('/society'),
  listApartments: () => api<Apartment[]>('/apartments'),
  listVisitors: (status?: VisitorStatus) =>
    api<VisitorEntry[]>(`/visitors${status ? `?status=${status}` : ''}`),
  createVisitor: (body: CreateVisitorEntry, userId?: string) =>
    api<VisitorEntry>('/visitors', { method: 'POST', body: JSON.stringify(body) }, userId),
  approveVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/approve`, { method: 'POST' }, userId),
  denyVisitor: (id: string, reason: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/deny`, { method: 'POST', body: JSON.stringify({ reason }) }, userId),
  listNotices: () => api<Notice[]>('/notices'),
}
