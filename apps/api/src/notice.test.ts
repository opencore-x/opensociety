import { describe, it, expect } from 'vitest'
import { noticeMatchesQuery } from '@opensociety/shared'

const n = { title: 'Water supply maintenance', body: 'Tank cleaning on Sunday morning.' }

describe('noticeMatchesQuery', () => {
  it('matches (case-insensitive) in the title', () => {
    expect(noticeMatchesQuery(n, 'WATER')).toBe(true)
    expect(noticeMatchesQuery(n, 'maintenance')).toBe(true)
  })
  it('matches in the body', () => {
    expect(noticeMatchesQuery(n, 'sunday')).toBe(true)
  })
  it('does not match unrelated keywords', () => {
    expect(noticeMatchesQuery(n, 'electricity')).toBe(false)
  })
  it('treats an empty/whitespace query as matching everything', () => {
    expect(noticeMatchesQuery(n, '')).toBe(true)
    expect(noticeMatchesQuery(n, '   ')).toBe(true)
  })
})
