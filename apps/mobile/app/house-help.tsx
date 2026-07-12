import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

// Guard house-help view: pre-approved domestic staff are checked in instantly
// (no resident approval). Each active worker shows their in/out state and the
// matching action; an open attendance entry means "currently inside".
export default function HouseHelp() {
  const qc = useQueryClient()
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
  const busy = checkIn.isPending || checkOut.isPending

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

  if (help.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (help.isError)
    return (
      <Centered>
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((help.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={rows}
      keyExtractor={(h) => h.id}
      ListHeaderComponent={
        <TextInput
          style={styles.search}
          placeholder="Search house help by name"
          autoCorrect={false}
          value={search}
          onChangeText={setSearch}
        />
      }
      ListEmptyComponent={<Text style={styles.dim}>No house help found.</Text>}
      renderItem={({ item }) => {
        const openEntryId = openByHelp.get(item.id)
        const inside = openEntryId != null
        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.dim}>{item.type}</Text>
              </View>
              <Text style={[styles.badge, inside ? styles.badgeIn : styles.badgeOut]}>
                {inside ? 'INSIDE' : 'OUT'}
              </Text>
            </View>
            <View style={styles.actions}>
              {inside ? (
                <Button
                  label="Check out"
                  variant="outline"
                  onPress={() => checkOut.mutate(openEntryId)}
                  disabled={busy}
                />
              ) : (
                <Button label="Check in" onPress={() => checkIn.mutate(item.id)} disabled={busy} />
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
  },
  badgeIn: { color: '#166534', backgroundColor: '#dcfce7' },
  badgeOut: { color: '#71717a', backgroundColor: '#e4e4e7' },
  actions: { flexDirection: 'row', gap: 8 },
  search: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
    marginBottom: 4,
  },
})
