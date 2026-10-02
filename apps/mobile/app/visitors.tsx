import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlatList, View } from 'react-native'
import { availableVisitorActions } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Icon } from '../components/ui/icon'
import { EmptyState, PageIntro, ScreenState } from '../components/ui/screen'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { AdaptiveRow, Badge, ConnectionNotice } from '../components/ui/feedback'
import { useSyncStatus } from '../lib/offline/use-sync-status'

export default function Visitors() {
  const qc = useQueryClient()
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const { isOnline } = useSyncStatus()
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const approve = useMutation({
    mutationFn: (id: string) => apiClient.approveVisitor(id),
    onSuccess: invalidate,
  })
  const deny = useMutation({
    mutationFn: (v: { id: string; reason: string }) => apiClient.denyVisitor(v.id, v.reason),
    onSuccess: () => {
      setDenyingId(null)
      setReason('')
      invalidate()
    },
  })
  const busy = approve.isPending || deny.isPending || !isOnline

  if (isPending) return <ScreenState loading />
  if (isError && !data)
    return <ScreenState title={t('design.loadFailed')} onRetry={() => refetch()} />

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
      automaticallyAdjustKeyboardInsets
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View className="gap-4">
          <ConnectionNotice />
          <PageIntro title={t('nav.visitors')} description={t('design.visitorsDescription')} />
        </View>
      }
      data={data ?? []}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={
        <EmptyState
          icon="people"
          title={t('visitors.empty')}
          description={t('design.visitorsEmpty')}
        />
      }
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        const denying = denyingId === item.id
        return (
          <Card className="gap-5 p-5">
            <AdaptiveRow>
              <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Icon name="people" />
              </View>
              <View className="flex-auto">
                <Text className="text-base font-semibold">{item.visitorName}</Text>
                <Text className="text-sm text-muted-foreground">{t('value.' + item.type)}</Text>
              </View>
              <Badge label={t('value.' + item.status)} />
            </AdaptiveRow>

            {actions.length > 0 && !denying && (
              <AdaptiveRow>
                {actions.includes('approve') && (
                  <Button
                    className="flex-auto"
                    accessibilityLabel={`${t('common.approve')} ${item.visitorName}`}
                    onPress={() => approve.mutate(item.id)}
                    disabled={busy}
                  >
                    <Text>{t('common.approve')}</Text>
                  </Button>
                )}
                {actions.includes('deny') && (
                  <Button
                    className="flex-auto"
                    variant="outline"
                    accessibilityLabel={`${t('common.deny')} ${item.visitorName}`}
                    onPress={() => setDenyingId(item.id)}
                    disabled={busy}
                  >
                    <Text>{t('common.deny')}</Text>
                  </Button>
                )}
              </AdaptiveRow>
            )}

            {((approve.isError && approve.variables === item.id) ||
              (deny.isError && deny.variables?.id === item.id)) && (
              <Text accessibilityRole="alert" className="text-sm text-destructive">
                {t('design.actionFailed')}
              </Text>
            )}

            {denying && (
              <View className="gap-2">
                <Input
                  accessibilityLabel={t('visitors.denyReason')}
                  placeholder={t('visitors.denyReason')}
                  value={reason}
                  onChangeText={setReason}
                  autoFocus
                />
                <AdaptiveRow>
                  <Button
                    variant="destructive"
                    onPress={() => deny.mutate({ id: item.id, reason })}
                    disabled={busy || !reason.trim()}
                  >
                    <Text>{deny.isPending ? t('visitors.denying') : t('common.confirm')}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setDenyingId(null)
                      setReason('')
                    }}
                    disabled={busy}
                  >
                    <Text>{t('common.cancel')}</Text>
                  </Button>
                </AdaptiveRow>
              </View>
            )}
          </Card>
        )
      }}
    />
  )
}
