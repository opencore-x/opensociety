import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Apartment, CreateVehicle, VehicleType } from '@opensociety/shared'
import { vehicleTypeSchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

// Resident view: register and manage the vehicles for their own flat(s).
export default function MyVehicles() {
  const qc = useQueryClient()
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
        <Text style={styles.error}>API unreachable</Text>
        <Text style={styles.dim}>{String((apts.error as Error)?.message ?? 'error')}</Text>
      </Centered>
    )
  if (myApts.length === 0)
    return (
      <Centered>
        <Text style={styles.dim}>You have no flats assigned yet.</Text>
      </Centered>
    )

  const canAdd = flat != null && registrationNumber.trim().length > 0 && !add.isPending

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <View style={styles.section}>
        <Text style={styles.heading}>Register a vehicle</Text>
        {myApts.length > 1 && (
          <Chips
            options={myApts.map((a: Apartment) => ({ value: a.id, label: `${a.tower}-${a.apartmentNo}` }))}
            selected={flat}
            onSelect={setApartmentId}
          />
        )}
        <TextInput
          style={styles.input}
          placeholder="Reg. number (KA 01 AB 1234)"
          autoCapitalize="characters"
          autoCorrect={false}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
        />
        <Chips
          options={vehicleTypeSchema.options.map((t) => ({ value: t, label: t }))}
          selected={type}
          onSelect={(v) => setType(v as VehicleType)}
        />
        <Button label={add.isPending ? 'Adding…' : 'Add vehicle'} onPress={() => add.mutate()} disabled={!canAdd} />
        {add.isError && <Text style={styles.error}>{String((add.error as Error)?.message ?? 'Failed')}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>My vehicles</Text>
        {(vehicles.data ?? []).length === 0 && <Text style={styles.dim}>No vehicles registered yet.</Text>}
        {(vehicles.data ?? []).map((v) => (
          <View key={v.id} style={[styles.card, v.isActive ? null : styles.inactive]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.plate}>{v.registrationNumber}</Text>
              <Text style={styles.dim}>
                {v.type} · {labelOf(v.apartmentId)}
              </Text>
            </View>
            <Button
              label={v.isActive ? 'Deactivate' : 'Activate'}
              variant={v.isActive ? 'outline' : 'primary'}
              onPress={() => toggle.mutate({ id: v.id, isActive: v.isActive })}
              disabled={toggle.isPending}
            />
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
    <View style={styles.chips}>
      {options.map((o) => {
        const on = o.value === selected
        return (
          <Pressable key={o.value} onPress={() => onSelect(o.value)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

const styles = StyleSheet.create({
  list: { padding: 16, gap: 20 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 },
  section: { gap: 10 },
  heading: { fontSize: 16, fontWeight: '700' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#d4d4d8', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipOn: { backgroundColor: '#0e7490', borderColor: '#0e7490' },
  chipText: { color: '#3f3f46', fontSize: 13, fontWeight: '600' },
  chipTextOn: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 10, backgroundColor: '#f4f4f5', gap: 10 },
  inactive: { opacity: 0.55 },
  plate: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  dim: { color: '#71717a', fontSize: 13 },
  error: { color: '#e11d48', fontSize: 13 },
})
