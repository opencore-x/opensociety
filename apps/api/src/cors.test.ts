import { expect, it } from 'vitest'
import { app } from './index'
import type { Bindings } from './types'

it('allows only configured browser origins and keeps native requests working', async () => {
  const env = { WEB_ORIGINS: 'https://society.example.com', CLERK_SECRET_KEY: 'sk_live_test' } as Bindings
  for (const origin of ['https://society.example.com', 'https://unexpected.example.com', 'http://localhost:3000']) {
    const response = await app.request('/health', { headers: { Origin: origin } }, env)
    expect(response.status).toBe(200)
    expect(response.headers.get('access-control-allow-origin')).toBe(origin === env.WEB_ORIGINS ? origin : null)
  }
  const response = await app.request('/health', {}, env)
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ status: 'ok' })
})

it('does not allow development origins when Clerk is configured without an allowlist', async () => {
  const response = await app.request('/health', { headers: { Origin: 'http://localhost:3000' } }, { CLERK_SECRET_KEY: 'sk_test_test' } as Bindings)
  expect(response.headers.get('access-control-allow-origin')).toBeNull()
})
