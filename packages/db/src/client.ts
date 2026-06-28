import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Factory: build a Drizzle client from an explicit connection string using the
// stateless neon-http driver — ideal for per-request use on Cloudflare Workers
// (no connection pooling/cleanup) and works the same in Node.
// Cloudflare Workers has no process.env at module-load time; the connection
// string arrives per-request via the fetch handler's `env`, so callers there
// use createDb(env.DATABASE_URL).
export function createDb(connectionString: string) {
  const sql = neon(connectionString)
  return drizzle({ client: sql, schema })
}

export type Database = ReturnType<typeof createDb>

// Convenience for Node contexts (scripts/tests) where DATABASE_URL is present.
let cached: Database | undefined
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    cached = createDb(url)
  }
  return cached
}
