import type {
  Apartment,
  ApproveUser,
  CreateApartment,
  CreateApartmentsBulk,
  CreateGuard,
  CreateHouseHelp,
  CreateNotice,
  CreatePreApproval,
  CreateTicket,
  Guard,
  HouseHelp,
  HouseHelpAssignment,
  HouseHelpAttendanceRow,
  Notice,
  Ticket,
  TicketAction,
  SocietyConfig,
  UpdateApartment,
  UpdateGuard,
  UpdateHouseHelp,
  UpdateSocietyConfig,
  User,
  UserRole,
  UserStatus,
  VisitorEntry,
  VisitorPreApproval,
  VisitorStatus,
} from '@opensociety/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
// Dev stand-in for the acting user, used only when no Clerk session is present.
// Writes that need an author (notices, visitor approvals) send this as `x-user-id`.
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID as string | undefined

// Bridge to the Clerk session token. A React component registers this getter
// (see AuthBridge); when signed in it returns a JWT the API verifies as a
// Bearer token, taking precedence over the dev header.
let tokenGetter: (() => Promise<string | null>) | null = null
export function setAuthTokenGetter(fn: (() => Promise<string | null>) | null) {
  tokenGetter = fn
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = tokenGetter ? await tokenGetter().catch(() => null) : null
  if (token) return { authorization: `Bearer ${token}` }
  return DEV_USER_ID ? { 'x-user-id': DEV_USER_ID } : {}
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(await authHeaders()),
      ...(init?.headers ?? {}),
    },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`API ${path} -> ${res.status}${detail ? ` ${detail}` : ''}`)
  }
  return (await res.json()) as T
}

const json = (body: unknown) => JSON.stringify(body)

export const apiClient = {
  health: () => api<{ status: string }>('/health'),

  // Society
  getSociety: () => api<SocietyConfig | null>('/society'),
  updateSociety: (body: UpdateSocietyConfig) => api<SocietyConfig>('/society', { method: 'PUT', body: json(body) }),

  // Apartments
  listApartments: () => api<Apartment[]>('/apartments'),
  createApartment: (body: CreateApartment) => api<Apartment>('/apartments', { method: 'POST', body: json(body) }),
  createApartmentsBulk: (body: CreateApartmentsBulk) =>
    api<{ count: number; apartments: Apartment[] }>('/apartments/bulk', { method: 'POST', body: json(body) }),
  updateApartment: (id: string, body: UpdateApartment) =>
    api<Apartment>(`/apartments/${id}`, { method: 'PATCH', body: json(body) }),

  // Users / residents
  listUsers: (status?: UserStatus) => api<User[]>(`/users${status ? `?status=${status}` : ''}`),
  approveUser: (id: string, body: ApproveUser) =>
    api<User>(`/users/${id}/approve`, { method: 'POST', body: json(body) }),
  updateUserRole: (id: string, role: UserRole) =>
    api<User>(`/users/${id}/role`, { method: 'PATCH', body: json({ role }) }),

  // Guards
  listGuards: () => api<Guard[]>('/guards'),
  createGuard: (body: CreateGuard) => api<Guard>('/guards', { method: 'POST', body: json(body) }),
  updateGuard: (id: string, body: UpdateGuard) => api<Guard>(`/guards/${id}`, { method: 'PATCH', body: json(body) }),

  // Visitors
  listVisitors: (status?: VisitorStatus) => api<VisitorEntry[]>(`/visitors${status ? `?status=${status}` : ''}`),
  approveVisitor: (id: string) => api<VisitorEntry>(`/visitors/${id}/approve`, { method: 'POST' }),
  denyVisitor: (id: string, reason: string) =>
    api<VisitorEntry>(`/visitors/${id}/deny`, { method: 'POST', body: json({ reason }) }),
  checkInVisitor: (id: string) =>
    api<VisitorEntry>(`/visitors/${id}/checkin`, { method: 'POST', body: json({}) }),
  checkOutVisitor: (id: string) => api<VisitorEntry>(`/visitors/${id}/checkout`, { method: 'POST' }),

  // Pre-approvals (expected visitors)
  listPreApprovals: () => api<VisitorPreApproval[]>('/visitors/pre-approvals'),
  createPreApproval: (body: CreatePreApproval) =>
    api<VisitorPreApproval>('/visitors/pre-approvals', { method: 'POST', body: json(body) }),
  redeemPreApproval: (code: string) =>
    api<VisitorEntry>('/visitors/pre-approvals/redeem', { method: 'POST', body: json({ code }) }),
  revokePreApproval: (id: string) =>
    api<VisitorPreApproval>(`/visitors/pre-approvals/${id}/revoke`, { method: 'POST' }),

  // Notices
  listNotices: () => api<Notice[]>('/notices'),
  createNotice: (body: CreateNotice) => api<Notice>('/notices', { method: 'POST', body: json(body) }),

  // Maintenance tickets
  listTickets: (status?: string) =>
    api<Ticket[]>(`/tickets${status ? `?status=${status}` : ''}`),
  createTicket: (body: CreateTicket) => api<Ticket>('/tickets', { method: 'POST', body: json(body) }),
  transitionTicket: (id: string, action: TicketAction, resolutionNote?: string) =>
    api<Ticket>(`/tickets/${id}/transition`, { method: 'POST', body: json({ action, resolutionNote }) }),
  assignTicket: (id: string, assignedTo: string) =>
    api<Ticket>(`/tickets/${id}/assign`, { method: 'PATCH', body: json({ assignedTo }) }),

  // House help (domestic staff registry)
  listHouseHelp: (type?: string) => api<HouseHelp[]>(`/house-help${type ? `?type=${type}` : ''}`),
  createHouseHelp: (body: CreateHouseHelp) => api<HouseHelp>('/house-help', { method: 'POST', body: json(body) }),
  updateHouseHelp: (id: string, body: UpdateHouseHelp) =>
    api<HouseHelp>(`/house-help/${id}`, { method: 'PUT', body: json(body) }),
  listHouseHelpAssignments: (id: string) => api<HouseHelpAssignment[]>(`/house-help/${id}/assignments`),
  assignHouseHelp: (id: string, apartmentId: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments`, { method: 'POST', body: json({ apartmentId }) }),
  removeHouseHelpAssignment: (id: string, apartmentId: string) =>
    api<HouseHelpAssignment>(`/house-help/${id}/assignments/${apartmentId}`, { method: 'DELETE' }),
  listHouseHelpEntries: (params?: { from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    const qs = q.toString()
    return api<(HouseHelpAttendanceRow & { id: string })[]>(`/house-help/entries${qs ? `?${qs}` : ''}`)
  },
}
