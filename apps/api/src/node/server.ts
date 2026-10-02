import { serve } from '@hono/node-server'
import { app } from '../index'
import type { Bindings } from '../types'
import { readNodeConfig } from './config'
import { startJobs } from './jobs'
import { createUploadStore } from './uploads'

const config = readNodeConfig(process.env)
const env: Bindings = {
  DATABASE_URL: config.databaseUrl, CLERK_SECRET_KEY: config.clerkSecret,
  CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY, CLERK_WEBHOOK_SECRET: process.env.CLERK_WEBHOOK_SECRET,
  WEB_ORIGINS: config.origins, UPLOADS: createUploadStore(config.uploads),
  PUSH_ENABLED: process.env.PUSH_ENABLED, EXPO_ACCESS_TOKEN: process.env.EXPO_ACCESS_TOKEN,
  BILL_REMINDER_DAYS: process.env.BILL_REMINDER_DAYS, SOCIETY_TIME_ZONE: process.env.SOCIETY_TIME_ZONE,
}
const stopJobs = startJobs(env, process.env.BILLING_ENABLED === 'true')
const server = serve({ fetch: (request) => app.fetch(request, env), port: config.port, hostname: config.hostname }, () => {
  console.log(`OpenSociety API listening on ${config.hostname}:${config.port}`)
})
let closing = false
async function shutdown() {
  if (closing) return
  closing = true
  const timeout = setTimeout(() => process.exit(1), 25_000)
  await Promise.all([stopJobs(), new Promise<void>((resolve) => server.close(() => resolve()))])
  clearTimeout(timeout)
  process.exit(0)
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
