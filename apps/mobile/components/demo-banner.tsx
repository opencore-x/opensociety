import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useSession } from '../lib/session'
import { useT } from '../lib/i18n'
import { Button } from './ui/button'
import { Text } from './ui/text'

export function DemoBanner() {
  const { demo, switchRole, resetDemo, exitDemo } = useSession()
  const { t } = useT()
  if (!demo) return null
  return <SafeAreaView edges={['bottom']} className="border-t border-border bg-secondary">
    <View className="gap-2 px-3 py-2">
      <Text className="text-xs text-muted-foreground">{t('demo.banner')}</Text>
      <View className="flex-row flex-wrap gap-2">
        <Button size="sm" variant={demo.role === 'resident' ? 'default' : 'outline'} onPress={() => switchRole('resident')}>
          <Text>{t('home.resident')}</Text>
        </Button>
        <Button size="sm" variant={demo.role === 'guard' ? 'default' : 'outline'} onPress={() => switchRole('guard')}>
          <Text>{t('home.guard')}</Text>
        </Button>
        <Button size="sm" variant="ghost" onPress={resetDemo}><Text>{t('demo.reset')}</Text></Button>
        <Button size="sm" variant="ghost" onPress={exitDemo}><Text>{t('demo.exit')}</Text></Button>
      </View>
    </View>
  </SafeAreaView>
}
