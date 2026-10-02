export type UploadConfig = { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; pathStyle: boolean }

export function readNodeConfig(env: Record<string, string | undefined>) {
  const production = env.NODE_ENV === 'production'
  const required = (key: string) => {
    const value = env[key]?.trim()
    if (!value) throw new Error(`${key} is required`)
    return value
  }
  const port = Number(env.PORT ?? 8787)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535')
  const databaseUrl = required('DATABASE_URL')
  const database = new URL(databaseUrl)
  if (!['postgres:', 'postgresql:'].includes(database.protocol)) throw new Error('DATABASE_URL must use PostgreSQL')
  const clerkSecret = env.CLERK_SECRET_KEY?.trim()
  if (production && !/^sk_(live|test)_/.test(clerkSecret ?? '')) throw new Error('Production requires CLERK_SECRET_KEY')
  if (production && env.APP_ENV !== 'staging' && !clerkSecret?.startsWith('sk_live_')) {
    throw new Error('Live deployments require a live Clerk key; use APP_ENV=staging for test keys')
  }
  const origins = (env.WEB_ORIGINS ?? (production ? '' : 'http://localhost:3000,http://localhost:8081')).split(',').filter(Boolean)
  if (!origins.length) throw new Error('WEB_ORIGINS is required')
  for (const origin of origins) {
    const url = new URL(origin)
    if (url.origin !== origin || (production && url.protocol !== 'https:') || !['http:', 'https:'].includes(url.protocol)) {
      throw new Error('WEB_ORIGINS must contain exact web origins, using HTTPS in production')
    }
  }
  const endpoint = env.S3_ENDPOINT ?? (env.R2_ACCOUNT_ID ? `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined)
  let uploads: UploadConfig | undefined
  if (endpoint || production) {
    if (!endpoint) throw new Error('R2_ACCOUNT_ID or S3_ENDPOINT is required')
    const url = new URL(endpoint)
    if (url.username || url.password || !['http:', 'https:'].includes(url.protocol) || (production && url.protocol !== 'https:')) {
      throw new Error('The storage endpoint must use HTTPS in production and contain no credentials')
    }
    uploads = { endpoint, bucket: required('R2_BUCKET_NAME'), accessKeyId: required('R2_ACCESS_KEY_ID'), secretAccessKey: required('R2_SECRET_ACCESS_KEY'), pathStyle: env.S3_FORCE_PATH_STYLE === 'true' }
  }
  return { port, hostname: env.HOST ?? (production ? '0.0.0.0' : '127.0.0.1'), databaseUrl, clerkSecret, origins: origins.join(','), uploads }
}
