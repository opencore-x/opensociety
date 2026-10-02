import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import type { TicketCategory, TicketPriority, TicketStatus } from '@opensociety/shared';
import { ticketCategorySchema, ticketPrioritySchema } from '@opensociety/shared';
import { apiClient } from '../api/client';
import { useT } from '../lib/i18n';
import { useSyncStatus } from '../lib/offline/use-sync-status';
import { Button } from '../components/ui/button';
import { Chip } from '../components/ui/chip';
import { Input } from '../components/ui/input';
import { Text } from '../components/ui/text';
import { Screen, PageIntro, EmptyState } from '../components/ui/screen';
import { Feedback, Field, LoadingState, Section } from '../components/ui/feedback';
import { ApartmentPicker } from '../components/apartment-picker';
import { cn } from '../lib/utils';

const STATUS_COLOR: Record<TicketStatus, string> = {
  OPEN: 'text-amber-800',
  IN_PROGRESS: 'text-primary',
  RESOLVED: 'text-green-700',
  CLOSED: 'text-muted-foreground',
  CANCELLED: 'text-muted-foreground'
};

export default function Tickets() {
  const qc = useQueryClient();
  const { t } = useT();
  const { isOnline } = useSyncStatus();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [apartmentId, setApartmentId] = useState<string | null>(null);
  const [category, setCategory] = useState<TicketCategory>('OTHER');
  const [priority, setPriority] = useState<TicketPriority>('NORMAL');

  const apartments = useQuery({
    queryKey: ['apartments'],
    queryFn: () => apiClient.listApartments()
  });
  const tickets = useQuery({ queryKey: ['tickets'], queryFn: () => apiClient.listTickets() });

  const create = useMutation({
    mutationFn: () =>
      apiClient.createTicket({
        apartmentId: apartmentId!,
        title: title.trim(),
        description: description.trim(),
        category,
        priority
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setTitle('');
      setDescription('');
      setApartmentId(null);
      setCategory('OTHER');
      setPriority('NORMAL');
    }
  });

  const canSubmit =
    title.trim().length > 0 &&
    description.trim().length > 0 &&
    !!apartmentId &&
    !create.isPending &&
    isOnline;

  const rows = tickets.data ?? [];

  return (
    <Screen>
      <PageIntro title={t('tickets.raiseTitle')} description={t('design.maintenanceDescription')} />

      <Section>
        <Field label={t('common.title')}>
          <Input
            accessibilityLabel={t('common.title')}
            placeholder={t('common.title')}
            value={title}
            onChangeText={setTitle}
          />
        </Field>
        <Field label={t('common.description')}>
          <Input
            className="min-h-28 py-3"
            textAlignVertical="top"
            accessibilityLabel={t('common.description')}
            placeholder={t('tickets.descPlaceholder')}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </Field>
        <ApartmentPicker query={apartments} selected={apartmentId} onSelect={setApartmentId} />
        <Field label={t('common.category')}>
          <View className="flex-row flex-wrap gap-2">
            {ticketCategorySchema.options.map((c) => (
              <Chip
                key={c}
                label={t('value.' + c)}
                selected={category === c}
                onPress={() => setCategory(c)}
              />
            ))}
          </View>
        </Field>
        <Field label={t('common.priority')}>
          <View className="flex-row flex-wrap gap-2">
            {ticketPrioritySchema.options.map((p) => (
              <Chip
                key={p}
                label={t('value.' + p)}
                selected={priority === p}
                onPress={() => setPriority(p)}
              />
            ))}
          </View>
        </Field>
        <View className="mt-1 gap-2">
          <Button size="lg" onPress={() => create.mutate()} disabled={!canSubmit}>
            <Text>{create.isPending ? t('tickets.submitting') : t('tickets.submit')}</Text>
          </Button>
          {create.isError && <Feedback />}
          {create.isSuccess && <Feedback tone="success" message={t('design.ticketSaved')} />}
        </View>
      </Section>
      <Text accessibilityRole="header" className="mt-3 text-lg font-bold">
        {t('tickets.yourTickets')}
      </Text>
      {tickets.isPending ? (
        <LoadingState />
      ) : tickets.isError ? (
        <Feedback message={t('design.loadFailed')} onRetry={() => tickets.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState icon="tool" title={t('tickets.empty')} />
      ) : (
        rows.map((ticket) => (
          <View key={ticket.id} className="gap-3 rounded-xl border border-border bg-card p-5">
            <View className="gap-2">
              <Text className="shrink text-base font-semibold">{ticket.title}</Text>
              <Text className={cn('text-xs font-bold', STATUS_COLOR[ticket.status])}>
                {t('value.' + ticket.status)}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground">{ticket.description}</Text>
            <Text className="mt-0.5 text-xs text-muted-foreground">
              {t('value.' + ticket.category)} · {t('value.' + ticket.priority)}
            </Text>
          </View>
        ))
      )}
    </Screen>
  );
}
