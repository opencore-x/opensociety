import { describe, it, expect } from 'vitest'
import type { VisitorStatus } from '@opensociety/shared'
import { VISITOR_TRANSITIONS, canTransition, type VisitorAction } from './visitor-status'

const ALL_STATUSES: VisitorStatus[] = [
  'PENDING',
  'APPROVED',
  'DENIED',
  'ENTERED',
  'EXITED',
  'CANCELLED',
  'EXPIRED',
]

// The only legal (action, from-state) pairs. Everything else must be rejected.
const LEGAL: Record<VisitorAction, VisitorStatus[]> = {
  approve: ['PENDING'],
  deny: ['PENDING'],
  checkin: ['APPROVED'],
  checkout: ['ENTERED'],
}

describe('canTransition', () => {
  for (const action of Object.keys(LEGAL) as VisitorAction[]) {
    for (const status of ALL_STATUSES) {
      const legal = LEGAL[action].includes(status)
      it(`${action} from ${status} -> ${legal ? 'allowed' : 'blocked'}`, () => {
        expect(canTransition(action, status)).toBe(legal)
      })
    }
  }
})

describe('VISITOR_TRANSITIONS targets', () => {
  it('maps each action to the correct destination state', () => {
    expect(VISITOR_TRANSITIONS.approve.to).toBe('APPROVED')
    expect(VISITOR_TRANSITIONS.deny.to).toBe('DENIED')
    expect(VISITOR_TRANSITIONS.checkin.to).toBe('ENTERED')
    expect(VISITOR_TRANSITIONS.checkout.to).toBe('EXITED')
  })

  it('models the full happy path PENDING -> APPROVED -> ENTERED -> EXITED', () => {
    let status: VisitorStatus = 'PENDING'
    expect(canTransition('approve', status)).toBe(true)
    status = VISITOR_TRANSITIONS.approve.to
    expect(canTransition('checkin', status)).toBe(true)
    status = VISITOR_TRANSITIONS.checkin.to
    expect(canTransition('checkout', status)).toBe(true)
    status = VISITOR_TRANSITIONS.checkout.to
    expect(status).toBe('EXITED')
  })
})
