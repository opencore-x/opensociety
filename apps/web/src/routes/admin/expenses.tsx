import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { formatPaise } from '@opensociety/shared'
import type { CreateExpense, ExpenseStatus, TdsSection } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/expenses')({ component: ExpensesPage })

const rupeesToPaise = (s: string) => Math.round((parseFloat(s) || 0) * 100)
const TDS_SECTIONS: TdsSection[] = ['SEC_194C', 'SEC_194J', 'SEC_194I']

function VendorsCard() {
  const { t } = useT()
  const qc = useQueryClient()
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: apiClient.listVendors })
  const [name, setName] = useState('')
  const [pan, setPan] = useState('')
  const [gstin, setGstin] = useState('')
  const add = useMutation({
    mutationFn: () => apiClient.createVendor({ name: name.trim(), pan: pan.trim() || undefined, gstin: gstin.trim() || undefined }),
    onSuccess: () => {
      setName('')
      setPan('')
      setGstin('')
      qc.invalidateQueries({ queryKey: ['vendors'] })
    },
  })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.expenses.vendors')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label>{t('page.expenses.vendorName')}</Label>
            <Input className="w-52" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('page.expenses.pan')}</Label>
            <Input className="w-32" value={pan} onChange={(e) => setPan(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('page.expenses.gstin')}</Label>
            <Input className="w-40" value={gstin} onChange={(e) => setGstin(e.target.value)} />
          </div>
          <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}>
            {t('page.expenses.addVendor')}
          </Button>
        </div>
        <QueryState q={vendors} empty={vendors.data?.length === 0} emptyText={t('page.expenses.noVendors')}>
          <div className="flex flex-wrap gap-2">
            {vendors.data?.map((v) => (
              <span key={v.id} className="bg-muted rounded px-2 py-1 text-sm">
                {v.name}
                {v.gstin ? ` · ${v.gstin}` : ''}
              </span>
            ))}
          </div>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function ExpensesCard() {
  const { t } = useT()
  const qc = useQueryClient()
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: apiClient.listAccounts })
  const vendors = useQuery({ queryKey: ['vendors'], queryFn: apiClient.listVendors })
  const expenses = useQuery({ queryKey: ['expenses'], queryFn: () => apiClient.listExpenses() })

  const heads = accounts.data?.filter((a) => a.type === 'EXPENSE' && !a.isGroup) ?? []

  const [accountId, setAccountId] = useState('')
  const [vendorId, setVendorId] = useState('')
  const [amount, setAmount] = useState('')
  const [gst, setGst] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ExpenseStatus>('PAID')
  const [tdsSection, setTdsSection] = useState<string>('')
  const [tdsRate, setTdsRate] = useState('')

  const initLedger = useMutation({
    mutationFn: apiClient.initLedger,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['accounts'] }),
  })

  const add = useMutation({
    mutationFn: () => {
      const body: CreateExpense = {
        accountId,
        amount: rupeesToPaise(amount),
        taxAmount: rupeesToPaise(gst),
        status,
        description: description.trim(),
        vendorId: vendorId || undefined,
        ...(tdsSection ? { tds: { section: tdsSection as TdsSection, ratePct: parseInt(tdsRate) || 0 } } : {}),
      }
      return apiClient.createExpense(body)
    },
    onSuccess: () => {
      setAmount('')
      setGst('')
      setDescription('')
      setTdsSection('')
      setTdsRate('')
      qc.invalidateQueries({ queryKey: ['expenses'] })
    },
  })

  const pay = useMutation({
    mutationFn: (id: string) => apiClient.payExpense(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.expenses.record')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {heads.length === 0 ? (
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{t('page.expenses.setupNeeded')}</p>
            <Button onClick={() => initLedger.mutate()} disabled={initLedger.isPending}>
              {t('page.expenses.initLedger')}
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1.5">
              <Label>{t('page.expenses.head')}</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('page.expenses.head')} />
                </SelectTrigger>
                <SelectContent>
                  {heads.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('page.expenses.vendor')}</Label>
              <Select value={vendorId || 'none'} onValueChange={(v) => setVendorId(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('page.expenses.none')}</SelectItem>
                  {vendors.data?.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('page.expenses.amount')}</Label>
              <Input className="w-28" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('page.expenses.gst')}</Label>
              <Input className="w-24" inputMode="decimal" value={gst} onChange={(e) => setGst(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('page.expenses.status')}</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as ExpenseStatus)}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PAID">PAID</SelectItem>
                  <SelectItem value="PAYABLE">PAYABLE</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('page.expenses.tdsSection')}</Label>
              <Select value={tdsSection || 'none'} onValueChange={(v) => setTdsSection(v === 'none' ? '' : v)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('page.expenses.none')}</SelectItem>
                  {TDS_SECTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace('SEC_', '')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {tdsSection && (
              <div className="space-y-1.5">
                <Label>{t('page.expenses.tdsRate')}</Label>
                <Input className="w-20" inputMode="numeric" value={tdsRate} onChange={(e) => setTdsRate(e.target.value)} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t('common.description')}</Label>
              <Input className="w-56" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <Button onClick={() => add.mutate()} disabled={!accountId || !amount || !description.trim() || add.isPending}>
              {t('page.expenses.record')}
            </Button>
          </div>
        )}

        <QueryState q={expenses} empty={expenses.data?.length === 0} emptyText={t('page.expenses.empty')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('common.description')}</TableHead>
                <TableHead>{t('page.expenses.head')}</TableHead>
                <TableHead>{t('page.expenses.vendor')}</TableHead>
                <TableHead className="text-right">{t('page.expenses.amount')}</TableHead>
                <TableHead className="text-right">{t('page.expenses.tds')}</TableHead>
                <TableHead>{t('page.expenses.status')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.data?.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.description}</TableCell>
                  <TableCell>{e.account ?? '—'}</TableCell>
                  <TableCell>{e.vendor ?? '—'}</TableCell>
                  <TableCell className="text-right">{formatPaise(e.amount + e.taxAmount)}</TableCell>
                  <TableCell className="text-right">{e.tdsAmount ? formatPaise(e.tdsAmount) : ''}</TableCell>
                  <TableCell>{e.status}</TableCell>
                  <TableCell className="text-right">
                    {e.status === 'PAYABLE' && (
                      <Button size="sm" variant="outline" onClick={() => pay.mutate(e.id)} disabled={pay.isPending}>
                        {t('page.expenses.pay')}
                      </Button>
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

function TdsSummaryCard() {
  const { t } = useT()
  const q = useQuery({ queryKey: ['tds-summary'], queryFn: () => apiClient.getTdsSummary() })
  if (!q.data || q.data.length === 0) return null
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.expenses.tdsSummary')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('page.expenses.section')}</TableHead>
              <TableHead className="text-right">{t('page.expenses.count')}</TableHead>
              <TableHead className="text-right">{t('page.expenses.amount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {q.data.map((r) => (
              <TableRow key={r.section}>
                <TableCell>{r.section.replace('SEC_', '')}</TableCell>
                <TableCell className="text-right">{r.count}</TableCell>
                <TableCell className="text-right">{formatPaise(r.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

function ExpensesPage() {
  const { t } = useT()
  return (
    <div className="space-y-6">
      <PageHeader title={t('page.expenses.title')} description={t('page.expenses.desc')} />
      <VendorsCard />
      <ExpensesCard />
      <TdsSummaryCard />
    </div>
  )
}
