import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, FlatList, View } from 'react-native'
import { availableVisitorActions } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

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
        <Text className="text-base font-semibold text-destructive">API unreachable</Text>
        <Text className="text-sm text-muted-foreground">
          {String((error as Error)?.message ?? 'error')}
        </Text>
      </Centered>
    )

  return (
    <FlatList
      contentContainerClassName="gap-2 p-4"
      data={data ?? []}
      keyExtractor={(v) => v.id}
      ListEmptyComponent={<Text className="text-sm text-muted-foreground">No visitors yet.</Text>}
      renderItem={({ item }) => {
        const actions = availableVisitorActions(item.status)
        const denying = denyingId === item.id
        return (
          <Card className="gap-2.5 p-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-base font-semibold">{item.visitorName}</Text>
                <Text className="text-sm text-muted-foreground">{item.type}</Text>
              </View>
              <Text className="overflow-hidden rounded-md bg-secondary px-2 py-1 text-xs text-primary">
                {item.status}
              </Text>
            </View>

            {actions.length > 0 && !denying && (
              <View className="flex-row gap-2">
                {actions.includes('approve') && (
                  <Button onPress={() => approve.mutate(item.id)} disabled={busy}>
                    <Text>Approve</Text>
                  </Button>
                )}
                {actions.includes('deny') && (
                  <Button variant="outline" onPress={() => setDenyingId(item.id)} disabled={busy}>
                    <Text>Deny</Text>
                  </Button>
                )}
              </View>
            )}

            {denying && (
              <View className="gap-2">
                <Input
                  placeholder="Reason for denial"
                  value={reason}
                  onChangeText={setReason}
                  autoFocus
                />
                <View className="flex-row gap-2">
                  <Button
                    variant="destructive"
                    onPress={() => deny.mutate({ id: item.id, reason })}
                    disabled={busy || !reason.trim()}
                  >
                    <Text>{deny.isPending ? 'Denying…' : 'Confirm'}</Text>
                  </Button>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setDenyingId(null)
                      setReason('')
                    }}
                    disabled={busy}
                  >
                    <Text>Cancel</Text>
                  </Button>
                </View>
              </View>
            )}
          </Card>
        )
      }}
    />
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1">{children}</View>
}
