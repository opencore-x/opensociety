import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import QRCode from 'react-native-qrcode-svg'
import type { VisitorPreApproval } from '@opensociety/shared'
import { preApprovalQrValue } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Chip } from '../components/ui/chip'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'
import { Screen, PageIntro } from '../components/ui/screen'

export default function PreApprove() {
  const qc = useQueryClient()
  const { t } = useT()
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
        <Text className="text-center text-base">{t('preApprove.showTo')} {created.visitorName}</Text>
        <View className="rounded-xl bg-card p-4">
          <QRCode value={preApprovalQrValue(created.code)} size={200} />
        </View>
        <Text className="text-[44px] font-extrabold tracking-[6px] text-primary" selectable adjustsFontSizeToFit minimumFontScale={0.5} numberOfLines={1}>
          {created.code}
        </Text>
        <Text className="mb-2 text-center text-sm text-muted-foreground">{t('preApprove.hint')}</Text>
        <Button
          variant="outline"
          onPress={() => {
            setCreated(null)
            setName('')
            setPhone('')
            setApartmentId(null)
          }}
        >
          <Text>{t('preApprove.another')}</Text>
        </Button>
      </View>
    )
  }

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <Screen>
      <PageIntro title={t('design.createPass')} description={t('design.inviteHint')} />
      <Field label={t('register.visitorName')}>
        <Input accessibilityLabel={t('register.visitorName')} placeholder={t('register.visitorName')} value={name} onChangeText={setName} />
      </Field>
      <Field label={t('register.phoneOptional')}>
        <Input
          accessibilityLabel={t('register.phoneOptional')}
          placeholder={t('register.phonePlaceholder')}
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
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
      <View className="mt-1 gap-2">
        <Button onPress={() => create.mutate()} disabled={!canSubmit}>
          <Text>{create.isPending ? t('preApprove.generating') : t('preApprove.generate')}</Text>
        </Button>
        {create.isError && (
          <Text className="text-sm text-destructive">
            {String((create.error as Error)?.message ?? t('common.failed'))}
          </Text>
        )}
      </View>
    </Screen>
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
