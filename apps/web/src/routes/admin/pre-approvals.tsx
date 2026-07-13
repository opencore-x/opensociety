import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import QRCode from 'react-qr-code'
import type { PreApprovalType } from '@opensociety/shared'
import { preApprovalTypeSchema, preApprovalQrValue } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/pre-approvals')({ component: PreApprovalsPage })

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

function CreateForm({ apartmentOptions }: { apartmentOptions: { id: string; label: string }[] }) {
  const qc = useQueryClient()
  const [visitorName, setVisitorName] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [apartmentId, setApartmentId] = useState('')
  const [approvalType, setApprovalType] = useState<PreApprovalType>('ONE_TIME')
  const [maxUses, setMaxUses] = useState('')
  const [validUntil, setValidUntil] = useState('')

  const create = useMutation({
    mutationFn: () =>
      apiClient.createPreApproval({
        apartmentId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        approvalType,
        maxUses: maxUses ? Number(maxUses) : undefined,
        // date input -> end-of-day ISO timestamp
        validUntil: validUntil ? new Date(`${validUntil}T23:59:59`).toISOString() : undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pre-approvals'] })
      setVisitorName('')
      setVisitorPhone('')
      setApartmentId('')
      setMaxUses('')
      setValidUntil('')
    },
  })

  const canSubmit = visitorName.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="space-y-1.5">
          <Label>Visitor name</Label>
          <Input
            className="w-44"
            placeholder="e.g. Priya"
            value={visitorName}
            onChange={(e) => setVisitorName(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone (optional)</Label>
          <Input
            className="w-40"
            placeholder="10-digit"
            value={visitorPhone}
            onChange={(e) => setVisitorPhone(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Apartment</Label>
          <Select value={apartmentId} onValueChange={setApartmentId}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Select unit" />
            </SelectTrigger>
            <SelectContent>
              {apartmentOptions.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={approvalType} onValueChange={(v) => setApprovalType(v as PreApprovalType)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {preApprovalTypeSchema.options.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Max uses</Label>
          <Input
            className="w-24"
            type="number"
            min={1}
            placeholder="∞"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Valid until</Label>
          <Input
            className="w-40"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
          />
        </div>
        <Button onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Generating…' : 'Generate code'}
        </Button>
        {create.isError && (
          <p className="text-destructive w-full text-xs">{(create.error as Error).message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function QrButton({ code, visitorName }: { code: string; visitorName: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        QR
      </Button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-background w-full max-w-xs rounded-lg p-6 text-center shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">{visitorName}</p>
            <p className="text-muted-foreground mb-4 text-sm">Show this QR at the gate</p>
            <div className="mx-auto inline-block rounded bg-white p-3">
              <QRCode value={preApprovalQrValue(code)} size={196} />
            </div>
            <p className="mt-4 font-mono text-lg tracking-widest">{code}</p>
            <Button className="mt-4 w-full" variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </>
  )
}

function RevokeButton({ id }: { id: string }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => apiClient.revokePreApproval(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pre-approvals'] }),
  })
  return (
    <Button size="sm" variant="outline" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? '…' : 'Revoke'}
    </Button>
  )
}

function PreApprovalsPage() {
  const preApprovals = useQuery({ queryKey: ['pre-approvals'], queryFn: () => apiClient.listPreApprovals() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const aptLabel = useMemo(() => {
    const m = new Map<string, string>()
    apartments.data?.forEach((a) => m.set(a.id, `${a.tower}-${a.apartmentNo}`))
    return m
  }, [apartments.data])

  const apartmentOptions = useMemo(
    () => apartments.data?.map((a) => ({ id: a.id, label: `${a.tower}-${a.apartmentNo}` })) ?? [],
    [apartments.data],
  )

  const rows = preApprovals.data ?? []

  return (
    <div>
      <PageHeader
        title="Pre-approvals"
        description="Expected visitors — generate a code a guard redeems at the gate."
      />

      <CreateForm apartmentOptions={apartmentOptions} />

      <Card>
        <CardContent className="pt-6">
          <QueryState
            q={preApprovals}
            empty={preApprovals.isSuccess && rows.length === 0}
            emptyText="No pre-approvals yet."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Apartment</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Uses</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.visitorName}
                      {p.visitorPhone && (
                        <span className="text-muted-foreground block text-xs">{p.visitorPhone}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{aptLabel.get(p.apartmentId) ?? '—'}</TableCell>
                    <TableCell className="font-mono tracking-widest">{p.code}</TableCell>
                    <TableCell className="text-muted-foreground">{p.approvalType}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.useCount}
                      {p.maxUses != null ? `/${p.maxUses}` : ''}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(p.validUntil)}</TableCell>
                    <TableCell>
                      <Badge variant={p.isActive ? 'default' : 'secondary'}>
                        {p.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {p.isActive && (
                        <div className="flex justify-end gap-2">
                          <QrButton code={p.code} visitorName={p.visitorName} />
                          <RevokeButton id={p.id} />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
