import { useMemo, useState } from 'react'
import { FlatList, Linking, Pressable, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notice } from '@opensociety/shared'
import { noticeMatchesQuery } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
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

async function openAttachment(path: string) {
  try {
    const url = await apiClient.fetchUploadObjectUrl(path)
    await Linking.openURL(url)
  } catch {
    // best-effort; the attachment simply won't open if the fetch fails
  }
}

export default function Notices() {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, refetch } = useQuery({
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

  if (isLoading) return <ScreenState loading />
  if (isError) return <ScreenState title={t('notices.loadError')} onRetry={() => refetch()} />

  return (
    <FlatList
      className="bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 24, gap: 16 }}
      keyboardShouldPersistTaps="handled"
      data={notices}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <View className="mb-2 gap-4">
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
        <Pressable
          accessibilityRole="button"
          accessibilityHint={item.read === false ? t('design.markRead') : undefined}
          className="gap-4 rounded-xl border border-border bg-card p-5 active:bg-secondary"
          onPress={() => item.read === false && markRead.mutate(item.id)}
        >
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="flex-1 text-lg font-semibold leading-7">{item.title}</Text>
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
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="overflow-hidden rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {t('value.' + item.category)}
            </Text>
            <Text className="text-sm text-muted-foreground">{formatDate(item.publishedAt)}</Text>
          </View>
          <Text className="text-base leading-7 text-foreground">{item.body}</Text>
          {item.attachmentUrl && (
            <Pressable
              accessibilityRole="link"
              className="min-h-[44px] flex-row items-center gap-2 self-start py-2"
              onPress={() => openAttachment(item.attachmentUrl!)}
            >
              <Icon name="attachment" size={18} />
              <Text className="shrink text-sm font-semibold text-primary">
                {item.attachmentName ?? t('notices.attachmentFallback')}
              </Text>
            </Pressable>
          )}
        </Pressable>
      )}
    />
  )
}
