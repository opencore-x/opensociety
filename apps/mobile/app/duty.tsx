import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlatList, View } from 'react-native'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Text } from '../components/ui/text'
import { PageIntro, ScreenState, EmptyState } from '../components/ui/screen'
import { AdaptiveRow, Badge, ConnectionNotice, Feedback } from '../components/ui/feedback'
import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Guard duty screen: each active guard clocks in / out of their shift. An open
// duty session marks a guard ON DUTY. (Location capture on native needs
// expo-location — added as a follow-up; the API accepts optional coords.)
export default function Duty() {
  const qc = useQueryClient()
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const { isOnline } = useSyncStatus()
  const guards = useQuery({ queryKey: ['guards'], queryFn: () => apiClient.listGuards() })
  const active = useQuery({ queryKey: ['duty-active'], queryFn: () => apiClient.listActiveDuty() })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guards'] })
    qc.invalidateQueries({ queryKey: ['duty-active'] })
  }
  const clockIn = useMutation({
    mutationFn: (guardId: string) => apiClient.clockInGuard(guardId),
    onSuccess: invalidate,
  })
  const clockOut = useMutation({
    mutationFn: (sessionId: string) => apiClient.clockOutGuard(sessionId),
    onSuccess: invalidate,
  })
  const busy = clockIn.isPending || clockOut.isPending || !isOnline

  const sessionByGuard = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of active.data ?? []) map.set(s.guardId, s.id)
    return map
  }, [active.data])

  const rows = (guards.data ?? []).filter((g) => g.isActive)

  if (guards.isPending || active.isPending) return <ScreenState loading />
  if (guards.isError || active.isError)
    return (
      <ScreenState
        onRetry={() => {
          guards.refetch()
          active.refetch()
        }}
      />
    )

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{
        width: '100%',
        maxWidth: 720,
        alignSelf: 'center',
        padding: 20,
        paddingBottom: insets.bottom + 24,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View className="gap-4">
          <ConnectionNotice />
          <PageIntro title={t('nav.guardDuty')} description={t('design.dutyHint')} />
          {(clockIn.isError || clockOut.isError) && <Feedback />}
        </View>
      }
      onRefresh={() => {
        guards.refetch()
        active.refetch()
      }}
      refreshing={guards.isRefetching || active.isRefetching}
      data={rows}
      keyExtractor={(g) => g.id}
      ListEmptyComponent={<EmptyState icon="clock" title={t('duty.empty')} />}
      renderItem={({ item }) => {
        const sessionId = sessionByGuard.get(item.id)
        const onDuty = sessionId != null
        return (
          <View className="gap-2.5 rounded-xl border border-border bg-card p-5">
            <AdaptiveRow>
              <View className="flex-auto">
                <Text className="text-base font-semibold">{item.name}</Text>
                <Text className="text-sm text-muted-foreground">{item.employeeCode ?? '—'}</Text>
              </View>
              <Badge label={t(onDuty ? 'duty.onDuty' : 'duty.off')} positive={onDuty} />
            </AdaptiveRow>
            <View className="flex-row flex-wrap gap-2">
              {onDuty ? (
                <Button
                  variant="outline"
                  accessibilityLabel={`${t('duty.clockOut')} ${item.name}`}
                  onPress={() => clockOut.mutate(sessionId!)}
                  disabled={busy}
                >
                  <Text>{t('duty.clockOut')}</Text>
                </Button>
              ) : (
                <Button
                  accessibilityLabel={`${t('duty.clockIn')} ${item.name}`}
                  onPress={() => clockIn.mutate(item.id)}
                  disabled={busy}
                >
                  <Text>{t('duty.clockIn')}</Text>
                </Button>
              )}
            </View>
          </View>
        )
      }}
    />
  )
}
