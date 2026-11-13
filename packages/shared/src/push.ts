import { z } from 'zod'

export const expoPushTokenSchema = z.string().max(200).regex(/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/)
export const registerPushTokenSchema = z.object({
  token: expoPushTokenSchema,
  platform: z.enum(['ios', 'android']),
})
export const unregisterPushTokenSchema = z.object({ token: expoPushTokenSchema })
export const pushScreenSchema = z.enum(['visitors', 'gate', 'notices', 'bills', 'my-vehicles'])
export const pushMessageSchema = z.object({
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  data: z.object({ screen: pushScreenSchema }),
})
export type PushMessage = z.infer<typeof pushMessageSchema>
export type RegisterPushToken = z.infer<typeof registerPushTokenSchema>
