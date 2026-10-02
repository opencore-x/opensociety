import { useMemo, useState } from 'react'
import { FlatList, Linking, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notice } from '@opensociety/shared'
import { noticeMatchesQuery } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { AdaptiveRow, ConnectionNotice, Feedback } from '../components/ui/feedback'
import { useSyncStatus } from '../lib/offline/use-sync-status'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { cn } from '../lib/utils'
import { Icon } from '../components/ui/icon'
import { EmptyState, PageIntro, ScreenState } from '../components/ui/screen'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function isUrgent(priority: Notice['priority']): boolean {
  return priority === 'HIGH' || priority === 'URGENT'
}

export default function Notices() {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const { isOnline } = useSyncStatus()
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [opening, setOpening] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const { data, isPending, isError, refetch, isRefetching } = useQuery({
    queryKey: ['notices'],
    queryFn: () => apiClient.listNotices(),
  })

  const notices = useMemo(
    () => (data ?? []).filter((n) => noticeMatchesQuery(n, search)),
    [data, search],
  )

  const qc = useQueryClient()
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.markNoticeRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  })

  async function openAttachment(id: string, path: string) {
    setAttachmentError(null)
    setOpening(id)
    try {
      const url = await apiClient.fetchUploadObjectUrl(path)
      await Linking.openURL(url)
    } catch {
      setAttachmentError(id)
    } finally {
      setOpening(null)
    }
  }

  if (isPending) return <ScreenState loading />
  if (isError && !data)
    return <ScreenState title={t('notices.loadError')} onRetry={() => refetch()} />

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
      refreshing={isRefetching}
      onRefresh={() => refetch()}
      data={notices}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <View className="mb-2 gap-4">
          <ConnectionNotice />
          <PageIntro
            title={t('design.noticesTitle')}
            description={t('design.noticesDescription')}
          />
          <Input
            accessibilityLabel={t('notices.searchPlaceholder')}
            placeholder={t('notices.searchPlaceholder')}
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState icon="notice" title={search ? t('notices.noMatch') : t('notices.empty')} />
      }
      renderItem={({ item }) => (
        <View className="gap-4 rounded-xl border border-border bg-card p-5">
          <AdaptiveRow>
            <Text className="flex-auto text-lg font-semibold leading-7">{item.title}</Text>
            {item.read === false && (
              <Text className="overflow-hidden rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
                {t('notices.new')}
              </Text>
            )}
            <Text
              className={cn(
                'overflow-hidden rounded-md px-2 py-0.5 text-xs',
                isUrgent(item.priority)
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-primary/10 text-primary',
              )}
            >
              {t('design.priority.' + item.priority)}
            </Text>
          </AdaptiveRow>
          <AdaptiveRow className="justify-between">
            <Text className="overflow-hidden rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {t('value.' + item.category)}
            </Text>
            <Text className="text-sm text-muted-foreground">{formatDate(item.publishedAt)}</Text>
          </AdaptiveRow>
          <Text className="text-base leading-7 text-foreground">{item.body}</Text>
          {item.read === false && (
            <Button
              variant="outline"
              size="sm"
              accessibilityLabel={`${t('design.markRead')}: ${item.title}`}
              disabled={markRead.isPending || !isOnline}
              onPress={() => markRead.mutate(item.id)}
            >
              <Text>{t('design.markRead')}</Text>
            </Button>
          )}
          {markRead.isError && markRead.variables === item.id && <Feedback />}
          {item.attachmentUrl && (
            <Button
              variant="ghost"
              disabled={opening !== null || !isOnline}
              accessibilityLabel={item.attachmentName ?? t('notices.attachmentFallback')}
              onPress={() => openAttachment(item.id, item.attachmentUrl!)}
            >
              <Icon name="attachment" size={18} />
              <Text>
                {opening === item.id
                  ? t('common.loading')
                  : (item.attachmentName ?? t('notices.attachmentFallback'))}
              </Text>
            </Button>
          )}
          {attachmentError === item.id && <Feedback message={t('design.attachmentFailed')} />}
        </View>
      )}
    />
  )
}
