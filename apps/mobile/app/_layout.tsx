import '../global.css'

import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'

import { tokenCache } from '../lib/token-cache'
import { setAuthTokenGetter } from '../api/client'
import { queryClient, persistOptions } from '../lib/offline/query-client'
import { setupOnlineManager } from '../lib/offline/network'
import { registerOfflineMutationDefaults } from '../lib/offline/mutation-defaults'

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
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'OpenSociety' }} />
      <Stack.Screen name="sign-in" options={{ title: 'Sign in' }} />
      <Stack.Screen name="visitors" options={{ title: 'Visitors' }} />
      <Stack.Screen name="pre-approve" options={{ title: 'Pre-approve visitor' }} />
      <Stack.Screen name="notices" options={{ title: 'Notices' }} />
      <Stack.Screen name="tickets" options={{ title: 'Maintenance' }} />
      <Stack.Screen name="gate" options={{ title: 'Gate' }} />
      <Stack.Screen name="duty" options={{ title: 'Guard duty' }} />
      <Stack.Screen name="register" options={{ title: 'Register visitor' }} />
      <Stack.Screen name="house-help" options={{ title: 'House help' }} />
      <Stack.Screen name="my-house-help" options={{ title: 'My house help' }} />
      <Stack.Screen name="my-vehicles" options={{ title: 'My vehicles' }} />
      <Stack.Screen name="bills" options={{ title: 'Bills' }} />
    </Stack>
  )
}

export default function RootLayout() {
  const content = (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
      onSuccess={() => {
        // Cache restored from disk — flush any writes that were queued offline
        // in a previous session.
        queryClient.resumePausedMutations()
      }}
    >
      <Nav />
    </PersistQueryClientProvider>
  )
  // Clerk is optional: without a publishable key the app runs on the dev
  // x-user-id fallback, mirroring the API's own conditional auth.
  if (!CLERK_PUBLISHABLE_KEY) return content
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <AuthBridge />
      {content}
    </ClerkProvider>
  )
}
