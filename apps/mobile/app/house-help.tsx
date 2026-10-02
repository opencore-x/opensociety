import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FlatList, View } from 'react-native'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { PageIntro, ScreenState, EmptyState } from '../components/ui/screen'
import { AdaptiveRow, Badge, ConnectionNotice, Feedback } from '../components/ui/feedback'
import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

// Guard house-help view: pre-approved domestic staff are checked in instantly
// (no resident approval). Each active worker shows their in/out state and the
// matching action; an open attendance entry means "currently inside".
export default function HouseHelp() {
  const qc = useQueryClient()
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const { isOnline } = useSyncStatus()
  const help = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })
  const openEntries = useQuery({
    queryKey: ['house-help-entries', 'active'],
    queryFn: () => apiClient.listHouseHelpEntries({ active: true }),
  })

  const [search, setSearch] = useState('')
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['house-help'] })
    qc.invalidateQueries({ queryKey: ['house-help-entries'] })
  }
  const checkIn = useMutation({
    mutationFn: (id: string) => apiClient.checkInHouseHelp(id),
    onSuccess: invalidate,
  })
  const checkOut = useMutation({
    mutationFn: (entryId: string) => apiClient.checkOutHouseHelpEntry(entryId),
    onSuccess: invalidate,
  })
  const busy = checkIn.isPending || checkOut.isPending || !isOnline

  // houseHelpId -> open entry id (currently inside)
  const openByHelp = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of openEntries.data ?? []) map.set(e.houseHelpId, e.id)
    return map
  }, [openEntries.data])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const active = (help.data ?? []).filter((h) => h.isActive)
    return q ? active.filter((h) => h.name.toLowerCase().includes(q)) : active
  }, [help.data, search])

  if (help.isPending || openEntries.isPending) return <ScreenState loading />
  if (help.isError || openEntries.isError)
    return (
      <ScreenState
        onRetry={() => {
          help.refetch()
          openEntries.refetch()
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
      onRefresh={() => {
        help.refetch()
        openEntries.refetch()
      }}
      refreshing={help.isRefetching || openEntries.isRefetching}
      data={rows}
      keyExtractor={(h) => h.id}
      ListHeaderComponent={
        <View className="gap-4 mb-2">
          <ConnectionNotice />
          {(checkIn.isError || checkOut.isError) && <Feedback />}
          <PageIntro title={t('nav.houseHelp')} description={t('design.gateHelpHint')} />
          <Input
            className="mb-1"
            accessibilityLabel={t('houseHelp.searchPlaceholder')}
            placeholder={t('houseHelp.searchPlaceholder')}
            autoCorrect={false}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState icon="heart" title={t(search ? 'design.noMatch' : 'houseHelp.empty')} />
      }
      renderItem={({ item }) => {
        const openEntryId = openByHelp.get(item.id)
        const inside = openEntryId != null
        return (
          <View className="gap-2.5 rounded-xl border border-border bg-card p-5">
            <AdaptiveRow>
              <View className="flex-auto">
                <Text className="text-base font-semibold">{item.name}</Text>
                <Text className="text-sm text-muted-foreground">{t('value.' + item.type)}</Text>
              </View>
              <Badge label={t(inside ? 'houseHelp.inside' : 'houseHelp.out')} positive={inside} />
            </AdaptiveRow>
            <View className="flex-row flex-wrap gap-2">
              {inside ? (
                <Button
                  variant="outline"
                  accessibilityLabel={`${t('common.checkOut')} ${item.name}`}
                  onPress={() => checkOut.mutate(openEntryId)}
                  disabled={busy}
                >
                  <Text>{t('common.checkOut')}</Text>
                </Button>
              ) : (
                <Button
                  accessibilityLabel={`${t('common.checkIn')} ${item.name}`}
                  onPress={() => checkIn.mutate(item.id)}
                  disabled={busy}
                >
                  <Text>{t('common.checkIn')}</Text>
                </Button>
              )}
            </View>
          </View>
        )
      }}
    />
  )
}
