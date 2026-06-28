import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native'
import { apiClient } from '../api/client'

export default function Visitors() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  if (isLoading) return <Centered><ActivityIndicator /></Centered>
  if (isError)
    return (
      <Centered>
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data ?? []}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={<Text style={styles.dim}>No visitors yet.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.visitorName}</Text>
            <Text style={styles.dim}>{item.type}</Text>
          </View>
          <Text style={styles.badge}>{item.status}</Text>
        </View>
      )}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 8 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
  },
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
})
