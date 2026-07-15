import { StatusBar } from 'expo-status-bar'
import { Link } from 'expo-router'
import { ScrollView, View } from 'react-native'

import { AuthStatus, CLERK_ENABLED } from '../components/auth-status'
import { useT } from '../lib/i18n'
import { cn } from '../lib/utils'
import { Chip } from '../components/ui/chip'
import { Text } from '../components/ui/text'

const RESIDENT = [
  { href: '/visitors', key: 'nav.visitors' },
  { href: '/pre-approve', key: 'nav.preApprove' },
  { href: '/notices', key: 'nav.notices' },
  { href: '/tickets', key: 'nav.maintenance' },
  { href: '/my-house-help', key: 'nav.houseHelp' },
  { href: '/my-vehicles', key: 'nav.vehicles' },
  { href: '/bills', key: 'nav.bills' },
] as const

const GUARD = [
  { href: '/gate', key: 'nav.gate' },
  { href: '/duty', key: 'nav.duty' },
  { href: '/house-help', key: 'nav.houseHelp' },
] as const

function NavGroup({
  title,
  items,
}: {
  title: string
  items: readonly { href: string; key: string }[]
}) {
  const { t } = useT()
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn('px-4 py-3.5 text-base text-foreground', i > 0 && 'border-t border-border')}
          >
            {t(item.key)}
          </Link>
        ))}
      </View>
    </View>
  )
}

function LanguageSwitcher() {
  const { language, setLanguage } = useT()
  return (
    <View className="flex-row gap-2">
      <Chip label="English" selected={language === 'en'} onPress={() => setLanguage('en')} />
      <Chip label="हिंदी" selected={language === 'hi'} onPress={() => setLanguage('hi')} />
    </View>
  )
}

export default function Index() {
  const { t } = useT()
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View className="gap-2 pt-2">
        <Text className="text-3xl font-bold">{t('nav.appName')}</Text>
        <Text className="text-muted-foreground">{t('home.subtitle')}</Text>
        <View className="pt-1">
          <LanguageSwitcher />
        </View>
      </View>

      <NavGroup title={t('home.resident')} items={RESIDENT} />
      <NavGroup title={t('home.guard')} items={GUARD} />

      {CLERK_ENABLED && (
        <View className="pt-2">
          <AuthStatus />
        </View>
      )}
      <StatusBar style="auto" />
    </ScrollView>
  )
}
