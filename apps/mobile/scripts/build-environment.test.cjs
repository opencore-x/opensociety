const { test } = require('node:test')
const assert = require('node:assert/strict')
const { validateBuildEnvironment } = require('./build-environment.cjs')
const valid = {
  APP_ENV: 'production',
  EXPO_PUBLIC_API_URL: 'https://api.example.test',
  EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_example',
}

test('store builds reject development authentication and unusable API endpoints', () => {
  for (const patch of [
    { EXPO_PUBLIC_API_URL: undefined },
    { EXPO_PUBLIC_API_URL: 'http://localhost:8787' },
    { EXPO_PUBLIC_API_URL: 'https://localhost:8787' },
    { EXPO_PUBLIC_API_URL: 'https://user:secret@example.test' },
    { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: undefined },
    { EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example' },
    { EXPO_PUBLIC_DEV_USER_ID: 'admin' },
  ]) assert.throws(() => validateBuildEnvironment({ ...valid, ...patch }))
  assert.doesNotThrow(() => validateBuildEnvironment(valid))
})

test('development works locally; preview permits the test Clerk instance', () => {
  assert.doesNotThrow(() => validateBuildEnvironment({}))
  assert.doesNotThrow(() => validateBuildEnvironment({ ...valid, APP_ENV: 'preview', EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_example' }))
})
