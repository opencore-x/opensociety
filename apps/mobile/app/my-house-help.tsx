import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pressable, View } from 'react-native';
import type { Apartment } from '@opensociety/shared';
import { apiClient, type HouseHelpWithRating } from '../api/client';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { Text } from '../components/ui/text';
import { Screen, PageIntro, ScreenState, EmptyState } from '../components/ui/screen';
import { Feedback, LoadingState, Section, Badge } from '../components/ui/feedback';
import { useSyncStatus } from '../lib/offline/use-sync-status';
import { cn } from '../lib/utils';

// Resident view: manage which registered house help serves each of their flats.
export default function MyHouseHelp() {
  const { t } = useT();
  const apts = useQuery({
    queryKey: ['my-apartments'],
    queryFn: () => apiClient.listMyApartments()
  });
  const registry = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() });

  if (apts.isPending || registry.isPending) return <ScreenState loading />;
  if (apts.isError || registry.isError)
    return (
      <ScreenState
        onRetry={() => {
          apts.refetch();
          registry.refetch();
        }}
      />
    );
  const myApts = apts.data ?? [];
  if (myApts.length === 0)
    return (
      <Screen>
        <EmptyState icon="home" title={t('common.noFlats')} description={t('design.noFlatsHint')} />
      </Screen>
    );

  return (
    <Screen>
      <PageIntro title={t('nav.myHouseHelp')} description={t('design.helpHint')} />
      {myApts.map((a) => (
        <ApartmentAssignments key={a.id} apartment={a} registry={registry.data ?? []} />
      ))}
    </Screen>
  );
}

function StarRating({ help, apartmentKey }: { help: HouseHelpWithRating; apartmentKey: string }) {
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const rate = useMutation({
    mutationFn: (rating: number) => apiClient.rateHouseHelp(help.id, { rating }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartmentKey] })
  });
  return (
    <View className="gap-3">
      <Text className="text-sm text-muted-foreground">
        {help.ratingAvg === null
          ? t('myHouseHelp.notRated')
          : `${help.ratingAvg} / 5 (${help.reviewCount})`}
      </Text>
      <Button
        variant="outline"
        onPress={() => setExpanded(!expanded)}
        accessibilityState={{ expanded }}
      >
        <Text>{t('design.rateHelper')}</Text>
      </Button>
      {expanded && (
        <View className="flex-row flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              accessibilityRole="button"
              accessibilityLabel={t('design.ratingLabel')
                .replace('{name}', help.name)
                .replace('{rating}', String(n))}
              accessibilityState={{
                disabled: rate.isPending || !isOnline,
                selected: rate.data?.rating === n
              }}
              className={cn(
                'min-h-[48px] min-w-[48px] items-center justify-center rounded-full border px-3',
                rate.data?.rating === n ? 'border-primary bg-primary' : 'border-border bg-secondary'
              )}
              onPress={() => rate.mutate(n)}
              disabled={rate.isPending || !isOnline}
            >
              <Text
                className={cn('font-semibold', rate.data?.rating === n ? 'text-white' : 'text-primary')}
              >
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {rate.isError && <Feedback />}
      {rate.isSuccess && <Feedback tone="success" message={t('design.ratingSaved')} />}
    </View>
  );
}

function ApartmentAssignments({
  apartment,
  registry
}: {
  apartment: Apartment;
  registry: HouseHelpWithRating[];
}) {
  const { t } = useT();
  const qc = useQueryClient();
  const assigned = useQuery({
    queryKey: ['house-help-for-apartment', apartment.id],
    queryFn: () => apiClient.listHouseHelpForApartment(apartment.id)
  });
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ['house-help-for-apartment', apartment.id] });
  const assign = useMutation({
    mutationFn: (helpId: string) => apiClient.assignHouseHelp(helpId, apartment.id),
    onSuccess: invalidate
  });
  const remove = useMutation({
    mutationFn: (helpId: string) => apiClient.removeHouseHelpAssignment(helpId, apartment.id),
    onSuccess: invalidate
  });
  const { isOnline } = useSyncStatus();
  const busy = assign.isPending || remove.isPending || !isOnline;

  const assignedIds = new Set((assigned.data ?? []).map((h) => h.id));
  const unassigned = registry.filter((h) => h.isActive && !assignedIds.has(h.id));

  if (assigned.isPending)
    return (
      <Section title={`${apartment.tower}-${apartment.apartmentNo}`}>
        <LoadingState />
      </Section>
    );
  if (assigned.isError)
    return (
      <Section title={`${apartment.tower}-${apartment.apartmentNo}`}>
        <Feedback message={t('design.loadFailed')} onRetry={() => assigned.refetch()} />
      </Section>
    );

  return (
    <View className="gap-4">
      <Text className="text-lg font-bold">
        {apartment.tower}-{apartment.apartmentNo}
      </Text>

      <Text className="mt-1 text-sm font-semibold text-foreground">
        {t('myHouseHelp.assignedHelp')}
      </Text>
      {(assigned.data ?? []).length === 0 && (
        <EmptyState icon="heart" title={t('myHouseHelp.noneYet')} />
      )}
      {(assign.isError || remove.isError) && <Feedback />}
      {(assigned.data ?? []).map((h) => (
        <View key={h.id} className="gap-4 rounded-xl border border-border bg-card p-5">
          <View className="gap-1.5">
            <View className="flex-row flex-wrap items-center gap-2">
              <Text className="text-base font-semibold">{h.name}</Text>
              <Badge
                label={t(
                  h.verificationLevel === 'VERIFIED'
                    ? 'myHouseHelp.verified'
                    : 'myHouseHelp.unverified'
                )}
                positive={h.verificationLevel === 'VERIFIED'}
              />
            </View>
            <Text className="text-sm text-muted-foreground">
              {t('value.' + h.type)} · {t('myHouseHelp.trust')} {h.trustScore}/100
            </Text>
            <StarRating help={h} apartmentKey={apartment.id} />
          </View>
          <Button
            variant="outline"
            accessibilityLabel={`${t('common.remove')} ${h.name}`}
            onPress={() => remove.mutate(h.id)}
            disabled={busy}
          >
            <Text>{t('common.remove')}</Text>
          </Button>
        </View>
      ))}

      {unassigned.length > 0 && (
        <>
          <Text className="mt-1 text-sm font-semibold text-foreground">
            {t('myHouseHelp.addHelp')}
          </Text>
          {unassigned.map((h) => (
            <View key={h.id} className="gap-4 rounded-xl border border-border bg-card p-5">
              <View>
                <Text className="text-base font-semibold">{h.name}</Text>
                <Text className="text-sm text-muted-foreground">{t('value.' + h.type)}</Text>
              </View>
              <Button
                accessibilityLabel={`${t('common.assign')} ${h.name}`}
                onPress={() => assign.mutate(h.id)}
                disabled={busy}
              >
                <Text>{t('common.assign')}</Text>
              </Button>
            </View>
          ))}
        </>
      )}
    </View>
  );
}
