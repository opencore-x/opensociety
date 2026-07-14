import { StatusBar } from 'expo-status-bar'
import { Link } from 'expo-router'
import { ScrollView, View } from 'react-native'

import { AuthStatus, CLERK_ENABLED } from '../components/auth-status'
import { cn } from '../lib/utils'
import { Text } from '../components/ui/text'

const RESIDENT = [
  { href: '/visitors', label: 'Visitors' },
  { href: '/pre-approve', label: 'Pre-approve' },
  { href: '/notices', label: 'Notices' },
  { href: '/tickets', label: 'Maintenance' },
  { href: '/my-house-help', label: 'House help' },
  { href: '/my-vehicles', label: 'Vehicles' },
  { href: '/bills', label: 'Bills' },
] as const

const GUARD = [
  { href: '/gate', label: 'Gate' },
  { href: '/duty', label: 'Duty' },
  { href: '/house-help', label: 'House help' },
] as const

function NavGroup({
  title,
  items,
}: {
  title: string
  items: readonly { href: string; label: string }[]
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </Text>
      <View className="overflow-hidden rounded-xl border border-border bg-card">
        {items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'px-4 py-3.5 text-base text-foreground',
              i > 0 && 'border-t border-border'
            )}
          >
            {item.label}
          </Link>
        ))}
      </View>
    </View>
  )
}

export default function Index() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-6 p-4">
      <View className="gap-1 pt-2">
        <Text className="text-3xl font-bold">OpenSociety</Text>
        <Text className="text-muted-foreground">Privacy-first society management</Text>
      </View>

      <NavGroup title="Resident" items={RESIDENT} />
      <NavGroup title="Guard" items={GUARD} />

      {CLERK_ENABLED && (
        <View className="pt-2">
          <AuthStatus />
        </View>
      )}
      <StatusBar style="auto" />
    </ScrollView>
  )
}
