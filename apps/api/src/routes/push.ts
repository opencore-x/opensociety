import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, eq } from 'drizzle-orm'
import { pushDevices } from '@opensociety/db'
import { registerPushTokenSchema, unregisterPushTokenSchema } from '@opensociety/shared'
import { withDb, withAuth, requireAuth, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

export const pushRoutes = new Hono<AppEnv>()
pushRoutes.use('*', withDb, withAuth, requireAuth)

pushRoutes.post('/tokens', zValidator('json', registerPushTokenSchema), async (c) => {
  if (c.get('userStatus') !== 'APPROVED') return c.json({ error: 'approval required' }, 403)
  const input = c.req.valid('json')
  const userId = actingUserId(c)!
  await c.get('db').insert(pushDevices).values({ ...input, userId }).onConflictDoUpdate({
    target: pushDevices.token,
    set: { userId, platform: input.platform, updatedAt: new Date() },
  })
  return c.json({ ok: true })
})

pushRoutes.delete('/tokens', zValidator('json', unregisterPushTokenSchema), async (c) => {
  await c.get('db').delete(pushDevices).where(and(
    eq(pushDevices.token, c.req.valid('json').token),
    eq(pushDevices.userId, actingUserId(c)!),
  ))
  return c.json({ ok: true })
})
