import type {
  Apartment,
  CheckInHouseHelp,
  CreatePreApproval,
  CreateTicket,
  CreateVisitorEntry,
  Guard,
  GuardDutySession,
  HouseHelp,
  HouseHelpAssignment,
  HouseHelpEntry,
  Notice,
  SocietyConfig,
  Ticket,
  Vehicle,
  CreateVehicle,
  UpdateVehicle,
  VisitorEntry,
  VisitorPreApproval,
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
  createPreApproval: (body: CreatePreApproval, userId?: string) =>
    api<VisitorPreApproval>('/visitors/pre-approvals', { method: 'POST', body: JSON.stringify(body) }, userId),
  redeemPreApproval: (code: string, userId?: string) =>
    api<VisitorEntry>('/visitors/pre-approvals/redeem', { method: 'POST', body: JSON.stringify({ code }) }, userId),
  listNotices: () => api<Notice[]>('/notices'),
  listTickets: (status?: string) => api<Ticket[]>(`/tickets${status ? `?status=${status}` : ''}`),
  createTicket: (body: CreateTicket, userId?: string) =>
    api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(body) }, userId),
  listHouseHelp: (type?: string) => api<HouseHelp[]>(`/house-help${type ? `?type=${type}` : ''}`),
  listHouseHelpEntries: (params?: { active?: boolean; houseHelpId?: string }) => {
    const q = new URLSearchParams()
    if (params?.active) q.set('active', 'true')
    if (params?.houseHelpId) q.set('houseHelpId', params.houseHelpId)
    const qs = q.toString()
    return api<HouseHelpEntry[]>(`/house-help/entries${qs ? `?${qs}` : ''}`)
  },
  checkInHouseHelp: (id: string, body: CheckInHouseHelp = {}, userId?: string) =>
    api<HouseHelpEntry>(`/house-help/${id}/checkin`, { method: 'POST', body: JSON.stringify(body) }, userId),
  checkOutHouseHelpEntry: (entryId: string, userId?: string) =>
    api<HouseHelpEntry>(`/house-help/entries/${entryId}/checkout`, { method: 'POST', body: JSON.stringify({}) }, userId),
  listMyApartments: () => api<Apartment[]>('/apartments/mine'),
  listVehicles: (apartmentId?: string) =>
    api<Vehicle[]>(`/vehicles${apartmentId ? `?apartmentId=${apartmentId}` : ''}`),
  createVehicle: (body: CreateVehicle, userId?: string) =>
    api<Vehicle>('/vehicles', { method: 'POST', body: JSON.stringify(body) }, userId),
  updateVehicle: (id: string, body: UpdateVehicle, userId?: string) =>
    api<Vehicle>(`/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(body) }, userId),
  listGuards: () => api<Guard[]>('/guards'),
  listActiveDuty: () => api<GuardDutySession[]>('/guards/duty/active'),
  clockInGuard: (guardId: string, coords?: { lat?: number; lng?: number }, userId?: string) =>
    api<GuardDutySession>(`/guards/${guardId}/duty/clock-in`, { method: 'POST', body: JSON.stringify(coords ?? {}) }, userId),
  clockOutGuard: (sessionId: string, coords?: { lat?: number; lng?: number }, userId?: string) =>
    api<GuardDutySession>(`/guards/duty/${sessionId}/clock-out`, { method: 'POST', body: JSON.stringify(coords ?? {}) }, userId),
  listHouseHelpForApartment: (apartmentId: string) =>
    api<HouseHelp[]>(`/house-help?apartmentId=${apartmentId}`),
  assignHouseHelp: (id: string, apartmentId: string, userId?: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments`, { method: 'POST', body: JSON.stringify({ apartmentId }) }, userId),
  removeHouseHelpAssignment: (id: string, apartmentId: string, userId?: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments/${apartmentId}`, { method: 'DELETE' }, userId),
  // Auth-fetch a stored R2 object (GET /uploads/:key is auth-gated) and return a
  // local object URL suitable for opening/displaying an attachment.
  fetchUploadObjectUrl: async (path: string, userId = DEV_USER_ID): Promise<string> => {
    const token = tokenGetter ? await tokenGetter().catch(() => null) : null
    const auth: Record<string, string> = token
      ? { authorization: `Bearer ${token}` }
      : userId
        ? { 'x-user-id': userId }
        : {}
    const res = await fetch(`${API_URL}${path}`, { headers: auth })
    if (!res.ok) throw new Error(`attachment fetch failed (${res.status})`)
    return URL.createObjectURL(await res.blob())
  },
}
