import { describe, it, expect } from 'vitest'
import type { TicketStatus } from '@opensociety/shared'
import {
  TICKET_TRANSITIONS,
  canTicketTransition,
  availableTicketActions,
  type TicketAction,
} from '@opensociety/shared'

const ALL_STATUSES: TicketStatus[] = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED']

// The only legal (action, from-state) pairs. Everything else must be rejected.
const LEGAL: Record<TicketAction, TicketStatus[]> = {
  start: ['OPEN'],
  resolve: ['IN_PROGRESS'],
  close: ['RESOLVED'],
  reopen: ['RESOLVED'],
  cancel: ['OPEN', 'IN_PROGRESS'],
}

describe('canTicketTransition', () => {
  for (const action of Object.keys(LEGAL) as TicketAction[]) {
    for (const status of ALL_STATUSES) {
      const legal = LEGAL[action].includes(status)
      it(`${action} from ${status} -> ${legal ? 'allowed' : 'blocked'}`, () => {
        expect(canTicketTransition(action, status)).toBe(legal)
      })
    }
  }
})

describe('TICKET_TRANSITIONS targets', () => {
  it('maps each action to the correct destination state', () => {
    expect(TICKET_TRANSITIONS.start.to).toBe('IN_PROGRESS')
    expect(TICKET_TRANSITIONS.resolve.to).toBe('RESOLVED')
    expect(TICKET_TRANSITIONS.close.to).toBe('CLOSED')
    expect(TICKET_TRANSITIONS.reopen.to).toBe('IN_PROGRESS')
    expect(TICKET_TRANSITIONS.cancel.to).toBe('CANCELLED')
  })

  it('models the full happy path OPEN -> IN_PROGRESS -> RESOLVED -> CLOSED', () => {
    let status: TicketStatus = 'OPEN'
    expect(canTicketTransition('start', status)).toBe(true)
    status = TICKET_TRANSITIONS.start.to
    expect(canTicketTransition('resolve', status)).toBe(true)
    status = TICKET_TRANSITIONS.resolve.to
    expect(canTicketTransition('close', status)).toBe(true)
    status = TICKET_TRANSITIONS.close.to
    expect(status).toBe('CLOSED')
  })

  it('allows reopening a RESOLVED ticket back to IN_PROGRESS', () => {
    expect(canTicketTransition('reopen', 'RESOLVED')).toBe(true)
    expect(TICKET_TRANSITIONS.reopen.to).toBe('IN_PROGRESS')
  })
})

describe('availableTicketActions', () => {
  it('offers start + cancel for an OPEN ticket', () => {
    expect(availableTicketActions('OPEN').sort()).toEqual(['cancel', 'start'])
  })

  it('offers resolve + cancel while IN_PROGRESS', () => {
    expect(availableTicketActions('IN_PROGRESS').sort()).toEqual(['cancel', 'resolve'])
  })

  it('offers close + reopen once RESOLVED', () => {
    expect(availableTicketActions('RESOLVED').sort()).toEqual(['close', 'reopen'])
  })

  it('offers nothing for terminal states', () => {
    for (const status of ['CLOSED', 'CANCELLED'] as TicketStatus[]) {
      expect(availableTicketActions(status)).toEqual([])
    }
  })
})
