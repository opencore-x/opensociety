import { useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import type { VehicleVerification } from '@opensociety/shared'

import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Text } from '../components/ui/text'

// Guard gate tool: type an arriving vehicle's plate to see whether it's a
// registered resident vehicle (with owner flat + parking slots) or unknown.
export default function VehicleGate() {
  const { t } = useT()
  const [plate, setPlate] = useState('')
  const verify = useMutation({ mutationFn: (p: string) => apiClient.verifyVehicle(p) })
  const canCheck = plate.trim().length > 0 && !verify.isPending

  return (
    <ScrollView className="bg-background" contentContainerClassName="gap-4 p-4">
      <View className="flex-row items-center gap-2">
        <Input
          className="flex-1 tracking-widest"
          placeholder={t('vgate.platePlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          value={plate}
          onChangeText={setPlate}
        />
        <Button onPress={() => verify.mutate(plate.trim())} disabled={!canCheck}>
          <Text>{verify.isPending ? t('vgate.checking') : t('vgate.check')}</Text>
        </Button>
      </View>

      {verify.isError && (
        <Text className="text-sm text-destructive">{String((verify.error as Error)?.message ?? 'Failed')}</Text>
      )}

      {verify.data && <Result result={verify.data} />}
    </ScrollView>
  )
}

function Result({ result }: { result: VehicleVerification }) {
  const { t } = useT()

  if (!result.registered || !result.vehicle) {
    return (
      <View className="gap-1 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
        <Text className="text-base font-bold text-destructive">{t('vgate.unknown')}</Text>
        <Text className="font-mono text-sm text-muted-foreground">{result.plate}</Text>
        <Text className="text-sm text-muted-foreground">{t('vgate.unknownHint')}</Text>
      </View>
    )
  }

  const v = result.vehicle
  return (
    <View className="gap-3 rounded-xl bg-green-100 p-4 dark:bg-green-900/30">
      <View className="flex-row items-center gap-2">
        <Text className="overflow-hidden rounded-md bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
          {t('vgate.registered')}
        </Text>
        <Text className="font-mono text-base font-bold text-green-900 dark:text-green-100">{v.registrationNumber}</Text>
      </View>
      <Text className="text-sm text-green-800 dark:text-green-200">
        {[v.type, v.make, v.color].filter(Boolean).join(' · ')}
      </Text>
      {!v.isActive && <Text className="text-sm font-semibold text-amber-700">{t('vgate.inactive')}</Text>}

      <View>
        <Text className="text-xs font-semibold uppercase text-green-800/70 dark:text-green-200/70">{t('vgate.owner')}</Text>
        <Text className="text-base font-semibold text-green-900 dark:text-green-100">{v.apartment}</Text>
      </View>

      <View className="gap-1">
        <Text className="text-xs font-semibold uppercase text-green-800/70 dark:text-green-200/70">{t('vgate.slots')}</Text>
        {result.parkingSlots.length === 0 ? (
          <Text className="text-sm text-green-800 dark:text-green-200">{t('vgate.noSlots')}</Text>
        ) : (
          result.parkingSlots.map((s) => (
            <View key={s.slotNumber} className="flex-row items-center justify-between">
              <Text className="font-mono text-sm text-green-900 dark:text-green-100">{s.slotNumber}</Text>
              <Text className="text-xs text-green-800 dark:text-green-200">{s.type}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  )
}
