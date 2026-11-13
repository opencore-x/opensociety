import { afterEach, describe, expect, it, vi } from 'vitest'
import { getExpoReceipts, sendExpoMessages, pushRetryAt } from './lib/expo-push'

const message = { to: 'ExpoPushToken[token]', title: 'Visitor', body: 'Open the app', data: { screen: 'visitors' as const } }
afterEach(() => vi.unstubAllGlobals())

describe('Expo transport', () => {
  it('sends bounded batches with authorization, channel and expiry', async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: [{ status: 'ok', id: 'receipt' }] }))
    vi.stubGlobal('fetch', fetcher)
    expect(await sendExpoMessages([message], 'access')).toEqual([{ status: 'ok', id: 'receipt' }])
    const [url, options] = fetcher.mock.calls[0]
    expect(url).toBe('https://exp.host/--/api/v2/push/send')
    expect(options.headers.Authorization).toBe('Bearer access')
    expect(JSON.parse(options.body)).toEqual([{ ...message, sound: 'default', channelId: 'default', ttl: 3600 }])
    await expect(sendExpoMessages(Array(101).fill(message))).rejects.toMatchObject({ retryable: false })
    expect(fetcher).toHaveBeenCalledTimes(1)
  })
  it.each([[429, true], [503, true], [401, false], [400, false]])('classifies HTTP %s', async (status, retryable) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status })))
    await expect(sendExpoMessages([message])).rejects.toMatchObject({ retryable })
  })
  it('retries transport failures and rejects incomplete ticket responses', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))
    await expect(sendExpoMessages([message])).rejects.toMatchObject({ code: 'network_error', retryable: true })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: [] })))
    await expect(sendExpoMessages([message])).rejects.toMatchObject({ code: 'invalid_tickets' })
  })
  it('preserves receipt errors for dead-token cleanup', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ data: { r1: { status: 'error', details: { error: 'DeviceNotRegistered' } } } })))
    expect((await getExpoReceipts(['r1'])).r1).toMatchObject({ details: { error: 'DeviceNotRegistered' } })
  })
  it('backs off exponentially with a one-hour cap', () => {
    const now = new Date('2026-10-02T00:00:00Z')
    expect(pushRetryAt(1, now).getTime() - now.getTime()).toBe(30_000)
    expect(pushRetryAt(3, now).getTime() - now.getTime()).toBe(120_000)
    expect(pushRetryAt(20, now).getTime() - now.getTime()).toBe(3_600_000)
  })
})
