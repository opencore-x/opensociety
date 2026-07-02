import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import type { Notice } from '@opensociety/shared'
import { apiClient } from '../api/client'

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
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['notices'],
    queryFn: () => apiClient.listNotices(),
  })

  if (isLoading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    )
  if (isError)
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>Couldn’t load notices</Text>
        <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
      </View>
    )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data ?? []}
      keyExtractor={(n) => n.id}
      ListEmptyComponent={<Text style={styles.dim}>No notices yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={[styles.badge, isUrgent(item.priority) && styles.badgeUrgent]}>
              {item.priority}
            </Text>
          </View>
          <Text style={styles.body}>{item.body}</Text>
          <Text style={styles.dim}>{formatDate(item.publishedAt)}</Text>
        </View>
      )}
    />
  )
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  card: { padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '600' },
  body: { color: '#3f3f46', fontSize: 14, lineHeight: 20 },
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
  badgeUrgent: { color: '#b91c1c', backgroundColor: '#fee2e2' },
})
