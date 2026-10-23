import { useState } from 'react'
import { View } from 'react-native'
import { useSession } from '../lib/session'
import { useT } from '../lib/i18n'
import type { DemoRole } from '../lib/demo/store'
import { Button } from './ui/button'
import { Chip } from './ui/chip'
import { Text } from './ui/text'

export function DemoEntry() {
  const { startDemo } = useSession()
  const { t } = useT()
  const [role, setRole] = useState<DemoRole>('resident')
  return <View className="gap-3 rounded-xl border border-border bg-card p-4">
    <Text className="text-xl font-bold">{t('demo.title')}</Text>
    <Text className="text-sm leading-5 text-muted-foreground">{t('demo.description')}</Text>
    <View className="flex-row gap-2">
      <Chip label={t('home.resident')} selected={role === 'resident'} onPress={() => setRole('resident')} />
      <Chip label={t('home.guard')} selected={role === 'guard'} onPress={() => setRole('guard')} />
    </View>
    <Button onPress={() => startDemo(role)}><Text>{t('demo.try')}</Text></Button>
    <Text className="text-xs leading-5 text-muted-foreground">{t('demo.lifetime')}</Text>
  </View>
}
