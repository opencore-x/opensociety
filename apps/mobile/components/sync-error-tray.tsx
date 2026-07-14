import { View } from 'react-native'

import { useSyncErrors } from '../lib/offline/use-sync-status'
import { Button } from './ui/button'
import { Text } from './ui/text'
import { cn } from '../lib/utils'

// Lists visitor registrations that failed to sync after coming back online, with
// per-entry Retry / Dismiss. Hidden when there's nothing to resolve.
export function SyncErrorTray({ className }: { className?: string }) {
  const { errors, retry, dismiss } = useSyncErrors()

  if (errors.length === 0) return null

  return (
    <View className={cn('gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-3', className)}>
      <Text className="text-sm font-semibold text-destructive">
        {errors.length} {errors.length === 1 ? 'entry' : 'entries'} failed to sync
      </Text>
      {errors.map((e) => (
        <View key={e.mutationId} className="gap-1.5 rounded-lg bg-background p-2.5">
          <Text className="text-sm font-medium">{e.visitorName}</Text>
          <Text className="text-xs text-muted-foreground">{e.message}</Text>
          <View className="flex-row gap-2">
            <Button size="sm" onPress={() => retry(e.mutationId)}>
              <Text>Retry</Text>
            </Button>
            <Button size="sm" variant="outline" onPress={() => dismiss(e.mutationId)}>
              <Text>Dismiss</Text>
            </Button>
          </View>
        </View>
      ))}
    </View>
  )
}
