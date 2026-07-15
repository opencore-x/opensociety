import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import type { TicketCategory, TicketPriority, TicketStatus } from '@opensociety/shared'
import { ticketCategorySchema, ticketPrioritySchema } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { cn } from '../lib/utils'

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: 'text-amber-600',
  IN_PROGRESS: 'text-primary',
  RESOLVED: 'text-green-700',
  CLOSED: 'text-muted-foreground',
  CANCELLED: 'text-muted-foreground',
}

export default function Tickets() {
  const qc = useQueryClient()
  const { t } = useT()
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
    <ScrollView className="bg-background" contentContainerClassName="gap-3.5 p-4">
      <Text className="text-lg font-bold">{t('tickets.raiseTitle')}</Text>

      <Field label={t('common.title')}>
        <Input placeholder="e.g. Leaking tap" value={title} onChangeText={setTitle} />
      </Field>
      <Field label={t('common.description')}>
        <Input
          className="h-auto min-h-16 py-2"
          placeholder={t('tickets.descPlaceholder')}
          value={description}
          onChangeText={setDescription}
          multiline
        />
      </Field>
      <Field label={t('common.apartment')}>
        {apartments.isLoading ? (
          <ActivityIndicator />
        ) : apartments.isError ? (
          <Text className="text-sm text-destructive">{t('register.loadError')}</Text>
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
      <Field label={t('common.category')}>
        <View className="flex-row flex-wrap gap-2">
          {ticketCategorySchema.options.map((c) => (
            <Chip key={c} label={c} selected={category === c} onPress={() => setCategory(c)} />
          ))}
        </View>
      </Field>
      <Field label={t('common.priority')}>
        <View className="flex-row flex-wrap gap-2">
          {ticketPrioritySchema.options.map((p) => (
            <Chip key={p} label={p} selected={priority === p} onPress={() => setPriority(p)} />
          ))}
        </View>
      </Field>
      <View className="mt-1 gap-2">
        <Button onPress={() => create.mutate()} disabled={!canSubmit}>
          <Text>{create.isPending ? t('tickets.submitting') : t('tickets.submit')}</Text>
        </Button>
        {create.isError && (
          <Text className="text-sm text-destructive">
            {String((create.error as Error)?.message ?? t('common.failed'))}
          </Text>
        )}
      </View>

      <Text className="mt-3 text-lg font-bold">{t('tickets.yourTickets')}</Text>
      {tickets.isLoading ? (
        <ActivityIndicator />
      ) : rows.length === 0 ? (
        <Text className="text-sm text-muted-foreground">{t('tickets.empty')}</Text>
      ) : (
        rows.map((ticket) => (
          <View key={ticket.id} className="gap-1 rounded-xl border border-border bg-card p-3">
            <View className="flex-row items-center justify-between">
              <Text className="shrink text-base font-semibold">{ticket.title}</Text>
              <Text className={cn('text-xs font-bold', STATUS_COLOR[ticket.status])}>{ticket.status}</Text>
            </View>
            <Text className="text-sm text-muted-foreground">{ticket.description}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {ticket.category} · {ticket.priority}
            </Text>
          </View>
        ))
      )}
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
