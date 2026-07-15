import { useState } from 'react'
import { useRouter } from 'expo-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { visitorTypeSchema, type CreateVisitorEntry, type VisitorEntry, type VisitorType } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { CREATE_VISITOR_KEY } from '../lib/offline/mutation-defaults'
import { newClientId } from '../lib/offline/optimistic'
import { useSyncStatus } from '../lib/offline/use-sync-status'
import { useT } from '../lib/i18n'
import { OfflineBanner } from '../components/offline-banner'
import { SyncErrorTray } from '../components/sync-error-tray'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

const TYPES = visitorTypeSchema.options

export default function Register() {
  const router = useRouter()
  const { t } = useT()
  const { isOnline } = useSyncStatus()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<VisitorType>('GUEST')
  const [apartmentId, setApartmentId] = useState<string | null>(null)

  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  // Uses the offline-capable mutation registered on the client (see
  // mutation-defaults): the fn, optimistic update, and cache reconcile live
  // there so a queued write can replay after an app restart.
  const create = useMutation<VisitorEntry, Error, CreateVisitorEntry>({
    mutationKey: CREATE_VISITOR_KEY,
    onSuccess: () => router.replace('/gate'),
  })

  function submit() {
    create.mutate({
      apartmentId: apartmentId!,
      visitorName: name.trim(),
      visitorPhone: phone.trim() || undefined,
      type,
      // Idempotency key so a queued entry replayed after a lost ack dedupes to
      // one row instead of creating a duplicate.
      clientId: newClientId(),
    })
    // Offline the mutation pauses (no onSuccess), but the optimistic entry is
    // already in the gate list — take the guard straight there.
    if (!isOnline) router.replace('/gate')
  }

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
      <OfflineBanner className="-mx-4 -mt-4 mb-0 rounded-none" />
      <SyncErrorTray />
      <Field label={t('register.visitorName')}>
        <Input placeholder="e.g. Rahul" value={name} onChangeText={setName} autoFocus />
      </Field>

      <Field label={t('register.phoneOptional')}>
        <Input
          placeholder={t('register.phonePlaceholder')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </Field>

      <Field label={t('common.type')}>
        <View className="flex-row flex-wrap gap-2">
          {TYPES.map((opt) => (
            <Chip key={opt} label={opt} selected={type === opt} onPress={() => setType(opt)} />
          ))}
        </View>
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

      <View className="mt-1 gap-2">
        <Button onPress={submit} disabled={!canSubmit}>
          <Text>{create.isPending ? t('register.registering') : t('nav.registerVisitor')}</Text>
        </Button>
        {!isOnline && <Text className="text-sm text-muted-foreground">{t('register.offlineNote')}</Text>}
        {create.isError && (
          <Text className="text-sm text-destructive">
            {String((create.error as Error)?.message ?? t('common.failed'))}
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
