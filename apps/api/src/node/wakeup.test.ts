import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { createWakeup } from './wakeup'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('coalesces wake-ups at the earliest deadline and stops when idle', async () => {
  const run = vi.fn().mockResolvedValue(undefined)
  const queue = createWakeup(run, vi.fn())
  queue.schedule(1000)
  queue.schedule(5000)
  queue.schedule(100)
  await vi.advanceTimersByTimeAsync(100)
  expect(run).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(86400_000)
  expect(run).toHaveBeenCalledTimes(1)
  await queue.stop()
})

it('waits for a monthly deadline beyond Node’s maximum timer delay', async () => {
  const run = vi.fn().mockResolvedValue(undefined)
  const queue = createWakeup(run, vi.fn())
  const month = 31 * 86400_000
  queue.schedule(month)
  await vi.advanceTimersByTimeAsync(2_147_483_647)
  expect(run).not.toHaveBeenCalled()
  await vi.advanceTimersByTimeAsync(month - 2_147_483_647)
  expect(run).toHaveBeenCalledTimes(1)
  await queue.stop()
})

it('retains a wake-up requested during a pass without overlapping callbacks', async () => {
  let finish!: () => void
  const run = vi.fn().mockImplementationOnce(() => new Promise<void>((resolve) => { finish = resolve }))
    .mockResolvedValue(undefined)
  const queue = createWakeup(run, vi.fn())
  queue.schedule()
  await vi.advanceTimersByTimeAsync(0)
  queue.schedule()
  await vi.advanceTimersByTimeAsync(100)
  expect(run).toHaveBeenCalledTimes(1)
  finish()
  await vi.advanceTimersByTimeAsync(1)
  expect(run).toHaveBeenCalledTimes(2)
  await queue.stop()
})

it('retries failures after a minute and cancels pending work at shutdown', async () => {
  const run = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
  const error = vi.fn()
  const queue = createWakeup(run, error)
  queue.schedule()
  await vi.advanceTimersByTimeAsync(0)
  expect(error).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(59_999)
  expect(run).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(1)
  expect(run).toHaveBeenCalledTimes(2)
  queue.schedule()
  await queue.stop()
  await vi.advanceTimersByTimeAsync(60_000)
  expect(run).toHaveBeenCalledTimes(2)
})
