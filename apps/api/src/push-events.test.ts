import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'
import type { AppEnv } from './types'
import { notifyEvent } from './lib/push-events'

const { enqueue, dispatch } = vi.hoisted(() => ({ enqueue: vi.fn(), dispatch: vi.fn() }))
vi.mock('./lib/push-queue', () => ({ enqueuePush: enqueue }))
vi.mock('./lib/push-dispatch', () => ({ requestPushDispatch: dispatch }))
beforeEach(() => { enqueue.mockReset().mockResolvedValue(undefined); dispatch.mockReset().mockResolvedValue(undefined) })

describe('push events', () => {
  const app = new Hono<AppEnv>()
  const recipients = vi.fn(async () => ['resident'])
  app.post('/', async (c) => {
    await notifyEvent(c, 'visitor:1:approval', recipients, { title: 'Visitor', body: 'Open the app', data: { screen: 'visitors' } })
    return c.json({ created: true }, 201)
  })
  it('keeps existing behavior when push is disabled', async () => {
    expect((await app.request('/', { method: 'POST' }, { PUSH_ENABLED: 'false' })).status).toBe(201)
    expect(enqueue).not.toHaveBeenCalled()
  })
  it('persists the event before scheduling background delivery', async () => {
    const pending: Promise<unknown>[] = []
    const executionCtx = { waitUntil: (p: Promise<unknown>) => { pending.push(p) }, passThroughOnException() {}, props: {} }
    expect((await app.request('/', { method: 'POST' }, { PUSH_ENABLED: 'true' }, executionCtx)).status).toBe(201)
    await Promise.all(pending)
    expect(enqueue).toHaveBeenCalledWith(undefined, ['resident'], 'visitor:1:approval', expect.any(Object))
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(pending).toHaveLength(0)
  })
  it('does not repeat a successful business action when notification enqueueing fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    enqueue.mockRejectedValueOnce(new Error('database unavailable'))
    expect((await app.request('/', { method: 'POST' }, { PUSH_ENABLED: 'true' })).status).toBe(201)
    expect(dispatch).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith('push: could not enqueue event', 'visitor:1:approval')
    log.mockRestore()
  })
})
