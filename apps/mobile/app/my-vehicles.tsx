import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import type { Apartment, CreateVehicle, VehicleType } from '@opensociety/shared'
import { vehicleTypeSchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { cn } from '../lib/utils'

// Resident view: register and manage the vehicles for their own flat(s).
export default function MyVehicles() {
  const qc = useQueryClient()
  const { t } = useT()
  const apts = useQuery({ queryKey: ['my-apartments'], queryFn: () => apiClient.listMyApartments() })
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() })

  const myApts = apts.data ?? []
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [type, setType] = useState<VehicleType>('CAR')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] })
  const flat = apartmentId ?? (myApts.length === 1 ? myApts[0].id : null)

  const add = useMutation({
    mutationFn: () => {
      const body: CreateVehicle = { apartmentId: flat!, registrationNumber: registrationNumber.trim(), type }
      return apiClient.createVehicle(body)
    },
    onSuccess: () => {
      invalidate()
      setRegistrationNumber('')
      setType('CAR')
    },
  })
  const toggle = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) => apiClient.updateVehicle(v.id, { isActive: !v.isActive }),
    onSuccess: invalidate,
  })

  const labelOf = (id: string) => {
    const a = myApts.find((x) => x.id === id)
    return a ? `${a.tower}-${a.apartmentNo}` : id
  }

  if (apts.isLoading || vehicles.isLoading)
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    )
  if (apts.isError)
    return (
      <Centered>
        <Text className="text-sm font-semibold text-destructive">{t('gate.apiUnreachable')}</Text>
        <Text className="text-sm text-muted-foreground">
          {String((apts.error as Error)?.message ?? 'error')}
        </Text>
      </Centered>
    )
  if (myApts.length === 0)
    return (
      <Centered>
        <Text className="text-sm text-muted-foreground">{t('common.noFlats')}</Text>
      </Centered>
    )

  const canAdd = flat != null && registrationNumber.trim().length > 0 && !add.isPending

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-5 p-4">
      <View className="gap-2.5">
        <Text className="text-base font-bold">{t('myVehicles.registerTitle')}</Text>
        {myApts.length > 1 && (
          <Chips
            options={myApts.map((a: Apartment) => ({ value: a.id, label: `${a.tower}-${a.apartmentNo}` }))}
            selected={flat}
            onSelect={setApartmentId}
          />
        )}
        <Input
          placeholder={t('myVehicles.regPlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
        />
        <Chips
          options={vehicleTypeSchema.options.map((opt) => ({ value: opt, label: opt }))}
          selected={type}
          onSelect={(v) => setType(v as VehicleType)}
        />
        <Button onPress={() => add.mutate()} disabled={!canAdd}>
          <Text>{add.isPending ? t('myVehicles.adding') : t('myVehicles.add')}</Text>
        </Button>
        {add.isError && (
          <Text className="text-sm text-destructive">
            {String((add.error as Error)?.message ?? t('common.failed'))}
          </Text>
        )}
      </View>

      <View className="gap-2.5">
        <Text className="text-base font-bold">{t('nav.myVehicles')}</Text>
        {(vehicles.data ?? []).length === 0 && (
          <Text className="text-sm text-muted-foreground">{t('myVehicles.empty')}</Text>
        )}
        {(vehicles.data ?? []).map((v) => (
          <View
            key={v.id}
            className={cn('flex-row items-center gap-3 rounded-xl bg-muted p-3', !v.isActive && 'opacity-60')}
          >
            <View className="flex-1">
              <Text className="text-base font-semibold tabular-nums">{v.registrationNumber}</Text>
              <Text className="text-sm text-muted-foreground">
                {v.type} · {labelOf(v.apartmentId)}
              </Text>
            </View>
            <Button
              variant={v.isActive ? 'outline' : 'default'}
              onPress={() => toggle.mutate({ id: v.id, isActive: v.isActive })}
              disabled={toggle.isPending}
            >
              <Text>{v.isActive ? t('common.deactivate') : t('common.activate')}</Text>
            </Button>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Chips({
  options,
  selected,
  onSelect,
}: {
  options: { value: string; label: string }[]
  selected: string | null
  onSelect: (v: string) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={o.value === selected}
          onPress={() => onSelect(o.value)}
        />
      ))}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View className="flex-1 items-center justify-center gap-1">{children}</View>
}
