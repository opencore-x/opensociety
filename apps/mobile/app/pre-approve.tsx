import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Share, View, useWindowDimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { VisitorPreApproval } from '@opensociety/shared';
import { preApprovalQrValue } from '@opensociety/shared';
import { apiClient } from '../api/client';
import { useT } from '../lib/i18n';
import { useSyncStatus } from '../lib/offline/use-sync-status';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Text } from '../components/ui/text';
import { Screen, PageIntro } from '../components/ui/screen';
import { Feedback, Field, Section } from '../components/ui/feedback';
import { ApartmentPicker } from '../components/apartment-picker';
import { Icon } from '../components/ui/icon';

export default function PreApprove() {
  const qc = useQueryClient();
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  const { width } = useWindowDimensions();
  const [shareError, setShareError] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [created, setCreated] = useState<VisitorPreApproval | null>(null);

  const apartments = useQuery({
    queryKey: ['apartments'],
    queryFn: () => apiClient.listApartments()
  });

  const create = useMutation({
    mutationFn: () =>
      apiClient.createPreApproval({
        apartmentId: apartmentId!,
        visitorName: name.trim(),
        visitorPhone: phone.trim() || undefined,
        approvalType: 'ONE_TIME'
      }),
    onSuccess: (pa) => {
      qc.invalidateQueries({ queryKey: ['visitors'] });
      setCreated(pa);
    }
  });

  if (created) {
    return (
      <Screen>
        <PageIntro
          title={t('design.passReady')}
          description={`${t('preApprove.showTo')} ${created.visitorName}`}
        />
        <Section>
          <View className="items-center gap-5">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-secondary">
              <Icon name="check" />
            </View>
            <View
              accessible={false}
              importantForAccessibility="no-hide-descendants"
              className="bg-white p-3"
            >
              <QRCode value={preApprovalQrValue(created.code)} size={Math.min(220, width - 120)} />
            </View>
            <Text className="text-sm text-muted-foreground">{t('design.passCode')}</Text>
            <Text
              accessibilityLabel={`${t('design.passCode')}: ${created.code.split('').join(' ')}`}
              className="w-full text-center text-primary"
              style={{ fontSize: 40, fontWeight: '700', letterSpacing: 4 }}
              selectable
              adjustsFontSizeToFit
              minimumFontScale={0.5}
              numberOfLines={1}
            >
              {created.code}
            </Text>
            <Text className="text-center text-sm leading-6 text-muted-foreground">
              {t('preApprove.hint')}
            </Text>
          </View>
        </Section>
        <Button
          size="lg"
          onPress={async () => {
            setShareError(false);
            try {
              await Share.share({
                message: `${created.visitorName}\n${t('design.passCode')}: ${created.code}\n${t('preApprove.hint')}`
              });
            } catch {
              setShareError(true);
            }
          }}
        >
          <Text>{t('design.sharePass')}</Text>
        </Button>
        {shareError && <Feedback message={t('design.shareFailed')} />}
        <Button
          variant="outline"
          onPress={() => {
            setCreated(null);
            setName('');
            setPhone('');
            setApartmentId(null);
            setShareError(false);
          }}
        >
          <Text>{t('preApprove.another')}</Text>
        </Button>
      </Screen>
    );
  }

  const canSubmit = name.trim().length > 0 && !!apartmentId && !create.isPending && isOnline;

  return (
    <Screen>
      <PageIntro title={t('design.createPass')} description={t('design.inviteHint')} />
      <Section>
        <Field label={t('register.visitorName')}>
          <Input
            accessibilityLabel={t('register.visitorName')}
            placeholder={t('register.visitorName')}
            value={name}
            onChangeText={setName}
          />
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
        <ApartmentPicker query={apartments} selected={apartmentId} onSelect={setApartmentId} />
        <View className="mt-1 gap-2">
          <Button size="lg" onPress={() => create.mutate()} disabled={!canSubmit}>
            <Text>{create.isPending ? t('preApprove.generating') : t('preApprove.generate')}</Text>
          </Button>
          {create.isError && <Feedback />}
        </View>
      </Section>
    </Screen>
  );
}
