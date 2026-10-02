import { useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT } from '../../lib/i18n';
import { palette } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Icon, type IconName } from './icon';
import { Text } from './text';
import { ConnectionNotice } from './feedback';
import { useSyncStatus } from '../../lib/offline/use-sync-status';

/** Keeps native forms and input-bearing lists above the Android keyboard. */
export function ScreenFrame({ children }: { children: ReactNode }) {
  const container = useRef<View>(null);
  const [top, setTop] = useState(0);
  return (
    <SafeAreaView
      ref={container}
      edges={['bottom', 'left', 'right']}
      style={{ flex: 1, backgroundColor: palette.background }}
      onLayout={() => container.current?.measureInWindow((_x, y) => setTop(y))}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        enabled={Platform.OS === 'android'}
        behavior="height"
        keyboardVerticalOffset={top}
      >
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Screen({
  contentContainerClassName,
  children,
  connectionNotice = true,
  ...props
}: ComponentProps<typeof ScrollView> & { connectionNotice?: boolean }) {
  return (
    <ScreenFrame>
      <ScrollView
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
        contentContainerClassName={cn(
          'w-full max-w-[720px] self-center gap-5 p-5 pb-8',
          contentContainerClassName
        )}
        {...props}
      >
        {connectionNotice && <ConnectionNotice />}
        {children}
      </ScrollView>
    </ScreenFrame>
  );
}

export function PageIntro({
  title,
  description,
  trailing
}: {
  title: string;
  description?: string;
  trailing?: ReactNode;
}) {
  return (
    <View className="mb-1 flex-row items-center gap-4">
      <View className="flex-1 gap-2">
        <Text
          role="heading"
          className="w-full"
          // Keep native font metrics together for measurement on the first render.
          style={{ fontSize: 28, fontWeight: '700', lineHeight: 36, letterSpacing: -0.5 }}
        >
          {title}
        </Text>
        {description && (
          <Text className="text-sm leading-6 text-muted-foreground">{description}</Text>
        )}
      </View>
      {trailing}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  description
}: {
  icon: IconName;
  title: string;
  description?: string;
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
  );
}

export function ScreenState({
  loading,
  title,
  onRetry
}: {
  loading?: boolean;
  title?: string;
  onRetry?: () => void;
}) {
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  return (
    <Screen contentContainerClassName="grow items-center justify-center gap-5 py-12">
      {loading && isOnline ? (
        <ActivityIndicator size="large" color={palette.primary} />
      ) : (
        <Icon name="notice" size={32} />
      )}
      <Text
        accessibilityLiveRegion="polite"
        className="text-center text-base text-muted-foreground"
      >
        {!isOnline
          ? t('design.waitingConnection')
          : loading
            ? t('common.loading')
            : (title ?? t('design.loadFailed'))}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry} disabled={!isOnline}>
          <Text>{t('design.retry')}</Text>
        </Button>
      )}
    </Screen>
  );
}
