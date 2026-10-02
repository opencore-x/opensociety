import { View } from 'react-native'

import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useT } from '../lib/i18n'
import { Text } from './ui/text'
import { cn } from '../lib/utils'

export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useT()
  const { isOnline, pending } = useSyncStatus()

  if (isOnline && pending === 0) return null

  const label = !isOnline
    ? pending > 0
      ? `${t('offline.offline')}. ${pending} ${t('offline.queued')}`
      : `${t('offline.offline')}. ${t('offline.offlineIdle')}`
    : `${t('offline.syncing')} ${pending} ${pending === 1 ? t('offline.entryOne') : t('offline.entryMany')}…`

  return (
    <View className={cn('w-full rounded-xl border border-border bg-secondary p-4', className)}>
      <Text accessibilityLiveRegion="polite" className="text-sm font-medium leading-6 text-primary">
        {label}
      </Text>
    </View>
  )
}
