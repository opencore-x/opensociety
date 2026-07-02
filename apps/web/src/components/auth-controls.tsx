import { SignInButton, UserButton, useAuth } from '@clerk/tanstack-react-start'

// True when a Clerk publishable key is configured. Callers gate mounting
// <AuthControls /> on this so Clerk hooks only run inside <ClerkProvider>.
export const CLERK_ENABLED = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

export function AuthControls() {
  const { isLoaded, isSignedIn } = useAuth()
  if (!isLoaded) return null
  return isSignedIn ? (
    <UserButton />
  ) : (
    <SignInButton mode="modal">
      <button className="border-input hover:bg-accent rounded-md border px-3 py-1.5 text-sm font-medium transition-colors">
        Sign in
      </button>
    </SignInButton>
  )
}
