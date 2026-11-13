import { after, before, test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { setTimeout } from 'node:timers/promises'

const containers = []
const docker = (...args) => execFileSync('docker', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
async function start(image, port, environment = {}) {
  const id = docker('run', '-d', '--read-only', '--tmpfs', '/tmp', '--cap-drop=ALL', '--security-opt=no-new-privileges',
    '--memory=384m', '-p', `127.0.0.1::${port}`,
    ...Object.entries(environment).flatMap(([key, value]) => ['-e', `${key}=${value}`]), image)
  containers.push(id)
  const address = docker('port', id, `${port}/tcp`)
  const base = `http://${address}`
  for (let attempt = 0; attempt < 60; attempt++) {
    try { if ((await fetch(`${base}/health`)).ok) return base } catch { /* wait for startup */ }
    await setTimeout(250)
  }
  throw new Error(`Container failed to start: ${docker('logs', id)}`)
}

let api, web
before(async () => {
  api = await start('opensociety-api:test', 8787, {
    DATABASE_URL: 'postgresql://test:test@localhost/test', APP_ENV: 'staging',
    CLERK_SECRET_KEY: 'sk_test_placeholder', WEB_ORIGINS: 'https://society.example.com',
    R2_ACCOUNT_ID: 'example', R2_BUCKET_NAME: 'test', R2_ACCESS_KEY_ID: 'test', R2_SECRET_ACCESS_KEY: 'test',
    BILLING_ENABLED: 'false', PUSH_ENABLED: 'false',
  })
  web = await start('opensociety-web:test', 3000)
})
after(() => { for (const id of containers) docker('rm', '-f', id) })

test('production API serves health and enforces the browser allowlist', async () => {
  const response = await fetch(`${api}/health`, { headers: { Origin: 'https://society.example.com' } })
  assert.deepEqual(await response.json(), { status: 'ok' })
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://society.example.com')
  const rejected = await fetch(`${api}/health`, { headers: { Origin: 'https://unexpected.example.com' } })
  assert.equal(rejected.headers.get('access-control-allow-origin'), null)
})

test('web image renders HTML and serves immutable CSS from its packaged dependencies', async () => {
  const response = await fetch(web)
  assert.equal(response.status, 200)
  const html = await response.text()
  assert.match(html, /OpenSociety/)
  const cssPath = html.match(/\/assets\/[^"\s]+\.css/)?.[0]
  assert.ok(cssPath)
  const css = await fetch(`${web}${cssPath}`)
  assert.equal(css.status, 200)
  assert.match(css.headers.get('content-type'), /text\/css/)
  assert.equal(css.headers.get('cache-control'), 'public, max-age=31536000, immutable')
})

test('both images run without root and shut down cleanly', () => {
  for (const id of containers) {
    assert.equal(docker('exec', id, 'id', '-u'), '1000')
    docker('stop', '-t', '30', id)
    assert.equal(docker('inspect', '--format', '{{.State.ExitCode}}', id), '0')
  }
})
