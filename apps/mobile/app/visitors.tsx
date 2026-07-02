import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native'
import { availableVisitorActions } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

export default function Visitors() {
  const qc = useQueryClient()
  const [denyingId, setDenyingId] = useState<string | null>(null)
  const [reason, setReason] = useState('')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['visitors'],
    queryFn: () => apiClient.listVisitors(),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['visitors'] })
  const approve = useMutation({
    mutationFn: (id: string) => apiClient.approveVisitor(id),
    onSuccess: invalidate,
  })
  const deny = useMutation({
    mutationFn: (v: { id: string; reason: string }) => apiClient.denyVisitor(v.id, v.reason),
    onSuccess: () => {
      setDenyingId(null)
      setReason('')
      invalidate()
    },
  })
  const busy = approve.isPending || deny.isPending

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

  return (
    <FlatList
      contentContainerStyle={styles.list}
      data={data ?? []}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={<Text style={styles.dim}>No visitors yet.</Text>}
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        const denying = denyingId === item.id
        return (
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.visitorName}</Text>
                <Text style={styles.dim}>{item.type}</Text>
              </View>
              <Text style={styles.badge}>{item.status}</Text>
            </View>

            {actions.length > 0 && !denying && (
              <View style={styles.actions}>
                {actions.includes('approve') && (
                  <Button label="Approve" onPress={() => approve.mutate(item.id)} disabled={busy} />
                )}
                {actions.includes('deny') && (
                  <Button
                    label="Deny"
                    variant="outline"
                    onPress={() => setDenyingId(item.id)}
                    disabled={busy}
                  />
                )}
              </View>
            )}

            {denying && (
              <View style={styles.denyPanel}>
                <TextInput
                  style={styles.input}
                  placeholder="Reason for denial"
                  value={reason}
                  onChangeText={setReason}
                  autoFocus
                />
                <View style={styles.actions}>
                  <Button
                    label={deny.isPending ? 'Denying…' : 'Confirm'}
                    variant="danger"
                    onPress={() => deny.mutate({ id: item.id, reason })}
                    disabled={busy || !reason.trim()}
                  />
                  <Button
                    label="Cancel"
                    variant="outline"
                    onPress={() => {
                      setDenyingId(null)
                      setReason('')
                    }}
                    disabled={busy}
                  />
                </View>
              </View>
            )}
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
  denyPanel: { gap: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
})
