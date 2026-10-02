// Explicit deployment builds fail closed; ordinary local builds remain usable
// without a Clerk account or a public API.
export function validateHostingConfig(env: Record<string, string | undefined>) {
  if (!env.DEPLOY_ENV) return
  if (!['staging', 'production'].includes(env.DEPLOY_ENV)) throw new Error('DEPLOY_ENV must be staging or production')
  const api = new URL(env.VITE_API_URL ?? '')
  if (api.protocol !== 'https:' || api.origin !== env.VITE_API_URL) throw new Error('VITE_API_URL must be an exact HTTPS origin')
  const prefix = env.DEPLOY_ENV === 'production' ? /^pk_live_/ : /^pk_(test|live)_/
  if (!prefix.test(env.VITE_CLERK_PUBLISHABLE_KEY ?? '')) throw new Error('A matching Clerk publishable key is required for deployment')
  if (env.VITE_DEV_USER_ID) throw new Error('VITE_DEV_USER_ID is not allowed in deployment builds')
}
