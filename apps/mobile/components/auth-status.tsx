import { Link } from 'expo-router'
import { Pressable, View } from 'react-native'
import { useState } from 'react'
import { useAuth, useClerk } from '@clerk/clerk-expo'

import { Text } from './ui/text'
import { usePushNotifications } from './push-provider'
import { useT } from '../lib/i18n'

// True when a Clerk publishable key is configured. Callers gate mounting
// <AuthStatus /> on this so Clerk hooks only run inside <ClerkProvider>.
export const CLERK_ENABLED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export function AuthStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const push = usePushNotifications()
  const { t } = useT()
  const [error, setError] = useState(false)
  const [busy, setBusy] = useState(false)
  const exit = async () => {
    setBusy(true)
    setError(false)
    try { await push.disconnect(); await signOut() }
    catch { setError(true) }
    finally { setBusy(false) }
  }
  if (!isLoaded) return null
  return isSignedIn ? (
    <View className="gap-2">
      {push.status !== 'unavailable' && (
        <Pressable accessibilityRole="button" disabled={push.status === 'busy' || push.status === 'ready'} onPress={() => push.enable()}>
          <Text className="text-sm text-primary">{t(push.status === 'ready' ? 'push.ready' : push.status === 'busy' ? 'push.busy' : 'push.enable')}</Text>
        </Pressable>
      )}
      {push.status === 'error' && <Text className="text-sm text-destructive">{t('push.failed')}</Text>}
      <Pressable accessibilityRole="button" disabled={busy} onPress={exit}>
        <Text className="text-base font-semibold text-primary">{busy ? t('common.loading') : t('push.signOut')}</Text>
      </Pressable>
      {error && <Text className="text-sm text-destructive">{t('push.signOutFailed')}</Text>}
    </View>
  ) : (
    <Link href="/sign-in" className="text-base font-semibold text-primary">
      Sign in →
    </Link>
  )
}
