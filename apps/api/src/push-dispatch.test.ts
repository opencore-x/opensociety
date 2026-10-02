import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@opensociety/db'
import type { Bindings } from './types'
import { dispatchAndSchedule, requestPushDispatch } from './lib/push-dispatch'
const { process } = vi.hoisted(() => ({ process: vi.fn() }))
vi.mock('./lib/push-queue', () => ({ processPushQueue: process }))
beforeEach(() => process.mockReset().mockResolvedValue(undefined))
function database(rows: { nextAttemptAt: Date }[]) {
  const chain = { select: () => chain, from: () => chain, where: () => chain, orderBy: () => chain, limit: async () => rows }
  return chain as unknown as Database
}
describe('push wake-up scheduling', () => {
  it('stops scheduling when delivery work is finished', async () => {
    const send = vi.fn()
    await dispatchAndSchedule(database([]), { PUSH_DISPATCH: { send } as unknown as Bindings['PUSH_DISPATCH'] })
    expect(process).toHaveBeenCalledOnce()
    expect(send).not.toHaveBeenCalled()
  })
  it('schedules receipts at their deadline, not on an idle poll timer', async () => {
    const send = vi.fn()
    await dispatchAndSchedule(database([{ nextAttemptAt: new Date(Date.now() + 900_000) }]), { PUSH_DISPATCH: { send } as unknown as Bindings['PUSH_DISPATCH'] })
    expect(send).toHaveBeenCalledWith({ type: 'dispatch' }, { delaySeconds: expect.any(Number) })
    expect(send.mock.calls[0][1].delaySeconds).toBeGreaterThanOrEqual(899)
    expect(send.mock.calls[0][1].delaySeconds).toBeLessThanOrEqual(900)
  })
  it('does not report success without a configured wake-up queue', async () => {
    await expect(requestPushDispatch({})).rejects.toThrow('not configured')
  })
  it('propagates processing errors so the queue retries the wake-up', async () => {
    process.mockRejectedValueOnce(new Error('network'))
    await expect(dispatchAndSchedule(database([]), {})).rejects.toThrow('network')
  })
})
