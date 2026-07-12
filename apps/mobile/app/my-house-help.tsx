import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Apartment, HouseHelp } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

// Resident view: manage which registered house help serves each of their flats.
export default function MyHouseHelp() {
  const apts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })
  const registry = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })

  if (apts.isLoading || registry.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (apts.isError)
    return (
      <Centered>
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((apts.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  const myApts = apts.data ?? []
  if (myApts.length === 0)
    return (
      <Centered>
        <Text style={styles.dim}>You have no flats assigned yet.</Text>
      </Centered>
    )

  return (
    <ScrollView contentContainerStyle={styles.list}>
      {myApts.map((a) => (
        <ApartmentAssignments key={a.id} apartment={a} registry={registry.data ?? []} />
      ))}
    </ScrollView>
  )
}

function ApartmentAssignments({ apartment, registry }: { apartment: Apartment; registry: HouseHelp[] }) {
  const qc = useQueryClient()
  const assigned = useQuery({
    queryKey: ['house-help-for-apartment', apartment.id],
    queryFn: () => apiClient.listHouseHelpForApartment(apartment.id),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartment.id] })
  const assign = useMutation({
    mutationFn: (helpId: string) => apiClient.assignHouseHelp(helpId, apartment.id),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (helpId: string) => apiClient.removeHouseHelpAssignment(helpId, apartment.id),
    onSuccess: invalidate,
  })
  const busy = assign.isPending || remove.isPending

  const assignedIds = new Set((assigned.data ?? []).map((h) => h.id))
  const unassigned = registry.filter((h) => h.isActive && !assignedIds.has(h.id))

  return (
    <View style={styles.section}>
      <Text style={styles.aptTitle}>
        {apartment.tower}-{apartment.apartmentNo}
      </Text>

      <Text style={styles.label}>Assigned help</Text>
      {(assigned.data ?? []).length === 0 && <Text style={styles.dim}>None yet.</Text>}
      {(assigned.data ?? []).map((h) => (
        <View key={h.id} style={styles.card}>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{h.name}</Text>
            <Text style={styles.dim}>{h.type}</Text>
          </View>
          <Button label="Remove" variant="outline" onPress={() => remove.mutate(h.id)} disabled={busy} />
        </View>
      ))}

      {unassigned.length > 0 && (
        <>
          <Text style={styles.label}>Add help</Text>
          {unassigned.map((h) => (
            <View key={h.id} style={styles.card}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{h.name}</Text>
                <Text style={styles.dim}>{h.type}</Text>
              </View>
              <Button label="Assign" onPress={() => assign.mutate(h.id)} disabled={busy} />
            </View>
          ))}
        </>
      )}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  section: { gap: 8 },
  aptTitle: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: '#3f3f46', marginTop: 4 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f4f4f5',
    gap: 10,
  },
  name: { fontSize: 16, fontWeight: '600' },
  dim: { color: '#71717a', fontSize: 13 },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
})
