import { drizzle } from 'drizzle-orm/neon-serverless'
import { Pool } from '@neondatabase/serverless'
import * as schema from './schema'

// Factory: build a Drizzle client from an explicit connection string.
// Cloudflare Workers has no process.env at module-load time — the connection
// string arrives per-request via the fetch handler's `env`, so callers there
// must use createDb(env.DATABASE_URL) rather than a module-level singleton.
export function createDb(connectionString: string) {
  const pool = new Pool({ connectionString })
  return drizzle({ client: pool, schema })
}

export type Database = ReturnType<typeof createDb>

// Convenience for Node contexts (scripts, drizzle-kit, tests) where DATABASE_URL
// is present in the environment. Lazily instantiated so importing this module
// never throws on platforms without process.env.
let cached: Database | undefined
export function getDb(): Database {
  if (!cached) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL is not set')
    cached = createDb(url)
  }
  return cached
}
