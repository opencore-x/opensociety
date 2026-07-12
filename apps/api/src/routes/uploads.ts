import { Hono } from 'hono'
import { withDb, withAuth, requireAuth } from '../middleware'
import type { AppEnv } from '../types'

// Photo / ID-proof storage backed by R2. Both endpoints require auth; a stored
// object is streamed back only to a signed-in user (keys are random UUIDs).
// Note: because GET is auth-gated, clients fetch with their token and build an
// object URL rather than using a bare <img src> — see the web/mobile wiring.
const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
}

export const uploadRoutes = new Hono<AppEnv>()
uploadRoutes.use('*', withDb)
uploadRoutes.use('*', withAuth)
uploadRoutes.use('*', requireAuth)

// Store a single file (raw body, its own content-type). Returns the object key
// and the path to fetch it back. 415 unsupported type, 413 too large.
uploadRoutes.post('/', async (c) => {
  const contentType = (c.req.header('content-type') ?? '').split(';')[0].trim()
  const ext = ALLOWED[contentType]
  if (!ext) return c.json({ error: 'unsupported content type' }, 415)

  const body = await c.req.arrayBuffer()
  if (body.byteLength === 0) return c.json({ error: 'empty body' }, 400)
  if (body.byteLength > MAX_BYTES) return c.json({ error: 'file too large (max 5MB)' }, 413)

  const key = `${crypto.randomUUID()}${ext}`
  await c.env.UPLOADS.put(key, body, { httpMetadata: { contentType } })
  return c.json({ key, url: `/uploads/${key}` }, 201)
})

// Stream a stored object back to a signed-in user.
uploadRoutes.get('/:key', async (c) => {
  const obj = await c.env.UPLOADS.get(c.req.param('key'))
  if (!obj) return c.json({ error: 'not found' }, 404)
  const headers = new Headers()
  obj.writeHttpMetadata(headers)
  headers.set('etag', obj.httpEtag)
  headers.set('cache-control', 'private, max-age=3600')
  return new Response(obj.body, { headers })
})
