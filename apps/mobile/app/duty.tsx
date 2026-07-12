import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

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
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((guards.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={rows}
      keyExtractor={(g) => g.id}
      ListEmptyComponent={<Text style={styles.dim}>No active guards.</Text>}
      renderItem={({ item }) => {
        const sessionId = sessionByGuard.get(item.id)
        const onDuty = sessionId != null
        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.dim}>{item.employeeCode ?? '—'}</Text>
              </View>
              <Text style={[styles.badge, onDuty ? styles.badgeOn : styles.badgeOff]}>
                {onDuty ? 'ON DUTY' : 'OFF'}
              </Text>
            </View>
            <View style={styles.actions}>
              {onDuty ? (
                <Button label="Clock out" variant="outline" onPress={() => clockOut.mutate(sessionId!)} disabled={busy} />
              ) : (
                <Button label="Clock in" onPress={() => clockIn.mutate(item.id)} disabled={busy} />
              )}
            </View>
          </View>
        )
      }}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  dim: { color: '#71717a', fontSize: 13 },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
  badge: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overflow: 'hidden' },
  badgeOn: { color: '#166534', backgroundColor: '#dcfce7' },
  badgeOff: { color: '#71717a', backgroundColor: '#e4e4e7' },
  actions: { flexDirection: 'row', gap: 8 },
})
