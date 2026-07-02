import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { TicketCategory, TicketPriority, TicketStatus } from '@opensociety/shared'
import { ticketCategorySchema, ticketPrioritySchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { Button } from '../components/Button'

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: '#0e7490',
  IN_PROGRESS: '#0e7490',
  RESOLVED: '#15803d',
  CLOSED: '#71717a',
  CANCELLED: '#71717a',
}

export default function Tickets() {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [apartmentId, setApartmentId] = useState<string | null>(null)
  const [category, setCategory] = useState<TicketCategory>('OTHER')
  const [priority, setPriority] = useState<TicketPriority>('NORMAL')

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => apiClient.listTickets() })

  const create = useMutation({
    mutationFn: () =>
      apiClient.createTicket({
        apartmentId: apartmentId!,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setTitle('')
      setDescription('')
      setApartmentId(null)
      setCategory('OTHER')
      setPriority('NORMAL')
    },
  })

  const canSubmit =
    title.trim().length > 0 && description.trim().length > 0 && !!apartmentId && !create.isPending

  const rows = tickets.data ?? []

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>Raise a ticket</Text>

      <Field label="Title">
        <TextInput style={styles.input} placeholder="e.g. Leaking tap" value={title} onChangeText={setTitle} />
      </Field>
      <Field label="Description">
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="What needs fixing?"
          value={description}
          onChangeText={setDescription}
          multiline
        />
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
      <Field label="Category">
        <View style={styles.chips}>
          {ticketCategorySchema.options.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </Field>
      <Field label="Priority">
        <View style={styles.chips}>
          {ticketPrioritySchema.options.map((p) => (
            <Chip key={p} label={p} selected={priority === p} onPress={() => setPriority(p)} />
          ))}
        </View>
      </Field>
      <View style={styles.submit}>
        <Button
          label={create.isPending ? 'Submitting…' : 'Submit ticket'}
          onPress={() => create.mutate()}
          disabled={!canSubmit}
        />
        {create.isError && (
          <Text style={styles.error}>{String((create.error as Error)?.message ?? 'Failed')}</Text>
        )}
      </View>

      <Text style={[styles.section, styles.listHeading]}>Your tickets</Text>
      {tickets.isLoading ? (
        <ActivityIndicator />
      ) : rows.length === 0 ? (
        <Text style={styles.dim}>No tickets yet.</Text>
      ) : (
        rows.map((t) => (
          <View key={t.id} style={styles.ticket}>
            <View style={styles.ticketHead}>
              <Text style={styles.ticketTitle}>{t.title}</Text>
              <Text style={[styles.status, { color: STATUS_COLOR[t.status] }]}>{t.status}</Text>
            </View>
            <Text style={styles.dim}>{t.description}</Text>
            <Text style={styles.meta}>
              {t.category} · {t.priority}
            </Text>
          </View>
        ))
      )}
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
  container: { padding: 16, gap: 14 },
  section: { fontSize: 17, fontWeight: '700', color: '#18181b' },
  listHeading: { marginTop: 12 },
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
  multiline: { minHeight: 64, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: '#d4d4d8' },
  chipSelected: { backgroundColor: '#0e7490', borderColor: '#0e7490' },
  chipText: { color: '#3f3f46', fontSize: 13, fontWeight: '500' },
  chipTextSelected: { color: '#fff' },
  submit: { gap: 8, marginTop: 4 },
  error: { color: '#e11d48', fontSize: 13 },
  dim: { color: '#71717a', fontSize: 13 },
  ticket: { borderWidth: 1, borderColor: '#e4e4e7', borderRadius: 10, padding: 12, gap: 4, backgroundColor: '#fff' },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ticketTitle: { fontSize: 15, fontWeight: '600', color: '#18181b', flexShrink: 1 },
  status: { fontSize: 12, fontWeight: '700' },
  meta: { fontSize: 12, color: '#a1a1aa', marginTop: 2 },
})
