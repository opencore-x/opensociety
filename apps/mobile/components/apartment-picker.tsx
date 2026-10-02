import { View } from 'react-native';
import type { Apartment } from '@opensociety/shared';
import { useT } from '../lib/i18n';
import { Chip } from './ui/chip';
import { Feedback, Field, LoadingState } from './ui/feedback';
import { EmptyState } from './ui/screen';

export function ApartmentPicker({
  query,
  selected,
  onSelect
}: {
  query: { data?: Apartment[]; isPending: boolean; isError: boolean; refetch: () => unknown };
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useT();
  return (
    <Field label={t('common.apartment')}>
      {query.isPending ? (
        <LoadingState />
      ) : query.isError && !query.data ? (
        <Feedback message={t('register.loadError')} onRetry={() => query.refetch()} />
      ) : !query.data?.length ? (
        <EmptyState icon="home" title={t('common.noFlats')} description={t('design.noFlatsHint')} />
      ) : (
        <View className="flex-row flex-wrap gap-2">
          {query.data.map((a) => (
            <Chip
              key={a.id}
              label={`${a.tower}-${a.apartmentNo}`}
              selected={selected === a.id}
              onPress={() => onSelect(a.id)}
            />
          ))}
        </View>
      )}
    </Field>
  );
}
