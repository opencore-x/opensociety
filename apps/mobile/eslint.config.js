// eslint-config-expo ships a flat config tuned for Expo / React Native.
const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  { ignores: ['dist/*', '.expo/*', 'node_modules/*'] },
];
