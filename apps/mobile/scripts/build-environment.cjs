function validateBuildEnvironment(env) {
  if (!['preview', 'production'].includes(env.APP_ENV)) return
  let url
  try {
    url = new URL(env.EXPO_PUBLIC_API_URL)
  } catch {
    throw new Error('Preview and store builds require EXPO_PUBLIC_API_URL.')
  }
  if (url.protocol !== 'https:' || /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(url.hostname) || url.username || url.password) {
    throw new Error('Preview and store builds require an HTTPS API URL without credentials.')
  }
  if (!/^pk_(test|live)_/.test(env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || '')) {
    throw new Error('Preview and store builds require EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.')
  }
  if (env.APP_ENV === 'production' && !env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY.startsWith('pk_live_')) {
    throw new Error('Store builds require a live Clerk publishable key.')
  }
  if (env.EXPO_PUBLIC_DEV_USER_ID) {
    throw new Error('Remove EXPO_PUBLIC_DEV_USER_ID before creating preview or store builds.')
  }
}

module.exports = { validateBuildEnvironment }
