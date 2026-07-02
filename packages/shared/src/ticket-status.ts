import type { TicketStatus } from './enums'

export type TicketAction = 'start' | 'resolve' | 'close' | 'reopen' | 'cancel'

// The maintenance-ticket lifecycle, shared by the API (to enforce transitions)
// and the clients (to show only valid actions for a given status):
//   OPEN --start--> IN_PROGRESS --resolve--> RESOLVED --close--> CLOSED
//   RESOLVED --reopen--> IN_PROGRESS
//   OPEN/IN_PROGRESS --cancel--> CANCELLED
export const TICKET_TRANSITIONS: Record<TicketAction, { from: TicketStatus[]; to: TicketStatus }> = {
  start: { from: ['OPEN'], to: 'IN_PROGRESS' },
  resolve: { from: ['IN_PROGRESS'], to: 'RESOLVED' },
  close: { from: ['RESOLVED'], to: 'CLOSED' },
  reopen: { from: ['RESOLVED'], to: 'IN_PROGRESS' },
  cancel: { from: ['OPEN', 'IN_PROGRESS'], to: 'CANCELLED' },
}

export function canTicketTransition(action: TicketAction, current: TicketStatus): boolean {
  return TICKET_TRANSITIONS[action].from.includes(current)
}

// The actions valid on a ticket in the given status — drive UI from this so
// clients and the server agree on what's possible.
export function availableTicketActions(status: TicketStatus): TicketAction[] {
  return (Object.keys(TICKET_TRANSITIONS) as TicketAction[]).filter((a) => canTicketTransition(a, status))
}
