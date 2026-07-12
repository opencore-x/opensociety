import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { GenerateBills, MaintenanceBill, PaymentMethod } from '@opensociety/shared'
import { formatPaise, paymentMethodSchema, billStatusSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
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
          <Label htmlFor="b-period">Period (YYYY-MM)</Label>
          <Input id="b-period" className="w-36" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="b-title">Title</Label>
          <Input id="b-title" className="w-64" placeholder="Maintenance — Jul 2026" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Line items</Label>
        {lines.map((l, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <Input className="w-56" placeholder="Description" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
            <Input className="w-32" placeholder="Amount ₹" inputMode="decimal" value={l.amount} onChange={(e) => setLine(i, { amount: e.target.value })} />
            <Input className="w-24" placeholder="GST %" inputMode="numeric" value={l.taxRatePct} onChange={(e) => setLine(i, { taxRatePct: e.target.value })} />
            {lines.length > 1 && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}>
                ✕
              </Button>
            )}
          </div>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={() => setLines((ls) => [...ls, { description: '', amount: '', taxRatePct: '0' }])}>
          + Add line
        </Button>
      </div>

      <Button type="submit" disabled={mutation.isPending || !canSubmit}>
        {mutation.isPending ? 'Generating…' : 'Generate bills for all flats'}
      </Button>
      {mutation.isSuccess && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          Created {mutation.data.created} bill{mutation.data.created === 1 ? '' : 's'} ({mutation.data.skipped} already existed).
        </p>
      )}
      {mutation.isError && <p className="text-destructive text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function RecordPayment({ bill }: { bill: MaintenanceBill }) {
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
        {pay.isPending ? '…' : 'Record'}
      </Button>
    </div>
  )
}

function DuesCard() {
  const dues = useQuery({ queryKey: ['dues'], queryFn: apiClient.listDues })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Outstanding dues</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={dues} empty={dues.isSuccess && dues.data?.length === 0} emptyText="No outstanding dues 🎉">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead className="text-right">Billed</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
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
  const [period, setPeriod] = useState('')
  const [status, setStatus] = useState('ALL')
  const bills = useQuery({
    queryKey: ['bills', period, status],
    queryFn: () => apiClient.listBills({ period: period || undefined, status: status === 'ALL' ? undefined : status }),
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bills</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-period">Period</Label>
            <Input id="f-period" className="w-32" placeholder="2026-07" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {billStatusSchema.options.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <QueryState q={bills} empty={bills.isSuccess && bills.data?.length === 0} emptyText="No bills match.">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Flat</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Record payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.data?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.apartment}</TableCell>
                  <TableCell className="text-muted-foreground">{b.title}</TableCell>
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

function BillingPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Generate maintenance bills, record payments, and track dues." />
      <Card>
        <CardHeader>
          <CardTitle>Generate monthly bills</CardTitle>
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
