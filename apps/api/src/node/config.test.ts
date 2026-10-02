import { describe, expect, it } from 'vitest'
import { readNodeConfig } from './config'
const base = { DATABASE_URL: 'postgresql://test:test@localhost/test' }
const production = {
  ...base, NODE_ENV: 'production', CLERK_SECRET_KEY: 'sk_live_test', WEB_ORIGINS: 'https://society.example.com',
  R2_ACCOUNT_ID: 'test', R2_BUCKET_NAME: 'test', R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test',
}
describe('Node deployment configuration', () => {
  it('binds unauthenticated development only to loopback by default', () => {
    expect(readNodeConfig(base)).toMatchObject({ hostname: '127.0.0.1', port: 8787, uploads: undefined })
  })
  it('requires production auth, exact HTTPS origins, and complete storage credentials', () => {
    for (const key of ['CLERK_SECRET_KEY', 'WEB_ORIGINS', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME']) {
      expect(() => readNodeConfig({ ...production, [key]: '' })).toThrow()
    }
    expect(() => readNodeConfig({ ...production, WEB_ORIGINS: '*' })).toThrow()
    expect(() => readNodeConfig({ ...production, WEB_ORIGINS: 'http://society.example.com' })).toThrow()
    expect(() => readNodeConfig({ ...production, CLERK_SECRET_KEY: 'sk_test_test' })).toThrow()
  })
  it('allows test Clerk keys only for an explicit staging deployment', () => {
    expect(readNodeConfig({ ...production, APP_ENV: 'staging', CLERK_SECRET_KEY: 'sk_test_test' }).clerkSecret).toBe('sk_test_test')
  })
  it('rejects malformed runtime settings without exposing secret values', () => {
    for (const PORT of ['0', '70000', 'invalid']) expect(() => readNodeConfig({ ...base, PORT })).toThrow('PORT')
    expect(() => readNodeConfig({ ...production, S3_ENDPOINT: 'https://user:password@host' })).toThrow('contain no credentials')
    expect(() => readNodeConfig({ ...production, DATABASE_URL: 'https://example.com' })).toThrow('PostgreSQL')
  })
})
