import { Platform } from 'react-native'
import * as SecureStore from 'expo-secure-store'

// Clerk session-token cache. Persists to the device keychain on native; on web
// (used for dev/testing) SecureStore is unavailable, so it no-ops and the
// session lives in memory for the page's lifetime.
export const tokenCache = {
  async getToken(key: string) {
    if (Platform.OS === 'web') return null
    try {
      return await SecureStore.getItemAsync(key)
    } catch {
      return null
    }
  },
  async saveToken(key: string, value: string) {
    if (Platform.OS === 'web') return
    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // ignore keychain write failures; Clerk falls back to in-memory
    }
  },
}
