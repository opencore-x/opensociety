import '../global.css'

import { useEffect } from 'react'
import { Stack, usePathname } from 'expo-router'
import { Platform, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { palette } from '../lib/theme'
import { QueryClientProvider } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'

import { tokenCache } from '../lib/token-cache'
import { apiClient, setAuthTokenGetter } from '../api/client'
import { ApiContext } from '../api/context'
import { SessionProvider, useSession } from '../lib/session'
import { DemoBanner } from '../components/demo-banner'
import { queryClient, persistOptions } from '../lib/offline/query-client'
import { setupOnlineManager } from '../lib/offline/network'
import { registerOfflineMutationDefaults } from '../lib/offline/mutation-defaults'
import { I18nProvider, useT } from '../lib/i18n'
import { PushProvider } from '../components/push-provider'

// Drive offline state from the device network and teach the client how to
// replay queued writes after a restart. Module scope: runs once per app load,
// before the first render.
setupOnlineManager()
registerOfflineMutationDefaults(queryClient)

const CLERK_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

// Feeds the Clerk session token to the API client so requests carry a Bearer
// JWT once the user signs in (see api/client.ts).
function AuthBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])
  return null
}

function Nav() {
  const { t } = useT()
  const { mode, demo, revision } = useSession()
  return (
    <View className="flex-1 bg-background">
      <StatusBar style="dark" />
      <Stack
        key={revision}
        screenOptions={{
          headerStyle: { backgroundColor: palette.background },
          headerTintColor: palette.ink,
          headerShadowVisible: false,
          statusBarStyle: Platform.OS === 'android' ? 'dark' : undefined,
          headerTitleStyle: { fontSize: 16, fontWeight: '600' },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: palette.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={mode === 'live' && !!CLERK_PUBLISHABLE_KEY}>
          <Stack.Screen name="sign-in" options={{ title: t('nav.signIn') }} />
        </Stack.Protected>
        <Stack.Protected guard={mode === 'live' || demo?.role === 'resident'}>
          <Stack.Screen name="profile" options={{ title: t('nav.profile') }} />
          <Stack.Screen name="visitors" options={{ title: t('nav.visitors') }} />
          <Stack.Screen name="visitor-history" options={{ title: t('nav.visitorHistory') }} />
          <Stack.Screen name="pre-approve" options={{ title: t('nav.preApproveVisitor') }} />
          <Stack.Screen name="notices" options={{ title: t('nav.notices') }} />
          <Stack.Screen name="tickets" options={{ title: t('nav.maintenance') }} />
          <Stack.Screen name="my-house-help" options={{ title: t('nav.myHouseHelp') }} />
          <Stack.Screen name="my-vehicles" options={{ title: t('nav.myVehicles') }} />
          <Stack.Screen name="bills" options={{ title: t('nav.bills') }} />
        </Stack.Protected>
        <Stack.Protected guard={mode === 'live' || demo?.role === 'guard'}>
          <Stack.Screen name="gate" options={{ title: t('nav.gate') }} />
          <Stack.Screen name="vehicle-gate" options={{ title: t('nav.vehicleGate') }} />
          <Stack.Screen name="duty" options={{ title: t('nav.guardDuty') }} />
          <Stack.Screen name="register" options={{ title: t('nav.registerVisitor') }} />
          <Stack.Screen name="house-help" options={{ title: t('nav.houseHelp') }} />
        </Stack.Protected>
      </Stack>
      {mode === 'demo' && <DemoBanner />}
    </View>
  )
}

function LiveApp() {
  const content = (
    <ApiContext.Provider value={apiClient}>
      <PersistQueryClientProvider
        client={queryClient}
        persistOptions={persistOptions}
        onSuccess={() => {
          // Cache restored from disk — flush any writes that were queued offline
          // in a previous session.
          void queryClient.resumePausedMutations()
        }}
      >
        <Nav />
      </PersistQueryClientProvider>
    </ApiContext.Provider>
  )
  // Clerk is optional: without a publishable key the app runs on the dev
  // x-user-id fallback, mirroring the API's own conditional auth.
  if (!CLERK_PUBLISHABLE_KEY) return content
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthBridge />
      <PushProvider>{content}</PushProvider>
    </ClerkProvider>
  )
}

// Demo sessions get their own in-memory API and query cache, and never mount
// Clerk or push registration.
function SessionApp() {
  const { mode, demo, revision } = useSession()
  if (mode === 'live') return <LiveApp />
  if (demo) return (
    <ApiContext.Provider key={revision} value={demo.api}>
      <QueryClientProvider client={demo.queryClient}><Nav /></QueryClientProvider>
    </ApiContext.Provider>
  )
  return <Nav />
}

export default function RootLayout() {
  const pathname = usePathname()
  return (
    <I18nProvider>
      <SessionProvider initialLive={pathname === '/sign-in'}><SessionApp /></SessionProvider>
    </I18nProvider>
  )
}
