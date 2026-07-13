import { describe, it, expect } from 'vitest'
import { preApprovalQrValue, parsePreApprovalQrValue, PRE_APPROVAL_QR_PREFIX } from '@opensociety/shared'

describe('preApprovalQrValue', () => {
  it('prefixes and upper-cases the code', () => {
    expect(preApprovalQrValue('7f56bdfe')).toBe('OS-PA:7F56BDFE')
    expect(preApprovalQrValue(' abc123 ')).toBe(`${PRE_APPROVAL_QR_PREFIX}ABC123`)
  })
})

describe('parsePreApprovalQrValue', () => {
  it('round-trips a generated value', () => {
    expect(parsePreApprovalQrValue(preApprovalQrValue('7f56bdfe'))).toBe('7F56BDFE')
  })

  it('reads the prefixed form case-insensitively', () => {
    expect(parsePreApprovalQrValue('OS-PA:ABCD1234')).toBe('ABCD1234')
    expect(parsePreApprovalQrValue('os-pa:abcd1234')).toBe('ABCD1234')
  })

  it('accepts a bare code', () => {
    expect(parsePreApprovalQrValue('7F56BDFE')).toBe('7F56BDFE')
    expect(parsePreApprovalQrValue('  7f56bdfe  ')).toBe('7F56BDFE')
  })

  it('extracts a code query param from a URL', () => {
    expect(parsePreApprovalQrValue('https://gate.example.com/redeem?code=ABCD1234')).toBe('ABCD1234')
    expect(parsePreApprovalQrValue('opensociety://gate?foo=1&code=abcd1234')).toBe('ABCD1234')
  })

  it('rejects empty / non-code values', () => {
    expect(parsePreApprovalQrValue('')).toBeNull()
    expect(parsePreApprovalQrValue('   ')).toBeNull()
    expect(parsePreApprovalQrValue('https://example.com/no-code-here')).toBeNull()
    expect(parsePreApprovalQrValue('OS-PA:')).toBeNull()
    expect(parsePreApprovalQrValue('OS-PA:short')).toBeNull()
    expect(parsePreApprovalQrValue('has spaces inside')).toBeNull()
    expect(parsePreApprovalQrValue('code=')).toBeNull()
  })
})
