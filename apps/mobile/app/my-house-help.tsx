import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native'
import type { Apartment } from '@opensociety/shared'
import { apiClient, type HouseHelpWithRating } from '../api/client'
import { Button } from '../components/ui/button'
import { Text } from '../components/ui/text'
import { cn } from '../lib/utils'

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
        <Text className="text-base font-semibold text-destructive">API unreachable</Text>
        <Text className="text-sm text-muted-foreground">
          {String((apts.error as Error)?.message ?? 'error')}
        </Text>
      </Centered>
    )

  const myApts = apts.data ?? []
  if (myApts.length === 0)
    return (
      <Centered>
        <Text className="text-sm text-muted-foreground">You have no flats assigned yet.</Text>
      </Centered>
    )

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
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
    <View className="gap-0.5">
      <Text className="text-sm text-muted-foreground">
        {help.ratingAvg === null ? 'Not rated yet' : `★ ${help.ratingAvg} (${help.reviewCount})`}
      </Text>
      <View className="flex-row gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <Pressable key={n} onPress={() => rate.mutate(n)} disabled={rate.isPending} hitSlop={4}>
            <Text
              className={cn(
                'text-2xl text-muted-foreground',
                help.ratingAvg !== null && n <= Math.round(help.ratingAvg) && 'text-amber-600'
              )}
            >
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
    <View className="gap-2">
      <Text className="text-lg font-bold">
        {apartment.tower}-{apartment.apartmentNo}
      </Text>

      <Text className="mt-1 text-sm font-semibold text-foreground">Assigned help</Text>
      {(assigned.data ?? []).length === 0 && (
        <Text className="text-sm text-muted-foreground">None yet.</Text>
      )}
      {(assigned.data ?? []).map((h) => (
        <View key={h.id} className="flex-row items-center gap-3 rounded-xl bg-muted p-3">
          <View className="flex-1 gap-1.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-base font-semibold">{h.name}</Text>
              <View
                className={cn(
                  'rounded-full px-2 py-0.5',
                  h.verificationLevel === 'VERIFIED' ? 'bg-green-100' : 'bg-secondary'
                )}
              >
                <Text
                  className={cn(
                    'text-xs font-semibold text-muted-foreground',
                    h.verificationLevel === 'VERIFIED' && 'text-green-700'
                  )}
                >
                  {h.verificationLevel === 'VERIFIED' ? '✓ Verified' : 'Unverified'}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-muted-foreground">
              {h.type} · Trust {h.trustScore}/100
            </Text>
            <StarRating help={h} apartmentKey={apartment.id} />
          </View>
          <Button variant="outline" onPress={() => remove.mutate(h.id)} disabled={busy}>
            <Text>Remove</Text>
          </Button>
        </View>
      ))}

      {unassigned.length > 0 && (
        <>
          <Text className="mt-1 text-sm font-semibold text-foreground">Add help</Text>
          {unassigned.map((h) => (
            <View key={h.id} className="flex-row items-center gap-3 rounded-xl bg-muted p-3">
              <View className="flex-1">
                <Text className="text-base font-semibold">{h.name}</Text>
                <Text className="text-sm text-muted-foreground">{h.type}</Text>
              </View>
              <Button onPress={() => assign.mutate(h.id)} disabled={busy}>
                <Text>Assign</Text>
              </Button>
            </View>
          ))}
        </>
      )}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1">{children}</View>
}
