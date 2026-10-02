import type { ReactNode } from 'react';
import { ActivityIndicator, View, useWindowDimensions } from 'react-native';
import { useT } from '../../lib/i18n';
import { useSyncStatus } from '../../lib/offline/use-sync-status';
import { palette } from '../../lib/theme';
import { cn } from '../../lib/utils';
import { Button } from './button';
import { Text } from './text';

export function Feedback({
  message,
  onRetry,
  tone = 'error'
}: {
  message?: string;
  onRetry?: () => void;
  tone?: 'error' | 'success' | 'info';
}) {
  const { t } = useT();
  return (
    <View
      className={cn(
        'gap-3 rounded-xl border p-4',
        tone === 'error' ? 'border-destructive/20 bg-destructive/5' : 'border-border bg-secondary'
      )}
    >
      <Text
        accessibilityRole={tone === 'error' ? 'alert' : undefined}
        accessibilityLiveRegion="polite"
        className={cn('text-sm leading-6', tone === 'error' ? 'text-destructive' : 'text-primary')}
      >
        {message ?? t('design.actionFailed')}
      </Text>
      {onRetry && (
        <Button variant="outline" onPress={onRetry}>
          <Text>{t('design.retry')}</Text>
        </Button>
      )}
    </View>
  );
}

export function LoadingState() {
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  return (
    <View accessibilityLiveRegion="polite" className="flex-row items-center gap-3 py-4">
      {isOnline && <ActivityIndicator color={palette.primary} />}
      <Text className="flex-1 text-sm text-muted-foreground">
        {t(isOnline ? 'common.loading' : 'design.waitingConnection')}
      </Text>
    </View>
  );
}

export function ConnectionNotice() {
  const { isOnline } = useSyncStatus();
  const { t } = useT();
  return isOnline ? null : <Feedback tone="info" message={t('design.offlineReading')} />;
}

export function AdaptiveRow({ children, className }: { children: ReactNode; className?: string }) {
  const { width, fontScale } = useWindowDimensions();
  return (
    <View
      className={cn(
        'gap-3',
        width >= 380 && fontScale <= 1.2 && 'flex-row items-center',
        className
      )}
    >
      {children}
    </View>
  );
}

export function Badge({ label, positive }: { label: string; positive?: boolean }) {
  return (
    <View className="self-start rounded-full bg-secondary px-3 py-1.5">
      <Text className={cn('text-xs font-semibold', positive ? 'text-green-800' : 'text-primary')}>
        {label}
      </Text>
    </View>
  );
}

export function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-xl border border-border bg-card p-5">
      {title && (
        <Text accessibilityRole="header" className="text-lg font-semibold">
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold">{label}</Text>
      {children}
    </View>
  );
}
