import { Link } from 'expo-router'
import { Pressable, StyleSheet, Text } from 'react-native'
import { useAuth, useClerk } from '@clerk/clerk-expo'

// True when a Clerk publishable key is configured. Callers gate mounting
// <AuthStatus /> on this so Clerk hooks only run inside <ClerkProvider>.
export const CLERK_ENABLED = !!process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY

export function AuthStatus() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  if (!isLoaded) return null
  return isSignedIn ? (
    <Pressable onPress={() => signOut()}>
      <Text style={styles.link}>Sign out</Text>
    </Pressable>
  ) : (
    <Link href="/sign-in" style={styles.link}>
      Sign in →
    </Link>
  )
}

const styles = StyleSheet.create({
  link: { marginTop: 16, fontSize: 16, color: '#0e7490', fontWeight: '600' },
})
