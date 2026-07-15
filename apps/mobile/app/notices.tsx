import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Linking, Pressable, View } from 'react-native'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Notice } from '@opensociety/shared'
import { noticeMatchesQuery } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { cn } from '../lib/utils'

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
  const [search, setSearch] = useState('')
  const { data, isLoading, isError, error } = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })

  const notices = useMemo(() => (data ?? []).filter((n) => noticeMatchesQuery(n, search)), [data, search])

  const qc = useQueryClient()
  const markRead = useMutation({
    mutationFn: (id: string) => apiClient.markNoticeRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notices'] }),
  })

  if (isLoading)
    return (
      <View className="flex-1 items-center justify-center gap-1 bg-background">
        <ActivityIndicator />
      </View>
    )
  if (isError)
    return (
      <View className="flex-1 items-center justify-center gap-1 bg-background">
        <Text className="text-base font-semibold text-destructive">{t('notices.loadError')}</Text>
        <Text className="text-sm text-muted-foreground">{String((error as Error)?.message ?? 'error')}</Text>
      </View>
    )

  return (
    <FlatList
      className="bg-background"
      contentContainerClassName="gap-2 p-4"
      data={notices}
      keyExtractor={(n) => n.id}
      ListHeaderComponent={
        <Input
          className="mb-1"
          placeholder={t('notices.searchPlaceholder')}
          autoCorrect={false}
          value={search}
          onChangeText={setSearch}
        />
      }
      ListEmptyComponent={
        <Text className="text-sm text-muted-foreground">
          {search ? t('notices.noMatch') : t('notices.empty')}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          className="gap-1.5 rounded-xl bg-muted p-3"
          onPress={() => item.read === false && markRead.mutate(item.id)}
        >
          <View className="flex-row items-center gap-2">
            <Text className="flex-1 text-base font-semibold">{item.title}</Text>
            {item.read === false && (
              <Text className="overflow-hidden rounded-md bg-primary px-1.5 py-0.5 text-xs font-bold text-primary-foreground">
                {t('notices.new')}
              </Text>
            )}
            <Text
              className={cn(
                'overflow-hidden rounded-md px-2 py-0.5 text-xs',
                isUrgent(item.priority) ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              )}
            >
              {item.priority}
            </Text>
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="overflow-hidden rounded-md bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
              {item.category}
            </Text>
            <Text className="text-sm text-muted-foreground">{formatDate(item.publishedAt)}</Text>
          </View>
          <Text className="text-sm leading-5 text-foreground">{item.body}</Text>
          {item.attachmentUrl && (
            <Pressable className="self-start py-1" onPress={() => openAttachment(item.attachmentUrl!)}>
              <Text className="text-sm font-semibold text-primary">📎 {item.attachmentName ?? t('notices.attachmentFallback')}</Text>
            </Pressable>
          )}
        </Pressable>
      )}
    />
  )
}
