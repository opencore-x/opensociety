import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { runMonthlyBilling } from '../index'
import { dispatchAndSchedule } from '../lib/push-dispatch'
import { sendBillReminders } from '../lib/bill-reminders'
import { startJobs } from './jobs'
import type { Bindings } from '../types'

vi.mock('../index', () => ({ runMonthlyBilling: vi.fn() }))
vi.mock('../lib/push-dispatch', () => ({ dispatchAndSchedule: vi.fn() }))
vi.mock('../lib/bill-reminders', () => ({ sendBillReminders: vi.fn() }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-02T00:00:00Z'))
  vi.mocked(runMonthlyBilling).mockReset().mockResolvedValue(undefined)
  vi.mocked(dispatchAndSchedule).mockReset().mockResolvedValue(undefined)
  vi.mocked(sendBillReminders).mockReset().mockResolvedValue(false)
})
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

it('recovers push at startup and otherwise waits for a business event', async () => {
  const env = { DATABASE_URL: 'postgresql://test:test@localhost/test', PUSH_ENABLED: 'true' } as Bindings
  const stop = startJobs(env, false)
  await vi.advanceTimersByTimeAsync(0)
  expect(dispatchAndSchedule).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(3600_000)
  expect(dispatchAndSchedule).toHaveBeenCalledTimes(1)
  await env.PUSH_DISPATCH!.send({ type: 'dispatch' }, { delaySeconds: 60 })
  await vi.advanceTimersByTimeAsync(60_000)
  expect(dispatchAndSchedule).toHaveBeenCalledTimes(2)
  await stop()
  expect(vi.getTimerCount()).toBe(0)
})

it('catches up billing, retries an interrupted run, and waits for the next month', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.mocked(runMonthlyBilling).mockRejectedValueOnce(new Error('ledger write interrupted'))
  const stop = startJobs({} as Bindings, true)
  await vi.advanceTimersByTimeAsync(0)
  expect(runMonthlyBilling).toHaveBeenCalledTimes(1)
  await vi.advanceTimersByTimeAsync(60_000)
  expect(runMonthlyBilling).toHaveBeenCalledTimes(2)
  await vi.advanceTimersByTimeAsync(30 * 86400_000 - 60_000)
  expect(runMonthlyBilling).toHaveBeenCalledTimes(3)
  expect(runMonthlyBilling).toHaveBeenLastCalledWith({}, Date.parse('2026-11-01T00:00:00Z'))
  await stop()
})

it('does not schedule database work when billing and push are disabled', async () => {
  const stop = startJobs({} as Bindings, false)
  expect(vi.getTimerCount()).toBe(0)
  await stop()
})
