import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { PreApprovalType } from '@opensociety/shared'
import { preApprovalTypeSchema } from '@opensociety/shared'

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

  const create = useMutation({
    mutationFn: () =>
      apiClient.createPreApproval({
        apartmentId,
        visitorName: visitorName.trim(),
        visitorPhone: visitorPhone.trim() || undefined,
        approvalType,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pre-approvals'] })
      setVisitorName('')
      setVisitorPhone('')
      setApartmentId('')
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
                    <TableCell className="text-right">{p.isActive && <RevokeButton id={p.id} />}</TableCell>
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
