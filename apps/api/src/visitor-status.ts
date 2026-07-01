import type { VisitorStatus } from '@opensociety/shared'

export type VisitorAction = 'approve' | 'deny' | 'checkin' | 'checkout'

// The visitor entry lifecycle:
//   PENDING --approve--> APPROVED --checkin--> ENTERED --checkout--> EXITED
//   PENDING --deny----> DENIED
// Each action is only valid from specific source states; everything else is a
// 409 (e.g. you can't check out a visitor who never entered, or approve a
// visitor who was already denied).
export const VISITOR_TRANSITIONS: Record<VisitorAction, { from: VisitorStatus[]; to: VisitorStatus }> = {
  approve: { from: ['PENDING'], to: 'APPROVED' },
  deny: { from: ['PENDING'], to: 'DENIED' },
  checkin: { from: ['APPROVED'], to: 'ENTERED' },
  checkout: { from: ['ENTERED'], to: 'EXITED' },
}

export function canTransition(action: VisitorAction, current: VisitorStatus): boolean {
  return VISITOR_TRANSITIONS[action].from.includes(current)
}
