// Learn more: https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')

const config = getDefaultConfig(__dirname)

// NativeWind v5 is zero-config here: the global stylesheet is imported directly
// in app/_layout.tsx and processed by react-native-css's Metro transformer.
module.exports = withNativeWind(config)
