import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useSignIn } from '@clerk/clerk-expo'
import { StyleSheet, Text, TextInput, View } from 'react-native'
import { Button } from '../components/Button'

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
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        label={pending ? 'Signing in…' : 'Sign in'}
        onPress={onSubmit}
        disabled={!isLoaded || pending || !email.trim() || !password}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#fff' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  error: { color: '#e11d48', fontSize: 13 },
})
