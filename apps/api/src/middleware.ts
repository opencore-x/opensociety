import { createMiddleware } from 'hono/factory'
import type { Context } from 'hono'
import { createDb } from '@opensociety/db'
import type { AppEnv } from './types'

// Builds a per-request Drizzle client from the Worker env binding.
export const withDb = createMiddleware<AppEnv>(async (c, next) => {
  c.set('db', createDb(c.env.DATABASE_URL))
  await next()
})

// Resolves the acting user id. TODO: replace the header stand-in with the
// Clerk session (verify token -> clerk_id -> users.id) when auth lands.
export function actingUserId(c: Context<AppEnv>): string | undefined {
  return c.get('userId') ?? c.req.header('x-user-id')
}
