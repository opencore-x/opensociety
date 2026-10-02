import { useMemo, useState } from 'react'
import { FlatList, Share, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { visitorStatusSchema, visitorEntriesToCsv, type VisitorStatus } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Text } from '../components/ui/text'
import { PageIntro, ScreenState, EmptyState, Screen } from '../components/ui/screen'
import { AdaptiveRow, Badge, ConnectionNotice, Feedback } from '../components/ui/feedback'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const RANGES = [
  { key: 'history.rangeAll', days: null },
  { key: 'history.range30', days: 30 },
  { key: 'history.range7', days: 7 },
] as const

const DAY_MS = 86_400_000

// Kept at module scope so the Date.now() read isn't in the component render path.
function cutoffMs(days: number | null): number | null {
  return days == null ? null : Date.now() - days * DAY_MS
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// Resident visitor history: their apartments' past + current visitor entries,
// filterable by status and time range, exportable as CSV.
export default function VisitorHistory() {
  const { t } = useT()
  const insets = useSafeAreaInsets()
  const [shareError, setShareError] = useState(false)
  const [status, setStatus] = useState<VisitorStatus | 'ALL'>('ALL')
  // Compute the cutoff timestamp when a range is picked (an event), not during
  // render — Date.now() in render is impure/non-idempotent.
  const [range, setRange] = useState<{ days: number | null; cutoff: number | null }>({
    days: null,
    cutoff: null,
  })
  const pickRange = (days: number | null) => setRange({ days, cutoff: cutoffMs(days) })

  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const myApts = useQuery({
    queryKey: ['my-apartments'],
    queryFn: () => apiClient.listMyApartments(),
  })

  const myAptIds = useMemo(() => new Set((myApts.data ?? []).map((a) => a.id)), [myApts.data])

  const rows = useMemo(() => {
    const cutoff = range.cutoff
    return (visitors.data ?? [])
      .filter((v) => myAptIds.size === 0 || myAptIds.has(v.apartmentId))
      .filter((v) => status === 'ALL' || v.status === status)
      .filter((v) => {
        if (cutoff == null) return true
        const ms = new Date(v.createdAt).getTime()
        return Number.isNaN(ms) || ms >= cutoff
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [visitors.data, myAptIds, status, range.cutoff])

  const onExport = async () => {
    if (rows.length === 0) return
    setShareError(false)
    try {
      await Share.share({ message: visitorEntriesToCsv(rows) })
    } catch {
      setShareError(true)
    }
  }

  if (visitors.isPending || myApts.isPending) return <ScreenState loading />
  if (visitors.isError || myApts.isError)
    return (
      <ScreenState
        onRetry={() => {
          visitors.refetch()
          myApts.refetch()
        }}
      />
    )
  if (!myApts.data?.length)
    return (
      <Screen>
        <EmptyState icon="home" title={t('common.noFlats')} description={t('design.noFlatsHint')} />
      </Screen>
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
      refreshing={visitors.isRefetching}
      onRefresh={() => visitors.refetch()}
      data={rows}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View className="mb-1 gap-4">
          <ConnectionNotice />
          {shareError && <Feedback message={t('design.shareFailed')} />}
          <PageIntro title={t('nav.visitorHistory')} description={t('design.historyHint')} />
          <View className="flex-row flex-wrap gap-2">
            {RANGES.map((r) => (
              <Chip
                key={r.key}
                label={t(r.key)}
                selected={range.days === r.days}
                onPress={() => pickRange(r.days)}
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip
              label={t('common.all')}
              selected={status === 'ALL'}
              onPress={() => setStatus('ALL')}
            />
            {visitorStatusSchema.options.map((s) => (
              <Chip
                key={s}
                label={t('value.' + s)}
                selected={status === s}
                onPress={() => setStatus(s)}
              />
            ))}
          </View>
          <Button variant="outline" onPress={onExport} disabled={rows.length === 0}>
            <Text>{t('history.exportCsv')}</Text>
          </Button>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="history" title={t('history.empty')} />}
      renderItem={({ item }) => (
        <View className="gap-1 rounded-xl border border-border bg-card p-5">
          <AdaptiveRow>
            <Text className="flex-auto text-base font-semibold">{item.visitorName}</Text>
            <Badge label={t('value.' + item.status)} />
          </AdaptiveRow>
          <Text className="text-sm text-muted-foreground">
            {t('value.' + item.type)}
            {item.vehicleNumber ? ` · ${item.vehicleNumber}` : ''}
          </Text>
          <Text className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</Text>
        </View>
      )}
    />
  )
}
