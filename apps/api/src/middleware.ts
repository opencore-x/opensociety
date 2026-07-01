import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'
import { createDb, users } from '@opensociety/db'
import type { UserRole } from '@opensociety/shared'
import type { AppEnv } from './types'

// Builds a per-request Drizzle client from the Worker env binding.
export const withDb = createMiddleware<AppEnv>(async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL))
  await next()
})

// Loads the acting user (id + role + status) into the context by either their
// clerk_id or their users.id, so downstream guards can authorize by role.
async function loadActingUser(c: Context<AppEnv>, by: 'clerkId' | 'id', value: string) {
  const column = by === 'clerkId' ? users.clerkId : users.id
  const [u] = await c
    .get('db')
    .select({ id: users.id, role: users.role, status: users.status })
    .from(users)
    .where(eq(column, value))
    .limit(1)
  if (u) {
    c.set('userId', u.id)
    c.set('userRole', u.role)
    c.set('userStatus', u.status)
  }
}

// Resolves the acting user. Prefers a verified Clerk session (Bearer token);
// falls back to the `x-user-id` dev header when Clerk isn't configured.
// Must run AFTER withDb (uses the request db to map identity -> users row).
export const withAuth = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env.CLERK_SECRET_KEY
  const authz = c.req.header('authorization')
  if (secret && authz?.startsWith('Bearer ')) {
    try {
      const claims = await verifyToken(authz.slice('Bearer '.length), { secretKey: secret })
      await loadActingUser(c, 'clerkId', claims.sub)
    } catch {
      // invalid/expired token -> remain unauthenticated; guards enforce as needed.
    }
  } else {
    const devUser = c.req.header('x-user-id')
    if (devUser) await loadActingUser(c, 'id', devUser)
  }
  await next()
})

export function actingUserId(c: Context<AppEnv>): string | undefined {
  return c.get('userId')
}

// Rejects unauthenticated requests. Use for endpoints any signed-in user may hit.
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('userId')) return c.json({ error: 'authentication required' }, 401)
  await next()
})

// Rejects requests whose acting user is not one of `roles`.
// 401 when unauthenticated, 403 when authenticated but under-privileged.
export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!c.get('userId')) return c.json({ error: 'authentication required' }, 401)
    const role = c.get('userRole')
    if (!role || !roles.includes(role)) return c.json({ error: 'forbidden' }, 403)
    await next()
  })
}
