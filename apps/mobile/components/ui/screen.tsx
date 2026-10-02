import type { ComponentProps, ReactNode } from 'react'
import { ActivityIndicator, ScrollView, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useT } from '../../lib/i18n'
import { palette } from '../../lib/theme'
import { cn } from '../../lib/utils'
import { Button } from './button'
import { Icon, type IconName } from './icon'
import { Text } from './text'

export function Screen({ contentContainerClassName, ...props }: ComponentProps<typeof ScrollView>) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} className="flex-1 bg-background">
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn('gap-5 p-5 pb-8', contentContainerClassName)}
        {...props}
      />
    </SafeAreaView>
  )
}

export function PageIntro({
  title,
  description,
  trailing,
}: {
  title: string
  description?: string
  trailing?: ReactNode
}) {
  return (
    <View className="mb-1 flex-row items-center gap-4">
      <View className="flex-1 gap-2">
        <Text role="heading" className="text-[28px] font-bold tracking-tight">
          {title}
        </Text>
        {description && (
          <Text className="text-sm leading-6 text-muted-foreground">{description}</Text>
        )}
      </View>
      {trailing}
    </View>
  )
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName
  title: string
  description?: string
}) {
  return (
    <View className="items-center gap-3 rounded-3xl border border-border bg-card px-6 py-9">
      <View className="mb-1 h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Icon name={icon} size={26} />
      </View>
      <Text className="text-center text-base font-semibold">{title}</Text>
      {description && (
        <Text className="text-center text-sm leading-6 text-muted-foreground">{description}</Text>
      )}
    </View>
  )
}

export function ScreenState({
  loading,
  title,
  onRetry,
}: {
  loading?: boolean
  title?: string
  onRetry?: () => void
}) {
  const { t } = useT()
  return (
    <View className="flex-1 items-center justify-center gap-5 bg-background p-8">
      {loading ? (
        <ActivityIndicator size="large" color={palette.primary} />
      ) : (
        <Icon name="notice" size={32} />
      )}
      <Text className="text-center text-base text-muted-foreground">
        {loading ? t('common.loading') : title}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          <Text>{t('design.retry')}</Text>
        </Button>
      )}
    </View>
  )
}
