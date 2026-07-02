import { Hono } from 'hono'
import type { Context } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { maintenanceTickets, residencies, users } from '@opensociety/db'
import type { TicketStatus, TicketAction } from '@opensociety/shared'
import {
  createTicketSchema,
  transitionTicketSchema,
  assignTicketSchema,
  TICKET_TRANSITIONS,
  canTicketTransition,
} from '@opensociety/shared'
import { withDb, withAuth, requireAuth, requireRole, actingUserId } from '../middleware'
import type { AppEnv } from '../types'

// Applies a lifecycle transition to a ticket, enforcing the state machine:
// 404 if missing, 409 if the action is illegal from its current status.
export async function applyTicketTransition(
  c: Context<AppEnv>,
  action: TicketAction,
  extra: Partial<typeof maintenanceTickets.$inferInsert>,
) {
  const db = c.get('db')
  const id = c.req.param('id')
  const [ticket] = await db
    .select({ status: maintenanceTickets.status })
    .from(maintenanceTickets)
    .where(eq(maintenanceTickets.id, id))
    .limit(1)
  if (!ticket) return c.json({ error: 'not found' }, 404)
  if (!canTicketTransition(action, ticket.status))
    return c.json({ error: `cannot ${action} a ticket in ${ticket.status} state` }, 409)
  const [updated] = await db
    .update(maintenanceTickets)
    .set({ status: TICKET_TRANSITIONS[action].to, updatedAt: new Date(), ...extra })
    .where(eq(maintenanceTickets.id, id))
    .returning()
  return c.json(updated)
}

export const ticketRoutes = new Hono<AppEnv>()
ticketRoutes.use('*', withDb)
ticketRoutes.use('*', withAuth)
ticketRoutes.use('*', requireAuth)

// Admin sees all tickets; a resident sees only their own apartments' tickets.
ticketRoutes.get('/', async (c) => {
  const db = c.get('db')
  const status = c.req.query('status') as TicketStatus | undefined
  const conds = status ? [eq(maintenanceTickets.status, status)] : []

  if (c.get('userRole') !== 'ADMIN') {
    const mine = await db
      .select({ apartmentId: residencies.apartmentId })
      .from(residencies)
      .where(and(eq(residencies.userId, actingUserId(c)!), isNull(residencies.endDate)))
    const aptIds = mine.map((r) => r.apartmentId)
    if (aptIds.length === 0) return c.json([])
    conds.push(inArray(maintenanceTickets.apartmentId, aptIds))
  }

  const rows = await db
    .select()
    .from(maintenanceTickets)
    .where(conds.length ? and(...conds) : undefined)
    .orderBy(desc(maintenanceTickets.createdAt))
  return c.json(rows)
})

// Residents raise a ticket for an apartment they live in (admins may too).
ticketRoutes.post('/', requireRole('RESIDENT', 'ADMIN'), zValidator('json', createTicketSchema), async (c) => {
  const db = c.get('db')
  const input = c.req.valid('json')
  const userId = actingUserId(c)!

  if (c.get('userRole') === 'RESIDENT') {
    const [residency] = await db
      .select({ id: residencies.id })
      .from(residencies)
      .where(
        and(
          eq(residencies.userId, userId),
          eq(residencies.apartmentId, input.apartmentId),
          isNull(residencies.endDate),
        ),
      )
      .limit(1)
    if (!residency) return c.json({ error: 'not a resident of this apartment' }, 403)
  }

  const [created] = await db
    .insert(maintenanceTickets)
    .values({
      apartmentId: input.apartmentId,
      raisedBy: userId,
      title: input.title,
      description: input.description,
      category: input.category,
      priority: input.priority,
    })
    .returning()
  return c.json(created, 201)
})

// Admin drives the ticket workflow (start/resolve/close/reopen/cancel).
ticketRoutes.post('/:id/transition', requireRole('ADMIN'), zValidator('json', transitionTicketSchema), (c) => {
  const { action, resolutionNote } = c.req.valid('json')
  const extra: Partial<typeof maintenanceTickets.$inferInsert> = {}
  if (action === 'resolve') {
    extra.resolvedAt = new Date()
    if (resolutionNote) extra.resolutionNote = resolutionNote
  }
  return applyTicketTransition(c, action, extra)
})

// Admin assigns the ticket to a user (staff/guard/admin).
ticketRoutes.patch('/:id/assign', requireRole('ADMIN'), zValidator('json', assignTicketSchema), async (c) => {
  const db = c.get('db')
  const { assignedTo } = c.req.valid('json')

  const [assignee] = await db.select({ id: users.id }).from(users).where(eq(users.id, assignedTo)).limit(1)
  if (!assignee) return c.json({ error: 'assignee not found' }, 404)

  const [updated] = await db
    .update(maintenanceTickets)
    .set({ assignedTo, updatedAt: new Date() })
    .where(eq(maintenanceTickets.id, c.req.param('id')))
    .returning()
  if (!updated) return c.json({ error: 'not found' }, 404)
  return c.json(updated)
})
