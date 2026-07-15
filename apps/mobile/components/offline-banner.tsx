import { View } from 'react-native'

import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useT } from '../lib/i18n'
import { Text } from './ui/text'
import { cn } from '../lib/utils'

// Thin status bar shown at the top of guard screens. Hidden on the happy path
// (online, nothing queued); turns red when offline and blue while flushing the
// queue after reconnect.
export function OfflineBanner({ className }: { className?: string }) {
  const { t } = useT()
  const { isOnline, pending } = useSyncStatus()

  if (isOnline && pending === 0) return null

  const label = !isOnline
    ? pending > 0
      ? `${t('offline.offline')} — ${pending} ${t('offline.queued')}`
      : `${t('offline.offline')} — ${t('offline.offlineIdle')}`
    : `${t('offline.syncing')} ${pending} ${pending === 1 ? t('offline.entryOne') : t('offline.entryMany')}…`

  return (
    <View className={cn('w-full px-4 py-2', isOnline ? 'bg-primary' : 'bg-destructive', className)}>
      <Text className={cn('text-center text-sm font-medium', isOnline ? 'text-primary-foreground' : 'text-white')}>
        {label}
      </Text>
    </View>
  )
}
