import type { Database } from '@opensociety/db'
import type { UserRole, UserStatus } from '@opensociety/shared'

export type Bindings = {
  DATABASE_URL: string
  CLERK_SECRET_KEY?: string
  CLERK_PUBLISHABLE_KEY?: string
  CLERK_WEBHOOK_SECRET?: string
  UPLOADS: R2Bucket
  PUSH_ENABLED?: string
  EXPO_ACCESS_TOKEN?: string
  BILL_REMINDER_DAYS?: string
  SOCIETY_TIME_ZONE?: string
}

export type Variables = {
  db: Database
  // Acting user, resolved by withAuth from a verified Clerk session (or the
  // `x-user-id` dev stand-in). Unset when the request is unauthenticated.
  userId?: string
  userRole?: UserRole
  userStatus?: UserStatus
}

export type AppEnv = { Bindings: Bindings; Variables: Variables }
