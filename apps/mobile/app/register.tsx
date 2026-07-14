import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { visitorTypeSchema, type VisitorType } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

const TYPES = visitorTypeSchema.options

export default function Register() {
  const router = useRouter()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisitorType>('GUEST')
  const [apartmentId, setApartmentId] = useState<string | null>(null)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const create = useMutation({
    mutationFn: () =>
      apiClient.createVisitor({
        apartmentId: apartmentId!,
        visitorName: name.trim(),
        visitorPhone: phone.trim() || undefined,
        type,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      router.replace('/gate')
    },
  })

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
      <Field label="Visitor name">
        <Input placeholder="e.g. Rahul" value={name} onChangeText={setName} autoFocus />
      </Field>

      <Field label="Phone (optional)">
        <Input
          placeholder="10-digit number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </Field>

      <Field label="Type">
        <View className="flex-row flex-wrap gap-2">
          {TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Field>

      <Field label="Apartment">
        {apartments.isLoading ? (
          <ActivityIndicator />
        ) : apartments.isError ? (
          <Text className="text-sm text-destructive">Could not load apartments</Text>
        ) : (
          <View className="flex-row flex-wrap gap-2">
            {(apartments.data ?? []).map((a) => (
              <Chip
                key={a.id}
                label={`${a.tower}-${a.apartmentNo}`}
                selected={apartmentId === a.id}
                onPress={() => setApartmentId(a.id)}
              />
            ))}
          </View>
        )}
      </Field>

      <View className="mt-1 gap-2">
        <Button onPress={() => create.mutate()} disabled={!canSubmit}>
          <Text>{create.isPending ? 'Registering…' : 'Register visitor'}</Text>
        </Button>
        {create.isError && (
          <Text className="text-sm text-destructive">
            {String((create.error as Error)?.message ?? 'Failed')}
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium">{label}</Text>
      {children}
    </View>
  )
}
