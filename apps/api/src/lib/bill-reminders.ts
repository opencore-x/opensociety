import { and, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm'
import { maintenanceBills, type Database } from '@opensociety/db'
import { formatPaise } from '@opensociety/shared'
import { apartmentRecipients } from './push-events'
import { enqueuePush, processPushQueue } from './push-queue'

export function reminderOffsets(value = '-7,0,3') {
  const offsets = value.split(',').map((s) => Number(s.trim()))
  if (value.split(',').some((s) => !s.trim()) || offsets.length > 15 || offsets.some((n) => !Number.isInteger(n) || n < -60 || n > 90)) {
    throw new Error('BILL_REMINDER_DAYS must contain up to 15 comma-separated offsets between -60 and 90')
  }
  return [...new Set(offsets)]
}

export function localDay(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = (type: string) => parts.find((p) => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function reminderDue(dueDate: Date, now: Date, offsets: number[], timeZone: string) {
  const elapsedDays = Math.round((Date.parse(localDay(now, timeZone)) - Date.parse(localDay(dueDate, timeZone))) / 86400_000)
  return offsets.includes(elapsedDays)
}

export async function sendBillReminders(db: Database, options: { now: Date; timeZone?: string; days?: string; accessToken?: string }) {
  const { now, accessToken } = options
  const timeZone = options.timeZone ?? 'Asia/Kolkata'
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone, hour: '2-digit', hourCycle: 'h23' }).format(now)
  if (hour !== '09') return
  const offsets = reminderOffsets(options.days)
  const rows = await db.select({
    id: maintenanceBills.id, apartmentId: maintenanceBills.apartmentId, dueDate: maintenanceBills.dueDate,
    outstanding: sql<number>`${maintenanceBills.totalAmount} - coalesce((select sum(amount) from payments where bill_id = ${maintenanceBills.id}), 0)`,
  }).from(maintenanceBills).where(and(
    inArray(maintenanceBills.status, ['ISSUED', 'PARTIALLY_PAID']), isNotNull(maintenanceBills.dueDate),
    gte(maintenanceBills.dueDate, new Date(now.getTime() - (Math.max(...offsets) + 2) * 86400_000)),
    lte(maintenanceBills.dueDate, new Date(now.getTime() - (Math.min(...offsets) - 2) * 86400_000)),
  ))
  for (const bill of rows) {
    const balance = Number(bill.outstanding)
    if (!bill.dueDate || balance <= 0 || !reminderDue(bill.dueDate, now, offsets, timeZone)) continue
    await enqueuePush(db, await apartmentRecipients(db, bill.apartmentId), `bill:${bill.id}:reminder:${localDay(now, timeZone)}`, {
      title: 'Maintenance bill reminder',
      body: `${formatPaise(balance)} outstanding, due ${localDay(bill.dueDate, timeZone)}. Open Bills for details and contact the society office to pay.`,
      data: { screen: 'bills' },
    }, now)
  }
  await processPushQueue(db, accessToken, now)
}
