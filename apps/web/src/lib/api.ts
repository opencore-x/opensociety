import type {
  Apartment,
  ApproveUser,
  CreateApartment,
  CreateApartmentsBulk,
  CreateGuard,
  CreateNotice,
  Guard,
  Notice,
  SocietyConfig,
  UpdateGuard,
  UpdateSocietyConfig,
  User,
  UserRole,
  UserStatus,
  VisitorEntry,
  VisitorStatus,
} from '@opensociety/shared'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8787'
// Dev stand-in for the acting user until Clerk sessions are wired into the web app.
// Writes that need an author (notices, visitor approvals) send this as `x-user-id`.
const DEV_USER_ID = import.meta.env.VITE_DEV_USER_ID as string | undefined

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'content-type': 'application/json',
      ...(DEV_USER_ID ? { 'x-user-id': DEV_USER_ID } : {}),
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
    api<Apartment[]>('/apartments/bulk', { method: 'POST', body: json(body) }),

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

  // Notices
  listNotices: () => api<Notice[]>('/notices'),
  createNotice: (body: CreateNotice) => api<Notice>('/notices', { method: 'POST', body: json(body) }),
}
