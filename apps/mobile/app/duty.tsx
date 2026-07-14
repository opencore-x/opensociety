import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { apiClient } from '../api/client'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Text } from '../components/ui/text'

// Guard duty screen: each active guard clocks in / out of their shift. An open
// duty session marks a guard ON DUTY. (Location capture on native needs
// expo-location — added as a follow-up; the API accepts optional coords.)
export default function Duty() {
  const qc = useQueryClient()
  const guards = useQuery({ queryKey: ['guards'], queryFn: () => apiClient.listGuards() })
  const active = useQuery({ queryKey: ['duty-active'], queryFn: () => apiClient.listActiveDuty() })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['guards'] })
    qc.invalidateQueries({ queryKey: ['duty-active'] })
  }
  const clockIn = useMutation({ mutationFn: (guardId: string) => apiClient.clockInGuard(guardId), onSuccess: invalidate })
  const clockOut = useMutation({ mutationFn: (sessionId: string) => apiClient.clockOutGuard(sessionId), onSuccess: invalidate })
  const busy = clockIn.isPending || clockOut.isPending

  const sessionByGuard = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of active.data ?? []) map.set(s.guardId, s.id)
    return map
  }, [active.data])

  const rows = (guards.data ?? []).filter((g) => g.isActive)

  if (guards.isLoading || active.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (guards.isError)
    return (
      <Centered>
        <Text className="text-base font-semibold text-destructive">API unreachable</Text>
        <Text className="text-sm text-muted-foreground">{String((guards.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerClassName="gap-2 p-4"
      data={rows}
      keyExtractor={(g) => g.id}
      ListEmptyComponent={<Text className="text-sm text-muted-foreground">No active guards.</Text>}
      renderItem={({ item }) => {
        const sessionId = sessionByGuard.get(item.id)
        const onDuty = sessionId != null
        return (
          <View className="gap-2.5 rounded-xl bg-muted p-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.name}</Text>
                <Text className="text-sm text-muted-foreground">{item.employeeCode ?? '—'}</Text>
              </View>
              <Text
                className={cn(
                  'overflow-hidden rounded-md px-2 py-1 text-xs',
                  onDuty ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                )}
              >
                {onDuty ? 'ON DUTY' : 'OFF'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {onDuty ? (
                <Button variant="outline" onPress={() => clockOut.mutate(sessionId!)} disabled={busy}>
                  <Text>Clock out</Text>
                </Button>
              ) : (
                <Button onPress={() => clockIn.mutate(item.id)} disabled={busy}>
                  <Text>Clock in</Text>
                </Button>
              )}
            </View>
          </View>
        )
      }}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1">{children}</View>
}
