import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { verifyToken } from '@clerk/backend'
import { eq } from 'drizzle-orm'
import { createDb, users } from '@opensociety/db'
import type { AppEnv } from './types'

// Builds a per-request Drizzle client from the Worker env binding.
export const withDb = createMiddleware<AppEnv>(async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL))
  await next()
})

// Resolves the acting user. Prefers a verified Clerk session (Bearer token);
// falls back to the `x-user-id` dev header when Clerk isn't configured.
// Must run AFTER withDb (uses the request db to map clerk_id -> users.id).
export const withAuth = createMiddleware<AppEnv>(async (c, next) => {
  const secret = c.env.CLERK_SECRET_KEY
  const authz = c.req.header('authorization')
  if (secret && authz?.startsWith('Bearer ')) {
    try {
      const claims = await verifyToken(authz.slice('Bearer '.length), { secretKey: secret })
      const [u] = await c
        .get('db')
        .select({ id: users.id })
        .from(users)
        .where(eq(users.clerkId, claims.sub))
        .limit(1)
      if (u) c.set('userId', u.id)
    } catch {
      // invalid/expired token -> remain unauthenticated; routes enforce as needed.
    }
  } else {
    const devUser = c.req.header('x-user-id')
    if (devUser) c.set('userId', devUser)
  }
  await next()
})

export function actingUserId(c: Context<AppEnv>): string | undefined {
  return c.get('userId')
}
