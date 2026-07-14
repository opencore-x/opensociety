import { Link } from 'expo-router'
import { Pressable } from 'react-native'
import { useAuth, useClerk } from '@clerk/clerk-expo'

import { Text } from './ui/text'

// True when a Clerk publishable key is configured. Callers gate mounting
// <AuthStatus /> on this so Clerk hooks only run inside <ClerkProvider>.
export const CLERK_ENABLED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export function AuthStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  if (!isLoaded) return null
  return isSignedIn ? (
    <Pressable onPress={() => signOut()}>
      <Text className="text-base font-semibold text-primary">Sign out</Text>
    </Pressable>
  ) : (
    <Link href="/sign-in" className="text-base font-semibold text-primary">
      Sign in →
    </Link>
  )
}
