import { View } from 'react-native'
import { useT } from '../lib/i18n'
import { Button } from './ui/button'
import { Icon } from './ui/icon'
import { Input } from './ui/input'
import { PageIntro, Screen } from './ui/screen'
import { Text } from './ui/text'

type SignInFormProps = {
  email: string
  password: string
  onEmailChange: (value: string) => void
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  pending: boolean
  error: string | null
}

export function SignInForm({
  email,
  password,
  onEmailChange,
  onPasswordChange,
  onSubmit,
  disabled,
  pending,
  error,
}: SignInFormProps) {
  const { t } = useT()
  return (
    <Screen contentContainerClassName="gap-8 py-8">
      <View className="h-16 w-16 items-center justify-center rounded-3xl bg-primary">
        <Icon name="home" size={30} color="#FFFFFF" />
      </View>
      <PageIntro title={t('design.signInTitle')} description={t('design.signInDescription')} />
      <View className="gap-5 rounded-3xl border border-border bg-card p-5">
        <View className="gap-2">
          <Text className="text-sm font-semibold">{t('signIn.email')}</Text>
          <Input
            accessibilityLabel={t('signIn.email')}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={onEmailChange}
          />
        </View>
        <View className="gap-2">
          <Text className="text-sm font-semibold">{t('signIn.password')}</Text>
          <Input
            accessibilityLabel={t('signIn.password')}
            placeholder={t('signIn.password')}
            autoComplete="current-password"
            secureTextEntry
            returnKeyType="go"
            value={password}
            onChangeText={onPasswordChange}
            onSubmitEditing={() => !disabled && onSubmit()}
          />
        </View>
        {error && (
          <Text accessibilityRole="alert" className="text-sm leading-6 text-destructive">
            {error}
          </Text>
        )}
        <Button
          size="lg"
          onPress={onSubmit}
          disabled={disabled}
          accessibilityState={{ busy: pending, disabled }}
        >
          <Text>{pending ? t('signIn.signingIn') : t('nav.signIn')}</Text>
        </Button>
      </View>
      <Text className="text-center text-xs leading-5 text-muted-foreground">
        {t('design.promise')}
      </Text>
    </Screen>
  )
}
