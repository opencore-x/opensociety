import { useState } from 'react'
import { Link } from 'expo-router'
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { AuthStatus, CLERK_ENABLED } from '../components/auth-status'
import { useT } from '../lib/i18n'
import { palette } from '../lib/theme'
import { cn } from '../lib/utils'
import { Chip } from '../components/ui/chip'
import { Icon, type IconName } from '../components/ui/icon'
import { Text } from '../components/ui/text'

type Destination = { href: string; key: string; detail: string; icon: IconName }

const EVERYDAY: Destination[] = [
  { href: '/visitors', key: 'nav.visitors', detail: 'design.visitorsHint', icon: 'people' },
  { href: '/bills', key: 'nav.bills', detail: 'design.billsHint', icon: 'receipt' },
  { href: '/notices', key: 'nav.notices', detail: 'design.noticesHint', icon: 'notice' },
  { href: '/tickets', key: 'nav.maintenance', detail: 'design.maintenanceHint', icon: 'tool' },
]
const HOUSEHOLD: Destination[] = [
  { href: '/my-house-help', key: 'nav.houseHelp', detail: 'design.helpHint', icon: 'heart' },
  { href: '/my-vehicles', key: 'nav.vehicles', detail: 'design.vehiclesHint', icon: 'car' },
  {
    href: '/visitor-history',
    key: 'nav.visitorHistory',
    detail: 'design.historyHint',
    icon: 'history',
  },
  { href: '/profile', key: 'nav.profile', detail: 'design.profileHint', icon: 'home' },
]
const GATE: Destination[] = [
  { href: '/gate', key: 'nav.gate', detail: 'design.gateHint', icon: 'shield' },
  { href: '/vehicle-gate', key: 'nav.vehicleGate', detail: 'design.vehicleGateHint', icon: 'car' },
  { href: '/duty', key: 'nav.duty', detail: 'design.dutyHint', icon: 'clock' },
  { href: '/house-help', key: 'nav.houseHelp', detail: 'design.gateHelpHint', icon: 'people' },
]

function DestinationLink({ item, tile }: { item: Destination; tile?: boolean }) {
  const { t } = useT()
  return (
    <Link href={item.href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${t(item.key)}. ${t(item.detail)}`}
        className={cn(
          'gap-3 bg-card p-5 active:bg-secondary',
          tile ? 'flex-1 rounded-xl border border-border' : 'flex-row items-center',
        )}
      >
        <View className="h-11 w-11 items-center justify-center rounded-full bg-secondary">
          <Icon name={item.icon} />
        </View>
        <View className={cn('gap-1', !tile && 'flex-1')}>
          <Text className="text-base font-semibold">{t(item.key)}</Text>
          <Text className="text-xs leading-5 text-muted-foreground">{t(item.detail)}</Text>
        </View>
        {!tile && <Icon name="chevron" size={17} color={palette.muted} />}
      </Pressable>
    </Link>
  )
}

export default function Index() {
  const { t, language, setLanguage } = useT()
  const [mode, setMode] = useState<'resident' | 'guard'>('resident')
  const { fontScale, width } = useWindowDimensions()
  const singleColumn = fontScale > 1.3 || width < 350
  const items = mode === 'resident' ? EVERYDAY : GATE

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.background }}>
      <ScrollView contentContainerClassName="gap-7 p-5 pb-8" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-2.5 pt-2">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
            <Icon name="home" size={18} color="#FFFFFF" />
          </View>
          <Text className="text-base font-semibold tracking-tight">OpenSociety</Text>
        </View>
        <View className="gap-3">
          <Text role="heading" className="text-[36px] font-bold leading-[43px] tracking-tight">
            {t(mode === 'resident' ? 'design.homeTitle' : 'design.guardTitle')}
          </Text>
          <Text className="text-base leading-6 text-muted-foreground">
            {t(mode === 'resident' ? 'design.homeSubtitle' : 'design.guardSubtitle')}
          </Text>
        </View>
        <View className="flex-row gap-1 rounded-full bg-secondary p-1">
          {(['resident', 'guard'] as const).map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === value }}
              onPress={() => setMode(value)}
              className={cn(
                'min-h-[44px] flex-1 items-center justify-center rounded-full px-3 py-2',
                mode === value && 'bg-card',
              )}
            >
              <Text
                className={cn(
                  'self-stretch text-center text-sm font-semibold leading-6',
                  mode !== value && 'text-muted-foreground',
                )}
              >
                {t(value === 'resident' ? 'design.myHome' : 'design.gateTools')}
              </Text>
            </Pressable>
          ))}
        </View>
        <Link href={mode === 'resident' ? '/pre-approve' : '/register'} asChild>
          <Pressable
            accessibilityRole="link"
            className="gap-5 rounded-3xl bg-primary p-6 active:opacity-90"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-white/15">
                <Icon name={mode === 'resident' ? 'people' : 'shield'} color="#FFFFFF" size={20} />
              </View>
              <Text className="flex-1 text-xs font-semibold uppercase tracking-widest text-white/80">
                {t('design.welcomeLabel')}
              </Text>
            </View>
            <View className="gap-2">
              <Text className="text-[25px] font-semibold leading-8 tracking-tight text-white">
                {t(mode === 'resident' ? 'design.inviteTitle' : 'nav.registerVisitor')}
              </Text>
              <Text className="text-sm leading-6 text-white/80">
                {t(mode === 'resident' ? 'design.inviteHint' : 'design.registerHint')}
              </Text>
            </View>
            <View className="flex-row items-center justify-between border-t border-white/20 pt-4">
              <Text className="flex-1 text-sm font-semibold text-white">
                {t(mode === 'resident' ? 'design.createPass' : 'design.registerAction')}
              </Text>
              <Icon name="arrow" color="#FFFFFF" size={20} />
            </View>
          </Pressable>
        </Link>
        <View className="gap-3">
          <Text role="heading" className="text-lg font-semibold">
            {t('design.everyday')}
          </Text>
          {[items.slice(0, 2), items.slice(2)].map((row, i) => (
            <View key={i} className={cn('gap-3', !singleColumn && 'flex-row')}>
              {row.map((item) => (
                <DestinationLink key={item.href} item={item} tile />
              ))}
            </View>
          ))}
        </View>
        {mode === 'resident' && (
          <View className="gap-3">
            <Text role="heading" className="text-lg font-semibold">
              {t('design.household')}
            </Text>
            <View className="overflow-hidden rounded-xl border border-border bg-card">
              {HOUSEHOLD.map((item, i) => (
                <View key={item.href}>
                  {i > 0 && <View className="mx-5 h-px bg-border" />}
                  <DestinationLink item={item} />
                </View>
              ))}
            </View>
          </View>
        )}
        {CLERK_ENABLED && <AuthStatus />}
        <View className="items-center gap-4 pt-1">
          <View className="flex-row flex-wrap justify-center gap-2">
            <Chip label="English" selected={language === 'en'} onPress={() => setLanguage('en')} />
            <Chip label="हिंदी" selected={language === 'hi'} onPress={() => setLanguage('hi')} />
          </View>
          <Text className="text-center text-xs text-muted-foreground">{t('design.promise')}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
