import { describe, it, expect } from 'vitest'
import { unreadNoticeCount } from '@opensociety/shared'

describe('unreadNoticeCount', () => {
  it('counts only notices explicitly flagged read=false', () => {
    expect(unreadNoticeCount([{ read: false }, { read: true }, { read: false }])).toBe(2)
  })

  it('treats an undefined read flag as read (not counted)', () => {
    expect(unreadNoticeCount([{}, { read: true }, { read: false }])).toBe(1)
  })

  it('is 0 for an empty list', () => {
    expect(unreadNoticeCount([])).toBe(0)
  })
})
