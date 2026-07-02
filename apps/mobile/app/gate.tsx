import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { availableVisitorActions } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

// Guard gate view: the visitors a guard acts on — APPROVED (expected at the
// gate) and ENTERED (currently inside) — with check-in / check-out actions.
export default function Gate() {
  const qc = useQueryClient()
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const checkIn = useMutation({
    mutationFn: (id: string) => apiClient.checkInVisitor(id),
    onSuccess: invalidate,
  })
  const checkOut = useMutation({
    mutationFn: (id: string) => apiClient.checkOutVisitor(id),
    onSuccess: invalidate,
  })
  const busy = checkIn.isPending || checkOut.isPending

  if (isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (isError)
    return (
      <Centered>
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  const gate = (data ?? []).filter((v) => v.status === 'APPROVED' || v.status === 'ENTERED')

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={gate}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={<Text style={styles.dim}>No visitors at the gate.</Text>}
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.visitorName}</Text>
                <Text style={styles.dim}>{item.type}</Text>
              </View>
              <Text style={styles.badge}>{item.status}</Text>
            </View>
            <View style={styles.actions}>
              {actions.includes('checkin') && (
                <Button label="Check in" onPress={() => checkIn.mutate(item.id)} disabled={busy} />
              )}
              {actions.includes('checkout') && (
                <Button
                  label="Check out"
                  variant="outline"
                  onPress={() => checkOut.mutate(item.id)}
                  disabled={busy}
                />
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
  badge: {
    fontSize: 12,
    color: '#0e7490',
    backgroundColor: '#cffafe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  actions: { flexDirection: 'row', gap: 8 },
})
