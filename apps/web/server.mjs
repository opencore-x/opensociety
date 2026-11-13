import process from 'node:process'
import { setTimeout, clearTimeout } from 'node:timers'
import { fileURLToPath, URL } from 'node:url'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { Hono } from 'hono'
import start from './dist/server/server.js'

const app = new Hono()
app.get('/health', (c) => c.json({ status: 'ok' }))
app.use('/assets/*', async (c, next) => {
  await next()
  if (c.res.ok) c.header('cache-control', 'public, max-age=31536000, immutable')
})
app.use('*', serveStatic({ root: fileURLToPath(new URL('./dist/client', import.meta.url)) }))
app.all('*', (c) => start.fetch(c.req.raw))
const server = serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000), hostname: process.env.HOST ?? '127.0.0.1' })
let closing = false
function shutdown() {
  if (closing) return
  closing = true
  const timeout = setTimeout(() => process.exit(1), 25_000)
  server.close(() => { clearTimeout(timeout); process.exit(0) })
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
