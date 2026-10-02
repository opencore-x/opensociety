import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { once } from 'node:events'
import { createUploadStore } from './uploads'
import type { UploadStore } from '../types'

let server: Server
let store: UploadStore
const objects = new Map<string, { body: Buffer; contentType: string }>()
const authorization: string[] = []
beforeAll(async () => {
  server = createServer(async (req, res) => {
    authorization.push(req.headers.authorization ?? '')
    const key = req.url!.split('?')[0]
    if (req.method === 'PUT') {
      const chunks: Buffer[] = []
      for await (const chunk of req) chunks.push(chunk)
      objects.set(key, { body: Buffer.concat(chunks), contentType: req.headers['content-type']! })
      res.setHeader('etag', '"test-etag"'); res.end(); return
    }
    const object = objects.get(key)
    if (!object) { res.writeHead(404, { 'content-type': 'application/xml' }); res.end('<Error><Code>NoSuchKey</Code></Error>'); return }
    res.writeHead(200, { 'content-type': object.contentType, etag: '"test-etag"' }); res.end(object.body)
  }).listen(0, '127.0.0.1')
  await once(server, 'listening')
  const address = server.address() as { port: number }
  store = createUploadStore({ endpoint: `http://127.0.0.1:${address.port}`, bucket: 'uploads', accessKeyId: 'test', secretAccessKey: 'test', pathStyle: true })
})
afterAll(() => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
describe('S3 upload adapter', () => {
  it('round-trips authenticated private objects with metadata and streamed bodies', async () => {
    await store.put('test.pdf', new TextEncoder().encode('private document').buffer, { httpMetadata: { contentType: 'application/pdf' } })
    const object = await store.get('test.pdf')
    expect(await new Response(object!.body).text()).toBe('private document')
    const headers = new Headers(); object!.writeHttpMetadata(headers)
    expect(headers.get('content-type')).toBe('application/pdf')
    expect(object!.httpEtag).toBe('"test-etag"')
    expect(authorization.every((value) => value.startsWith('AWS4-HMAC-SHA256 '))).toBe(true)
  })
  it('returns null for missing objects', async () => { expect(await store.get('missing.pdf')).toBeNull() })
})
