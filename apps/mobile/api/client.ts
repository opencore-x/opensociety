import type {
  Apartment,
  CreateVisitorEntry,
  Notice,
  SocietyConfig,
  VisitorEntry,
  VisitorStatus,
} from '@opensociety/shared'

export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787'

// Dev auth stand-in used only when no Clerk session is present. Set
// EXPO_PUBLIC_DEV_USER_ID to a real users.id (resident/admin) to act as them;
// it's sent as the x-user-id header.
const DEV_USER_ID = process.env.EXPO_PUBLIC_DEV_USER_ID

// Bridge to the Clerk session token, registered by a React component (see
// AuthBridge in _layout). When signed in, requests carry a Bearer JWT the API
// verifies, taking precedence over the dev header.
let tokenGetter: (() => Promise<string | null>) | null = null
export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn
}

// Bearer token when signed in, else the dev x-user-id fallback. The API
// requires an authenticated actor even for GETs.
async function api<T>(path: string, init?: RequestInit, userId = DEV_USER_ID): Promise<T> {
  const token = tokenGetter ? await tokenGetter().catch(() => null) : null
  const auth: Record<string, string> = token
    ? { authorization: `Bearer ${token}` }
    : userId
      ? { 'x-user-id': userId }
      : {}
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...auth,
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
  checkInVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/checkin`, { method: 'POST', body: JSON.stringify({}) }, userId),
  checkOutVisitor: (id: string, userId?: string) =>
    api<VisitorEntry>(`/visitors/${id}/checkout`, { method: 'POST' }, userId),
  listNotices: () => api<Notice[]>('/notices'),
}
