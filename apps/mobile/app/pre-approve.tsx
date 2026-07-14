import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import type { VisitorPreApproval } from '@opensociety/shared'
import { preApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

export default function PreApprove() {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [created, setCreated] = useState<VisitorPreApproval | null>(null)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const create = useMutation({
    mutationFn: () =>
      apiClient.createPreApproval({
        apartmentId: apartmentId!,
        visitorName: name.trim(),
        visitorPhone: phone.trim() || undefined,
        approvalType: 'ONE_TIME',
      }),
    onSuccess: (pa) => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      setCreated(pa)
    },
  })

  if (created) {
    return (
      <View className="flex-1 items-center justify-center gap-3 p-6">
        <Text className="text-center text-base">Show this to {created.visitorName}</Text>
        <View className="rounded-xl bg-card p-4">
          <QRCode value={preApprovalQrValue(created.code)} size={200} />
        </View>
        <Text className="text-[44px] font-extrabold tracking-[6px] text-primary" selectable>
          {created.code}
        </Text>
        <Text className="mb-2 text-center text-sm text-muted-foreground">
          The guard scans the QR, or enters this code at the gate.
        </Text>
        <Button
          variant="outline"
          onPress={() => {
            setCreated(null)
            setName('')
            setPhone('')
            setApartmentId(null)
          }}
        >
          <Text>Pre-approve another</Text>
        </Button>
      </View>
    )
  }

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <ScrollView contentContainerClassName="gap-4 p-4">
      <Field label="Visitor name">
        <Input placeholder="e.g. Priya" value={name} onChangeText={setName} autoFocus />
      </Field>
      <Field label="Phone (optional)">
        <Input
          placeholder="10-digit number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
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
          <Text>{create.isPending ? 'Generating…' : 'Generate code'}</Text>
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
