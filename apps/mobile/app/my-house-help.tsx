import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Apartment } from '@opensociety/shared'
import { apiClient, type HouseHelpWithRating } from '../api/client'
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

function StarRating({ help, apartmentKey }: { help: HouseHelpWithRating; apartmentKey: string }) {
  const qc = useQueryClient()
  const rate = useMutation({
    mutationFn: (rating: number) => apiClient.rateHouseHelp(help.id, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartmentKey] }),
  })
  return (
    <View style={styles.rating}>
      <Text style={styles.dim}>
        {help.ratingAvg === null ? 'Not rated yet' : `★ ${help.ratingAvg} (${help.reviewCount})`}
      </Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => rate.mutate(n)} disabled={rate.isPending} hitSlop={4}>
            <Text style={[styles.star, help.ratingAvg !== null && n <= Math.round(help.ratingAvg) && styles.starOn]}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

function ApartmentAssignments({ apartment, registry }: { apartment: Apartment; registry: HouseHelpWithRating[] }) {
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
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{h.name}</Text>
              <View style={[styles.badge, h.verificationLevel === 'VERIFIED' ? styles.badgeOk : styles.badgeMuted]}>
                <Text style={[styles.badgeText, h.verificationLevel === 'VERIFIED' && styles.badgeTextOk]}>
                  {h.verificationLevel === 'VERIFIED' ? '✓ Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
            <Text style={styles.dim}>
              {h.type} · Trust {h.trustScore}/100
            </Text>
            <StarRating help={h} apartmentKey={apartment.id} />
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  badgeOk: { backgroundColor: '#dcfce7' },
  badgeMuted: { backgroundColor: '#e4e4e7' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#71717a' },
  badgeTextOk: { color: '#15803d' },
  dim: { color: '#71717a', fontSize: 13 },
  rating: { gap: 2 },
  stars: { flexDirection: 'row', gap: 2 },
  star: { fontSize: 22, color: '#d4d4d8' },
  starOn: { color: '#f59e0b' },
  error: { color: '#e11d48', fontSize: 16, fontWeight: '600' },
})
