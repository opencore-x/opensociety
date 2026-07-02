import { z } from 'zod'
import { ticketStatusSchema, ticketCategorySchema, ticketPrioritySchema } from './enums'

export const ticketSchema = z.object({
  id: z.string().uuid(),
  apartmentId: z.string().uuid(),
  raisedBy: z.string().uuid(),
  title: z.string(),
  description: z.string(),
  category: ticketCategorySchema,
  priority: ticketPrioritySchema,
  status: ticketStatusSchema,
  assignedTo: z.string().uuid().nullable(),
  resolutionNote: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const createTicketSchema = z.object({
  apartmentId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().min(1),
  category: ticketCategorySchema.default('OTHER'),
  priority: ticketPrioritySchema.default('NORMAL'),
})

export const ticketActionSchema = z.enum(['start', 'resolve', 'close', 'reopen', 'cancel'])

export const transitionTicketSchema = z.object({
  action: ticketActionSchema,
  resolutionNote: z.string().optional(),
})

export const assignTicketSchema = z.object({
  assignedTo: z.string().uuid(),
})

export type Ticket = z.infer<typeof ticketSchema>
export type CreateTicket = z.infer<typeof createTicketSchema>
export type TransitionTicket = z.infer<typeof transitionTicketSchema>
export type AssignTicket = z.infer<typeof assignTicketSchema>
