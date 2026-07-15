import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { BillConfig, GenerateBills, MaintenanceBill, PaymentMethod } from '@opensociety/shared'
import { formatPaise, paymentMethodSchema, billStatusSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/billing')({ component: BillingPage })

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  PAID: 'default',
  PARTIALLY_PAID: 'outline',
  ISSUED: 'secondary',
  CANCELLED: 'destructive',
}

const rupeesToPaise = (r: string) => Math.round((parseFloat(r) || 0) * 100)
type LineDraft = { description: string; amount: string; taxRatePct: string }

function GenerateBillsForm() {
  const { t } = useT()
  const qc = useQueryClient()
  const [period, setPeriod] = useState('')
  const [title, setTitle] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([{ description: 'Maintenance charge', amount: '', taxRatePct: '18' }])

  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const mutation = useMutation({
    mutationFn: () => {
      const body: GenerateBills = {
        periodMonth: period,
        title,
        lineItems: lines
          .filter((l) => l.description.trim() && l.amount)
          .map((l) => ({ description: l.description.trim(), amount: rupeesToPaise(l.amount), taxRatePct: parseInt(l.taxRatePct) || 0 })),
      }
      return apiClient.generateBills(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
    },
  })

  const canSubmit = /^\d{4}-\d{2}$/.test(period) && title.trim() && lines.some((l) => l.description.trim() && l.amount)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) mutation.mutate()
      }}
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="b-period">{t('page.billing.period')}</Label>
          <Input id="b-period" className="w-36" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-title">{t('common.title')}</Label>
          <Input id="b-title" className="w-64" placeholder="Maintenance — Jul 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('page.billing.lineItems')}</Label>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder={t('common.description')} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input className="w-32" placeholder={t('page.billing.amount')} inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <Input className="w-24" placeholder="GST %" inputMode="numeric" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
            {lines.length > 1 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { description: '', amount: '', taxRatePct: '0' }])}>
          {t('page.billing.addLine')}
        </Button>
      </div>

      <Button type="submit" disabled={mutation.isPending || !canSubmit}>
        {mutation.isPending ? t('page.billing.generating') : t('page.billing.generateButton')}
      </Button>
      {mutation.isSuccess && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {t('page.billing.created')} {mutation.data.created}{' '}
          {mutation.data.created === 1 ? t('page.billing.billOne') : t('page.billing.billMany')} ({mutation.data.skipped}{' '}
          {t('page.billing.alreadyExisted')}).
        </p>
      )}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function RecordPayment({ bill }: { bill: MaintenanceBill }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('CASH')
  const pay = useMutation({
    mutationFn: () => apiClient.recordPayment({ billId: bill.id, amount: rupeesToPaise(amount), method }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bills'] })
      qc.invalidateQueries({ queryKey: ['dues'] })
      setAmount('')
    },
  })
  return (
    <div className="flex items-center justify-end gap-2">
      <Input className="h-8 w-24" placeholder="₹" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {paymentMethodSchema.options.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" disabled={pay.isPending || !amount} onClick={() => pay.mutate()}>
        {pay.isPending ? '…' : t('page.billing.record')}
      </Button>
    </div>
  )
}

function InvoiceButton({ billId }: { billId: string }) {
  const { t } = useT()
  const [busy, setBusy] = useState(false)
  const open = async () => {
    setBusy(true)
    try {
      const url = await apiClient.invoiceObjectUrl(billId)
      window.open(url, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }
  return (
    <Button variant="ghost" size="sm" onClick={open} disabled={busy}>
      {busy ? '…' : `📄 ${t('page.billing.invoice')}`}
    </Button>
  )
}

function DuesCard() {
  const { t } = useT()
  const dues = useQuery({ queryKey: ['dues'], queryFn: apiClient.listDues })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.billing.outstandingDues')}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={dues} empty={dues.isSuccess && dues.data?.length === 0} emptyText={t('page.billing.noDues')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.flat')}</TableHead>
                <TableHead className="text-right">{t('page.billing.billed')}</TableHead>
                <TableHead className="text-right">{t('page.billing.paid')}</TableHead>
                <TableHead className="text-right">{t('page.billing.outstanding')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dues.data?.map((d) => (
                <TableRow key={d.apartmentId}>
                  <TableCell className="font-medium">{d.apartment}</TableCell>
                  <TableCell className="text-right">{formatPaise(d.billed)}</TableCell>
                  <TableCell className="text-right">{formatPaise(d.paid)}</TableCell>
                  <TableCell className="text-right font-medium text-destructive">{formatPaise(d.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillsCard() {
  const { t } = useT()
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState('ALL')
  const bills = useQuery({
    queryKey: ['bills', period, status],
    queryFn: () => apiClient.listBills({ period: period || undefined, status: status === 'ALL' ? undefined : status }),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.billing.billsTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-period">{t('common.period')}</Label>
            <Input id="f-period" className="w-32" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('common.status')}</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t('common.allStatuses')}</SelectItem>
                {billStatusSchema.options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <QueryState q={bills} empty={bills.isSuccess && bills.data?.length === 0} emptyText={t('page.billing.noMatch')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.flat')}</TableHead>
                <TableHead>{t('common.title')}</TableHead>
                <TableHead className="text-right">{t('common.total')}</TableHead>
                <TableHead className="text-right">{t('page.billing.paid')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead className="text-right">{t('page.billing.recordPayment')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.data?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.apartment}</TableCell>
                  <TableCell className="text-muted-foreground">
                    <span className="align-middle">{b.title}</span> <InvoiceButton billId={b.id} />
                  </TableCell>
                  <TableCell className="text-right">{formatPaise(b.totalAmount)}</TableCell>
                  <TableCell className="text-right">{formatPaise(b.paidAmount ?? 0)}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[b.status]}>{b.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {b.status !== 'PAID' && b.status !== 'CANCELLED' ? (
                      <RecordPayment bill={b} />
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillConfigForm({ initial }: { initial: BillConfig }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [dueDay, setDueDay] = useState(String(initial.dueDayOfMonth))
  const [lines, setLines] = useState<LineDraft[]>(
    initial.lineItems.length
      ? initial.lineItems.map((l) => ({ description: l.description, amount: String(l.amount / 100), taxRatePct: String(l.taxRatePct) }))
      : [{ description: 'Maintenance charge', amount: '', taxRatePct: '18' }],
  )
  const setLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((ls) => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)))

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateBillConfig({
        dueDayOfMonth: parseInt(dueDay) || 10,
        lineItems: lines
          .filter((l) => l.description.trim() && l.amount)
          .map((l) => ({ description: l.description.trim(), amount: rupeesToPaise(l.amount), taxRatePct: parseInt(l.taxRatePct) || 0 })),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bill-config'] }),
  })

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="cfg-due">{t('page.billing.dueDay')}</Label>
        <Input id="cfg-due" className="w-24" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>{t('page.billing.recurringLines')}</Label>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder={t('common.description')} value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input className="w-32" placeholder={t('page.billing.amount')} inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <Input className="w-24" placeholder="GST %" inputMode="numeric" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
            {lines.length > 1 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { description: '', amount: '', taxRatePct: '0' }])}>
          {t('page.billing.addLine')}
        </Button>
      </div>
      <Button onClick={() => save.mutate()} disabled={save.isPending}>
        {save.isPending ? t('common.saving') : t('page.billing.saveConfig')}
      </Button>
      {save.isSuccess && <p className="text-sm text-emerald-600 dark:text-emerald-400">{t('page.billing.configSaved')}</p>}
      <p className="text-muted-foreground text-xs">{t('page.billing.configHint')}</p>
    </div>
  )
}

function BillConfigCard() {
  const { t } = useT()
  const cfg = useQuery({ queryKey: ['bill-config'], queryFn: apiClient.getBillConfig })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.billing.configTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={cfg} empty={false} emptyText="">
          {cfg.data && <BillConfigForm initial={cfg.data} />}
        </QueryState>
      </CardContent>
    </Card>
  )
}

function BillingPage() {
  const { t } = useT()
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.billing')} description={t('page.billing.desc')} />
      <BillConfigCard />
      <Card>
        <CardHeader>
          <CardTitle>{t('page.billing.generateTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <GenerateBillsForm />
        </CardContent>
      </Card>
      <DuesCard />
      <BillsCard />
    </div>
  )
}
