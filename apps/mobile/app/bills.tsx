import { useQuery } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'
import type { BillStatus } from '@opensociety/shared'
import { formatPaise } from '@opensociety/shared'
import { apiClient } from '../api/client'
import { useT } from '../lib/i18n'
import { cn } from '../lib/utils'
import { Text } from '../components/ui/text'
import { Icon } from '../components/ui/icon'
import { EmptyState, PageIntro, Screen, ScreenState } from '../components/ui/screen'
import { Button } from '../components/ui/button'

const STATUS_STYLE: Record<BillStatus, string> = {
  ISSUED: 'bg-blue-100 text-blue-800',
  PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
  PAID: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-muted text-muted-foreground',
}

function fmtDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function Bills() {
  const { t } = useT()
  const bills = useQuery({ queryKey: ['bills'], queryFn: () => apiClient.listBills() })
  const payments = useQuery({ queryKey: ['payments'], queryFn: () => apiClient.listPayments() })
  const myApts = useQuery({
    queryKey: ['my-apartments'],
    queryFn: () => apiClient.listMyApartments(),
  })
  const primaryApt = myApts.data?.[0]?.id
  const statement = useQuery({
    queryKey: ['my-statement', primaryApt],
    queryFn: () => apiClient.getApartmentStatement(primaryApt!),
    enabled: !!primaryApt,
  })

  if (bills.isLoading) return <ScreenState loading />
  if (bills.isError)
    return <ScreenState title={t('bills.loadError')} onRetry={() => bills.refetch()} />

  return (
    <Screen contentContainerClassName="gap-4">
      <PageIntro title={t('design.billsTitle')} description={t('design.billsDescription')} />
      {(bills.data ?? []).length === 0 && <EmptyState icon="receipt" title={t('bills.empty')} />}
      {(bills.data ?? []).map((b) => {
        const outstanding = b.totalAmount - (b.paidAmount ?? 0)
        return (
          <View key={b.id} className="gap-4 rounded-xl border border-border bg-card p-5">
            <View className="flex-row flex-wrap items-center justify-between gap-3">
              <Text className="flex-1 text-base font-semibold">{b.title}</Text>
              <Text
                className={cn(
                  'overflow-hidden rounded-full px-3 py-1 text-xs font-semibold',
                  STATUS_STYLE[b.status],
                )}
              >
                {t('design.billStatus.' + b.status)}
              </Text>
            </View>
            <Text className="text-sm text-muted-foreground">
              {b.periodMonth ?? t('bills.oneTime')}
              {b.dueDate ? ` · ${t('bills.due')} ${fmtDate(b.dueDate)}` : ''}
            </Text>
            <View className="flex-row flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
              <Text className="text-[26px] font-semibold leading-8 tracking-tight">
                {formatPaise(b.totalAmount)}
              </Text>
              {b.status === 'CANCELLED' ? null : outstanding > 0 ? (
                <Text className="text-sm font-semibold text-amber-700">
                  {formatPaise(outstanding)} {t('bills.due')}
                </Text>
              ) : (
                <Text className="text-sm font-semibold text-green-700">{t('bills.paid')}</Text>
              )}
            </View>
          </View>
        )
      })}

      <Text className="mt-4 text-lg font-bold">{t('bills.paymentHistory')}</Text>
      {payments.isLoading ? (
        <ActivityIndicator />
      ) : payments.isError ? (
        <View className="gap-3 rounded-xl border border-border bg-card p-5">
          <Text className="text-sm text-muted-foreground">{t('design.paymentsError')}</Text>
          <Button variant="outline" onPress={() => payments.refetch()}>
            <Text>{t('design.retry')}</Text>
          </Button>
        </View>
      ) : (
        (payments.data ?? []).length === 0 && (
          <EmptyState icon="history" title={t('bills.noPayments')} />
        )
      )}
      {(payments.data ?? []).map((p) => (
        <View
          key={p.id}
          className="flex-row flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-5"
        >
          <View className="h-10 w-10 items-center justify-center rounded-full bg-secondary">
            <Icon name="check" size={20} />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold">{p.method.replaceAll('_', ' ')}</Text>
            <Text className="text-sm text-muted-foreground">
              {fmtDate(p.paidAt)}
              {p.reference ? ` · ${p.reference}` : ''}
            </Text>
          </View>
          <Text className="text-base font-bold">{formatPaise(p.amount)}</Text>
        </View>
      ))}

      {statement.data && statement.data.entries.length > 0 && (
        <>
          <Text className="mt-4 text-lg font-bold">{t('bills.statement')}</Text>
          {statement.data.entries.map((e, i) => (
            <View
              key={`${e.ref ?? ''}-${i}`}
              className="flex-row flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
            >
              <View className="flex-1">
                <Text className="text-sm font-semibold">{e.description}</Text>
                <Text className="text-xs text-muted-foreground">{e.date.slice(0, 10)}</Text>
              </View>
              <View className="items-end">
                <Text
                  className={cn(
                    'text-sm font-semibold',
                    e.debit ? 'text-amber-700' : 'text-green-700',
                  )}
                >
                  {e.debit ? `+${formatPaise(e.debit)}` : `-${formatPaise(e.credit)}`}
                </Text>
                <Text className="text-xs text-muted-foreground">{formatPaise(e.balance)}</Text>
              </View>
            </View>
          ))}
          <View className="flex-row items-center justify-between px-1 pt-1">
            <Text className="text-sm font-bold">{t('bills.closingBalance')}</Text>
            <Text className="text-sm font-bold">{formatPaise(statement.data.closing)}</Text>
          </View>
        </>
      )}
    </Screen>
  )
}
