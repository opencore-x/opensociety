import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { visitorTypeSchema, type VisitorType } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

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
    <ScrollView contentContainerStyle={styles.container}>
      <Field label="Visitor name">
        <TextInput style={styles.input} placeholder="e.g. Rahul" value={name} onChangeText={setName} autoFocus />
      </Field>

      <Field label="Phone (optional)">
        <TextInput
          style={styles.input}
          placeholder="10-digit number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </Field>

      <Field label="Type">
        <View style={styles.chips}>
          {TYPES.map((t) => (
            <Chip key={t} label={t} selected={type === t} onPress={() => setType(t)} />
          ))}
        </View>
      </Field>

      <Field label="Apartment">
        {apartments.isLoading ? (
          <ActivityIndicator />
        ) : apartments.isError ? (
          <Text style={styles.error}>Could not load apartments</Text>
        ) : (
          <View style={styles.chips}>
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

      <View style={styles.submit}>
        <Button
          label={create.isPending ? 'Registering…' : 'Register visitor'}
          onPress={() => create.mutate()}
          disabled={!canSubmit}
        />
        {create.isError && (
          <Text style={styles.error}>{String((create.error as Error)?.message ?? 'Failed')}</Text>
        )}
      </View>
    </ScrollView>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#3f3f46' },
  input: {
    borderWidth: 1,
    borderColor: '#d4d4d8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: '#fff',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d4d4d8' },
  chipSelected: { backgroundColor: '#0e7490', borderColor: '#0e7490' },
  chipText: { color: '#3f3f46', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  submit: { gap: 8, marginTop: 4 },
  error: { color: '#e11d48', fontSize: 13 },
})
