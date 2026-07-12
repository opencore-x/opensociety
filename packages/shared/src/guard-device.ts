import { z } from 'zod'

export const guardDeviceSchema = z.object({
  id: z.string().uuid(),
  guardId: z.string().uuid(),
  deviceId: z.string(),
  model: z.string().nullable(),
  boundAt: z.string(),
  lastActiveAt: z.string(),
  revokedAt: z.string().nullable(),
})

export const bindGuardDeviceSchema = z.object({
  deviceId: z.string().min(1),
  model: z.string().optional(),
})

// Whether a request from `incomingDeviceId` is allowed for a guard whose active
// bound device is `activeDeviceId`. A null active device means the guard is not
// yet bound (allowed — the caller auto-binds); otherwise the incoming device
// must match the bound one.
export function isGuardDeviceAllowed(
  activeDeviceId: string | null,
  incomingDeviceId: string | null | undefined,
): boolean {
  if (activeDeviceId == null) return true
  return !!incomingDeviceId && incomingDeviceId === activeDeviceId
}

export type GuardDevice = z.infer<typeof guardDeviceSchema>
export type BindGuardDevice = z.infer<typeof bindGuardDeviceSchema>
