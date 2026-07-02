import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider, useAuth } from '@clerk/clerk-expo'

import { tokenCache } from '../lib/token-cache'
import { setAuthTokenGetter } from '../api/client'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

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
      <Stack.Screen name="register" options={{ title: 'Register visitor' }} />
    </Stack>
  )
}

export default function RootLayout() {
  const content = (
    <QueryClientProvider client={queryClient}>
      <Nav />
    </QueryClientProvider>
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
