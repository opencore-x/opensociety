import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import type { Apartment, CreateVehicle, VehicleType } from '@opensociety/shared';
import { vehicleTypeSchema } from '@opensociety/shared';
import { apiClient } from '../api/client';
import { useT } from '../lib/i18n';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { Input } from '../components/ui/input';
import { Text } from '../components/ui/text';
import { Screen, PageIntro, ScreenState, EmptyState } from '../components/ui/screen';
import { AdaptiveRow, Feedback, Section } from '../components/ui/feedback';
import { useSyncStatus } from '../lib/offline/use-sync-status';

// Resident view: register and manage the vehicles for their own flat(s).
export default function MyVehicles() {
  const qc = useQueryClient();
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  const apts = useQuery({
    queryKey: ['my-apartments'],
    queryFn: () => apiClient.listMyApartments()
  });
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() });

  const myApts = apts.data ?? [];
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [type, setType] = useState<VehicleType>('CAR');

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] });
  const flat = apartmentId ?? (myApts.length === 1 ? myApts[0].id : null);

  const add = useMutation({
    mutationFn: () => {
      const body: CreateVehicle = {
        apartmentId: flat!,
        registrationNumber: registrationNumber.trim(),
        type
      };
      return apiClient.createVehicle(body);
    },
    onSuccess: () => {
      invalidate();
      setRegistrationNumber('');
      setType('CAR');
    }
  });
  const toggle = useMutation({
    mutationFn: (v: { id: string; isActive: boolean }) =>
      apiClient.updateVehicle(v.id, { isActive: !v.isActive }),
    onSuccess: invalidate
  });

  const labelOf = (id: string) => {
    const a = myApts.find((x) => x.id === id);
    return a ? `${a.tower}-${a.apartmentNo}` : id;
  };

  if (apts.isPending || vehicles.isPending) return <ScreenState loading />;
  if (apts.isError || vehicles.isError)
    return (
      <ScreenState
        onRetry={() => {
          apts.refetch();
          vehicles.refetch();
        }}
      />
    );
  if (myApts.length === 0)
    return (
      <Screen>
        <EmptyState icon="home" title={t('common.noFlats')} description={t('design.noFlatsHint')} />
      </Screen>
    );

  const canAdd = flat != null && registrationNumber.trim().length > 0 && !add.isPending && isOnline;

  return (
    <Screen>
      <PageIntro title={t('nav.myVehicles')} description={t('design.vehiclesHint')} />
      <Section title={t('myVehicles.registerTitle')}>
        {myApts.length > 1 && (
          <Chips
            options={myApts.map((a: Apartment) => ({
              value: a.id,
              label: `${a.tower}-${a.apartmentNo}`
            }))}
            selected={flat}
            onSelect={setApartmentId}
          />
        )}
        <Text className="text-sm font-semibold">{t('vgate.platePlaceholder')}</Text>
        <Input
          accessibilityLabel={t('vgate.platePlaceholder')}
          placeholder={t('myVehicles.regPlaceholder')}
          autoCapitalize="characters"
          autoCorrect={false}
          value={registrationNumber}
          onChangeText={setRegistrationNumber}
        />
        <Chips
          options={vehicleTypeSchema.options.map((opt) => ({
            value: opt,
            label: t('value.' + opt)
          }))}
          selected={type}
          onSelect={(v) => setType(v as VehicleType)}
        />
        <Button onPress={() => add.mutate()} disabled={!canAdd}>
          <Text>{add.isPending ? t('myVehicles.adding') : t('myVehicles.add')}</Text>
        </Button>
        {add.isError && <Feedback />}
        {add.isSuccess && <Feedback tone="success" message={t('design.vehicleSaved')} />}
      </Section>

      <View className="gap-2.5">
        <Text accessibilityRole="header" className="text-lg font-semibold">
          {t('nav.myVehicles')}
        </Text>
        {toggle.isError && <Feedback />}
        {(vehicles.data ?? []).length === 0 && (
          <EmptyState icon="car" title={t('myVehicles.empty')} />
        )}
        {(vehicles.data ?? []).map((v) => (
          <View key={v.id} className="gap-3 rounded-xl border border-border bg-card p-5">
            <AdaptiveRow>
              <View className="flex-auto">
                <Text className="text-base font-semibold tabular-nums">{v.registrationNumber}</Text>
                <Text className="text-sm text-muted-foreground">
                  {t('value.' + v.type)} · {labelOf(v.apartmentId)}
                </Text>
              </View>
              <Button
                variant={v.isActive ? 'outline' : 'default'}
                onPress={() => toggle.mutate({ id: v.id, isActive: v.isActive })}
                disabled={toggle.isPending || !isOnline}
                accessibilityLabel={`${t(v.isActive ? 'common.deactivate' : 'common.activate')} ${v.registrationNumber}`}
              >
                <Text>{v.isActive ? t('common.deactivate') : t('common.activate')}</Text>
              </Button>
            </AdaptiveRow>
          </View>
        ))}
      </View>
    </Screen>
  );
}

function Chips({
  options,
  selected,
  onSelect
}: {
  options: { value: string; label: string }[];
  selected: string | null;
  onSelect: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          label={o.label}
          selected={o.value === selected}
          onPress={() => onSelect(o.value)}
        />
      ))}
    </View>
  );
}
