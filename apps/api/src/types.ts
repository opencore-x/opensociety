import type { Database } from '@opensociety/db'

export type Bindings = {
  DATABASE_URL: string
  CLERK_SECRET_KEY?: string
  CLERK_PUBLISHABLE_KEY?: string
  CLERK_WEBHOOK_SECRET?: string
}

export type Variables = {
  db: Database
  // Set by auth middleware once Clerk is wired (PR follow-up). Until then,
  // routes that need an actor read the `x-user-id` header as a dev stand-in.
  userId?: string
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }
