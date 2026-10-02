import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Database } from '@opensociety/db'
import { localDay, reminderDue, reminderOffsets, sendBillReminders } from './lib/bill-reminders'

const { enqueue, dispatch, recipients } = vi.hoisted(() => ({ enqueue: vi.fn(), dispatch: vi.fn(), recipients: vi.fn() }))
vi.mock('./lib/push-queue', () => ({ enqueuePush: enqueue, processPushQueue: dispatch }))
vi.mock('./lib/push-events', () => ({ apartmentRecipients: recipients }))
beforeEach(() => { enqueue.mockReset(); dispatch.mockReset(); recipients.mockReset().mockResolvedValue(['resident']) })

describe('bill reminders', () => {
  it('defaults to a week before, the due day, and three days overdue', () => {
    const due = new Date('2026-10-10T00:00:00Z')
    expect(reminderOffsets()).toEqual([-7, 0, 3])
    for (const day of [3, 10, 13]) expect(reminderDue(due, new Date(`2026-10-${String(day).padStart(2, '0')}T04:00:00Z`), reminderOffsets(), 'Asia/Kolkata')).toBe(true)
    expect(reminderDue(due, new Date('2026-10-11T04:00:00Z'), reminderOffsets(), 'Asia/Kolkata')).toBe(false)
  })
  it('uses local calendar days across UTC midnight and DST', () => {
    expect(localDay(new Date('2026-10-02T20:00:00Z'), 'Asia/Kolkata')).toBe('2026-10-03')
    expect(reminderDue(new Date('2026-03-08T05:00:00Z'), new Date('2026-03-09T04:00:00Z'), [1], 'America/New_York')).toBe(true)
  })
  it('validates the society reminder schedule', () => {
    expect(reminderOffsets('-2,0,0,5')).toEqual([-2, 0, 5])
    for (const value of ['', 'bad', '0.5', '-61', '91']) expect(() => reminderOffsets(value)).toThrow()
  })
  it('skips database work outside the local morning window', async () => {
    await sendBillReminders({} as Database, { now: new Date('2026-10-10T12:00:00Z') })
    expect(enqueue).not.toHaveBeenCalled()
  })
  it('skips settled bills and uses the remaining balance with a stable daily event key', async () => {
    const dueDate = new Date('2026-10-10T00:00:00Z')
    const rows = [
      { id: 'paid', apartmentId: 'a', dueDate, outstanding: 0 },
      { id: 'partial', apartmentId: 'b', dueDate, outstanding: 12500 },
      { id: 'later', apartmentId: 'c', dueDate: new Date('2026-12-01T00:00:00Z'), outstanding: 100 },
    ]
    const chain = { select: () => chain, from: () => chain, where: async () => rows }
    const now = new Date('2026-10-10T04:00:00Z')
    await sendBillReminders(chain as unknown as Database, { now })
    expect(recipients).toHaveBeenCalledWith(chain, 'b')
    expect(enqueue).toHaveBeenCalledTimes(1)
    expect(enqueue).toHaveBeenCalledWith(chain, ['resident'], 'bill:partial:reminder:2026-10-10', expect.objectContaining({ body: expect.stringContaining('₹125.00'), data: { screen: 'bills' } }), now)
  })
})
