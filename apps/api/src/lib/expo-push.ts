import { z } from 'zod'
import type { PushMessage } from '@opensociety/shared'

const resultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), id: z.string().optional() }),
  z.object({ status: z.literal('error'), details: z.object({ error: z.string() }).optional() }),
])
export type ExpoResult = z.infer<typeof resultSchema>
export class PushTransportError extends Error {
  constructor(public readonly code: string, public readonly retryable: boolean) { super(code) }
}

async function post(endpoint: string, body: unknown, accessToken?: string) {
  let response: Response
  try {
    response = await fetch(`https://exp.host/--/api/v2/push/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}) },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    })
  } catch { throw new PushTransportError('network_error', true) }
  if (!response.ok) throw new PushTransportError(`expo_http_${response.status}`, response.status === 429 || response.status >= 500)
  try { return await response.json() } catch { throw new PushTransportError('invalid_response', true) }
}

export async function sendExpoMessages(messages: (PushMessage & { to: string })[], accessToken?: string) {
  if (messages.length === 0) return []
  if (messages.length > 100) throw new PushTransportError('batch_too_large', false)
  const body = await post('send', messages.map((m) => ({ ...m, sound: 'default', channelId: 'default', ttl: 3600 })), accessToken)
  const parsed = z.object({ data: z.array(resultSchema) }).safeParse(body)
  if (!parsed.success || parsed.data.data.length !== messages.length || parsed.data.data.some((r) => r.status === 'ok' && !r.id)) {
    throw new PushTransportError('invalid_tickets', true)
  }
  return parsed.data.data
}

export async function getExpoReceipts(ids: string[], accessToken?: string) {
  if (ids.length === 0) return {}
  if (ids.length > 1000) throw new PushTransportError('batch_too_large', false)
  const body = await post('getReceipts', { ids }, accessToken)
  const parsed = z.object({ data: z.record(resultSchema) }).safeParse(body)
  if (!parsed.success) throw new PushTransportError('invalid_receipts', true)
  return parsed.data.data
}

export function isRetryablePushError(code: string) {
  return code === 'MessageRateExceeded' || code === 'ExpoServerError' || code === 'ProviderError'
}

export function pushRetryAt(attempts: number, now: Date) {
  return new Date(now.getTime() + Math.min(3600, 30 * 2 ** Math.max(0, attempts - 1)) * 1000)
}
