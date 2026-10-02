import { expect, it } from 'vitest'
import { validateHostingConfig } from './hosting-config'

it('rejects deployment builds with missing auth, local APIs, or development identities', () => {
  const valid = { DEPLOY_ENV: 'production', VITE_API_URL: 'https://api.example.com', VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_example' }
  expect(() => validateHostingConfig(valid)).not.toThrow()
  for (const override of [
    { VITE_API_URL: 'http://localhost:8787' }, { VITE_CLERK_PUBLISHABLE_KEY: '' },
    { VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_example' }, { VITE_DEV_USER_ID: 'user-id' }, { DEPLOY_ENV: 'typo' },
  ]) expect(() => validateHostingConfig({ ...valid, ...override })).toThrow()
  expect(() => validateHostingConfig({ ...valid, DEPLOY_ENV: 'staging', VITE_CLERK_PUBLISHABLE_KEY: 'pk_test_example' })).not.toThrow()
  expect(() => validateHostingConfig({})).not.toThrow()
})
