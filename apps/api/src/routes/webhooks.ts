import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { Webhook } from 'svix'
import { users } from '@opensociety/db'
import { withDb } from '../middleware'
import type { AppEnv } from '../types'

type ClerkUserEvent = {
  type: string
  data: {
    id: string
    first_name?: string | null
    last_name?: string | null
    email_addresses?: { email_address: string }[]
    phone_numbers?: { phone_number: string }[]
  }
}

export const webhookRoutes = new Hono<AppEnv>()
webhookRoutes.use('*', withDb)

// Clerk -> local user mirror. New users land as PENDING (schema default) until
// an admin approves + assigns a residency (POST /users/:id/approve).
webhookRoutes.post('/clerk', async (c) => {
  const secret = c.env.CLERK_WEBHOOK_SECRET
  if (!secret) return c.json({ error: 'webhook not configured' }, 501)

  const payload = await c.req.text()
  const headers = {
    'svix-id': c.req.header('svix-id') ?? '',
    'svix-timestamp': c.req.header('svix-timestamp') ?? '',
    'svix-signature': c.req.header('svix-signature') ?? '',
  }

  let evt: ClerkUserEvent
  try {
    evt = new Webhook(secret).verify(payload, headers) as ClerkUserEvent
  } catch {
    return c.json({ error: 'invalid signature' }, 400)
  }

  if (evt.type === 'user.created' || evt.type === 'user.updated') {
    const d = evt.data
    const email = d.email_addresses?.[0]?.email_address ?? null
    const phone = d.phone_numbers?.[0]?.phone_number ?? null
    const name = [d.first_name, d.last_name].filter(Boolean).join(' ') || email || 'Resident'
    const db = c.get('db')
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.clerkId, d.id))
      .limit(1)
    if (existing) {
      await db
        .update(users)
        .set({ email, phone, name, updatedAt: new Date() })
        .where(eq(users.clerkId, d.id))
    } else {
      await db.insert(users).values({ clerkId: d.id, email, phone, name })
    }
  }

  return c.json({ ok: true })
})
