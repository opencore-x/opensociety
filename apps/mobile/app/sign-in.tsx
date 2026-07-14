import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useSignIn } from '@clerk/clerk-expo'
import { View } from 'react-native'

import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit() {
    if (!isLoaded || pending) return
    setPending(true)
    setError(null)
    try {
      const attempt = await signIn.create({ identifier: email.trim(), password })
      if (attempt.status === 'complete') {
        await setActive({ session: attempt.createdSessionId })
        router.replace('/')
      } else {
        // e.g. needs_second_factor — MFA code entry is a follow-up.
        setError('Additional verification (two-factor) is required for this account.')
      }
    } catch (e) {
      const msg = (e as { errors?: { message?: string }[] })?.errors?.[0]?.message
      setError(msg ?? 'Sign in failed')
    } finally {
      setPending(false)
    }
  }

  return (
    <View className="flex-1 justify-center gap-3 bg-background p-6">
      <Input
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Input placeholder="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        onPress={onSubmit}
        disabled={!isLoaded || pending || !email.trim() || !password}
      >
        <Text>{pending ? 'Signing in…' : 'Sign in'}</Text>
      </Button>
      {error && <Text className="text-sm text-destructive">{error}</Text>}
    </View>
  )
}
