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

export default function Visitors() {
  const qc = useQueryClient()
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, refetch } = useQuery({
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
  const busy = approve.isPending || deny.isPending

  if (isLoading) return <ScreenState loading />
  if (isError) return <ScreenState title={t('gate.apiUnreachable')} onRetry={() => refetch()} />

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <PageIntro title={t('nav.visitors')} description={t('design.visitorsDescription')} />
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
            <View className="flex-row flex-wrap items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <Icon name="people" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.visitorName}</Text>
                <Text className="text-sm text-muted-foreground">
                  {item.type.replaceAll('_', ' ')}
                </Text>
              </View>
              <Text className="overflow-hidden rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
                {item.status.replaceAll('_', ' ')}
              </Text>
            </View>

            {actions.length > 0 && !denying && (
              <View className="flex-row flex-wrap gap-2">
                {actions.includes('approve') && (
                  <Button
                    className="flex-1"
                    onPress={() => approve.mutate(item.id)}
                    disabled={busy}
                  >
                    <Text>{t('common.approve')}</Text>
                  </Button>
                )}
                {actions.includes('deny') && (
                  <Button
                    className="flex-1"
                    variant="outline"
                    onPress={() => setDenyingId(item.id)}
                    disabled={busy}
                  >
                    <Text>{t('common.deny')}</Text>
                  </Button>
                )}
              </View>
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
                  placeholder={t('visitors.denyReason')}
                  value={reason}
                  onChangeText={setReason}
                  autoFocus
                />
                <View className="flex-row flex-wrap gap-2">
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
                </View>
              </View>
            )}
          </Card>
        )
      }}
    />
  )
}
