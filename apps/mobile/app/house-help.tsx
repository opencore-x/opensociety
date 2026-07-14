import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { apiClient } from '../api/client'
import { cn } from '../lib/utils'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

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
        <Text className="text-base font-semibold text-destructive">API unreachable</Text>
        <Text className="text-sm text-muted-foreground">{String((help.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerClassName="gap-2 p-4"
      data={rows}
      keyExtractor={(h) => h.id}
      ListHeaderComponent={
        <Input
          className="mb-1"
          placeholder="Search house help by name"
          autoCorrect={false}
          value={search}
          onChangeText={setSearch}
        />
      }
      ListEmptyComponent={<Text className="text-sm text-muted-foreground">No house help found.</Text>}
      renderItem={({ item }) => {
        const openEntryId = openByHelp.get(item.id)
        const inside = openEntryId != null
        return (
          <View className="gap-2.5 rounded-xl bg-muted p-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.name}</Text>
                <Text className="text-sm text-muted-foreground">{item.type}</Text>
              </View>
              <Text
                className={cn(
                  'overflow-hidden rounded-md px-2 py-1 text-xs',
                  inside ? 'bg-green-100 text-green-800' : 'bg-muted text-muted-foreground'
                )}
              >
                {inside ? 'INSIDE' : 'OUT'}
              </Text>
            </View>
            <View className="flex-row gap-2">
              {inside ? (
                <Button variant="outline" onPress={() => checkOut.mutate(openEntryId)} disabled={busy}>
                  <Text>Check out</Text>
                </Button>
              ) : (
                <Button onPress={() => checkIn.mutate(item.id)} disabled={busy}>
                  <Text>Check in</Text>
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
