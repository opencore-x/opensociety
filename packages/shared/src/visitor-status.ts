import type { VisitorStatus } from './enums'

export type VisitorAction = 'approve' | 'deny' | 'checkin' | 'checkout'

// The visitor entry lifecycle, shared by the API (to enforce transitions) and
// the clients (to show only the actions that are valid for a given status):
//   PENDING --approve--> APPROVED --checkin--> ENTERED --checkout--> EXITED
//   PENDING --deny----> DENIED
export const VISITOR_TRANSITIONS: Record<VisitorAction, { from: VisitorStatus[]; to: VisitorStatus }> = {
  approve: { from: ['PENDING'], to: 'APPROVED' },
  deny: { from: ['PENDING'], to: 'DENIED' },
  checkin: { from: ['APPROVED'], to: 'ENTERED' },
  checkout: { from: ['ENTERED'], to: 'EXITED' },
}

export function canTransition(action: VisitorAction, current: VisitorStatus): boolean {
  return VISITOR_TRANSITIONS[action].from.includes(current)
}

// The actions a user may take on a visitor in the given status — drive UI
// buttons from this so clients and the server agree on what's possible.
export function availableVisitorActions(status: VisitorStatus): VisitorAction[] {
  return (Object.keys(VISITOR_TRANSITIONS) as VisitorAction[]).filter((a) => canTransition(a, status))
}
