import { useMemo } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Text } from '../components/ui/text'
import { Screen, PageIntro } from '../components/ui/screen'

function groupBy<T>(items: T[], key: (item: T) => string): Record<string, T[]> {
  const map: Record<string, T[]> = {}
  for (const item of items) (map[key(item)] ??= []).push(item)
  return map
}

// Resident profile: for each flat the user lives in, its co-residents and the
// vehicles registered to it.
export default function Profile() {
  const { t } = useT()
  const apts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })
  const residents = useQuery({ queryKey: ['my-residents'], queryFn: () => apiClient.listMyResidents() })
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() })

  const residentsByApt = useMemo(() => groupBy(residents.data ?? [], (r) => r.apartmentId), [residents.data])
  const vehiclesByApt = useMemo(() => groupBy(vehicles.data ?? [], (v) => v.apartmentId), [vehicles.data])

  if (apts.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (apts.isError)
    return (
      <Centered>
        <Text className="text-base font-semibold text-destructive">{t('gate.apiUnreachable')}</Text>
      </Centered>
    )

  const myApts = apts.data ?? []
  if (myApts.length === 0)
    return (
      <Centered>
        <Text className="text-sm text-muted-foreground">{t('common.noFlats')}</Text>
      </Centered>
    )

  return (
    <Screen>
      <PageIntro title={t('design.household')} description={t('design.profileHint')} />
      {myApts.map((a) => (
        <View key={a.id} className="gap-3 rounded-xl border border-border bg-card p-5">
          <View>
            <Text className="text-lg font-bold">
              {a.tower}-{a.apartmentNo}
            </Text>
            <Text className="text-sm text-muted-foreground">
              {[a.bhkType, a.floor != null ? `${t('profile.floor')} ${a.floor}` : null].filter(Boolean).join(' · ') || '—'}
            </Text>
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold">{t('profile.residents')}</Text>
            {(residentsByApt[a.id] ?? []).length === 0 ? (
              <Text className="text-sm text-muted-foreground">{t('profile.noResidents')}</Text>
            ) : (
              (residentsByApt[a.id] ?? []).map((r) => (
                <View key={r.userId} className="flex-row items-center justify-between">
                  <Text className="text-sm">{r.name}</Text>
                  <Text className="text-xs text-muted-foreground">{t('value.' + r.relation)}</Text>
                </View>
              ))
            )}
          </View>

          <View className="gap-1.5">
            <Text className="text-sm font-semibold">{t('nav.vehicles')}</Text>
            {(vehiclesByApt[a.id] ?? []).length === 0 ? (
              <Text className="text-sm text-muted-foreground">{t('profile.noVehicles')}</Text>
            ) : (
              (vehiclesByApt[a.id] ?? []).map((v) => (
                <View key={v.id} className="flex-row items-center justify-between">
                  <Text className="font-mono text-sm">{v.registrationNumber}</Text>
                  <Text className="text-xs text-muted-foreground">{t('value.' + v.type)}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      ))}
    </Screen>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1 bg-background">{children}</View>
}
