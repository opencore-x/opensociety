import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './types'
import { societyRoutes } from './routes/society'
import { apartmentRoutes } from './routes/apartments'
import { visitorRoutes } from './routes/visitors'
import { noticeRoutes } from './routes/notices'
import { userRoutes } from './routes/users'
import { guardRoutes } from './routes/guards'
import { webhookRoutes } from './routes/webhooks'

const app = new Hono<AppEnv>()

// TODO: tighten origins once web/mobile deploy URLs are known.
app.use('*', cors())

// Health checks intentionally avoid the DB so they work without DATABASE_URL.
app.get('/', (c) => c.json({ name: 'opensociety-api', status: 'ok' }))
app.get('/health', (c) => c.json({ status: 'ok' }))

app.route('/society', societyRoutes)
app.route('/apartments', apartmentRoutes)
app.route('/visitors', visitorRoutes)
app.route('/notices', noticeRoutes)
app.route('/users', userRoutes)
app.route('/guards', guardRoutes)
app.route('/webhooks', webhookRoutes)

app.notFound((c) => c.json({ error: 'not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: err.message || 'internal error' }, 500)
})

export default app
