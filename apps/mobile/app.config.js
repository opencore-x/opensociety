const { validateBuildEnvironment } = require('./scripts/build-environment.cjs')

module.exports = ({ config }) => {
  validateBuildEnvironment(process.env)
  const development = !['preview', 'production'].includes(process.env.APP_ENV)
  return {
    ...config,
    name: development ? 'OpenSociety Dev' : 'OpenSociety',
    scheme: development ? 'opensociety-dev' : 'opensociety',
    ios: {
      ...config.ios,
      bundleIdentifier: development ? 'com.opensociety.app.dev' : 'com.opensociety.app',
      appleTeamId: 'H4JB3X394X',
      infoPlist: { ...config.ios?.infoPlist, ITSAppUsesNonExemptEncryption: false },
    },
    android: {
      ...config.android,
      package: development ? 'com.opensociety.app.dev' : 'com.opensociety.app',
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
    },
  }
}
