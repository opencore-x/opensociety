import { useMemo, useState } from 'react'
import { ActivityIndicator, FlatList, Share, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'
import { visitorStatusSchema, visitorEntriesToCsv, type VisitorStatus } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Text } from '../components/ui/text'

const RANGES = [
  { key: 'history.rangeAll', days: null },
  { key: 'history.range30', days: 30 },
  { key: 'history.range7', days: 7 },
] as const

const DAY_MS = 86_400_000

function formatTime(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

// Resident visitor history: their apartments' past + current visitor entries,
// filterable by status and time range, exportable as CSV.
export default function VisitorHistory() {
  const { t } = useT()
  const [status, setStatus] = useState<VisitorStatus | 'ALL'>('ALL')
  // Compute the cutoff timestamp when a range is picked (an event), not during
  // render — Date.now() in render is impure/non-idempotent.
  const [range, setRange] = useState<{ days: number | null; cutoff: number | null }>({ days: null, cutoff: null })
  const pickRange = (days: number | null) =>
    setRange({ days, cutoff: days == null ? null : Date.now() - days * DAY_MS })

  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const myApts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })

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
    await Share.share({ message: visitorEntriesToCsv(rows) })
  }

  if (visitors.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (visitors.isError)
    return (
      <Centered>
        <Text className="text-base font-semibold text-destructive">{t('gate.apiUnreachable')}</Text>
      </Centered>
    )

  return (
    <FlatList
      className="bg-background"
      contentContainerClassName="gap-2 p-4"
      data={rows}
      keyExtractor={(v) => v.id}
      ListHeaderComponent={
        <View className="mb-1 gap-3">
          <View className="flex-row flex-wrap gap-2">
            {RANGES.map((r) => (
              <Chip key={r.key} label={t(r.key)} selected={range.days === r.days} onPress={() => pickRange(r.days)} />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            <Chip label={t('common.all')} selected={status === 'ALL'} onPress={() => setStatus('ALL')} />
            {visitorStatusSchema.options.map((s) => (
              <Chip key={s} label={s} selected={status === s} onPress={() => setStatus(s)} />
            ))}
          </View>
          <Button variant="outline" onPress={onExport} disabled={rows.length === 0}>
            <Text>{t('history.exportCsv')}</Text>
          </Button>
        </View>
      }
      ListEmptyComponent={<Text className="text-sm text-muted-foreground">{t('history.empty')}</Text>}
      renderItem={({ item }) => (
        <View className="gap-1 rounded-xl bg-muted p-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 text-base font-semibold">{item.visitorName}</Text>
            <Text className="overflow-hidden rounded-md bg-primary/10 px-2 py-0.5 text-xs text-primary">{item.status}</Text>
          </View>
          <Text className="text-sm text-muted-foreground">
            {item.type}
            {item.vehicleNumber ? ` · ${item.vehicleNumber}` : ''}
          </Text>
          <Text className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</Text>
        </View>
      )}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1 bg-background">{children}</View>
}
