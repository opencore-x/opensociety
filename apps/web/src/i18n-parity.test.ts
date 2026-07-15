import { describe, it, expect } from 'vitest'
import { webResources, mobileResources } from '@opensociety/shared'

// Guard: every key must exist in BOTH en and hi for each app's dictionary, so a
// key never renders in the wrong language (or leaks the raw key). Catches a
// one-language-only key at CI time.
describe('i18n dictionary parity (en ↔ hi)', () => {
  for (const [name, res] of [
    ['web', webResources],
    ['mobile', mobileResources],
  ] as const) {
    it(`${name}: en and hi have identical key sets`, () => {
      const missingInHi = Object.keys(res.en).filter((k) => !(k in res.hi))
      const missingInEn = Object.keys(res.hi).filter((k) => !(k in res.en))
      expect({ missingInHi, missingInEn }).toEqual({ missingInHi: [], missingInEn: [] })
    })
  }
})
