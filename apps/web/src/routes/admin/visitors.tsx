import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useMemo, useState } from 'react'
import { availableVisitorActions } from '@opensociety/shared'
import type { VisitorEntry, VisitorStatus } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/visitors')({ component: VisitorsPage })

const STATUS_VARIANT: Record<VisitorStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  APPROVED: 'default',
  ENTERED: 'default',
  PENDING: 'secondary',
  DENIED: 'destructive',
  CANCELLED: 'destructive',
  EXPIRED: 'outline',
  EXITED: 'outline',
}

const ALL_STATUSES: VisitorStatus[] = [
  'PENDING',
  'APPROVED',
  'ENTERED',
  'EXITED',
  'DENIED',
  'CANCELLED',
  'EXPIRED',
]

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function DenyPanel({ entry, onDone }: { entry: VisitorEntry; onDone: () => void }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const mutation = useMutation({
    mutationFn: () => apiClient.denyVisitor(entry.id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitors'] })
      onDone()
    },
  })
  return (
    <div className="bg-muted/40 flex flex-wrap items-center gap-3 rounded-md p-3">
      <Input
        placeholder="Reason for denial"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="max-w-xs"
      />
      <Button variant="destructive" disabled={!reason.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? 'Denying…' : 'Confirm deny'}
      </Button>
      <Button variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      {mutation.isError && <p className="text-destructive w-full text-xs">{(mutation.error as Error).message}</p>}
    </div>
  )
}

function TransitionButton({
  entry,
  label,
  variant,
  mutationFn,
}: {
  entry: VisitorEntry
  label: string
  variant?: 'default' | 'outline'
  mutationFn: (id: string) => Promise<VisitorEntry>
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: () => mutationFn(entry.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['visitors'] }),
  })
  return (
    <Button size="sm" variant={variant} disabled={mutation.isPending} onClick={() => mutation.mutate()}>
      {mutation.isPending ? '…' : label}
    </Button>
  )
}

function VisitorsPage() {
  const [filter, setFilter] = useState<VisitorStatus | 'ALL'>('ALL')
  const [denying, setDenying] = useState<string | null>(null)

  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })

  const aptLabel = useMemo(() => {
    const m = new Map<string, string>()
    apartments.data?.forEach((a) => m.set(a.id, `${a.tower}-${a.apartmentNo}`))
    return m
  }, [apartments.data])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    visitors.data?.forEach((v) => (c[v.status] = (c[v.status] ?? 0) + 1))
    return c
  }, [visitors.data])

  const rows = (visitors.data ?? []).filter((v) => filter === 'ALL' || v.status === filter)

  return (
    <div>
      <PageHeader
        title="Visitor logs"
        description={`${visitors.data?.length ?? 0} total entries`}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Button size="sm" variant={filter === 'ALL' ? 'default' : 'outline'} onClick={() => setFilter('ALL')}>
          All ({visitors.data?.length ?? 0})
        </Button>
        {ALL_STATUSES.map((s) => (
          <Button key={s} size="sm" variant={filter === s ? 'default' : 'outline'} onClick={() => setFilter(s)}>
            {s} ({counts[s] ?? 0})
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <QueryState
            q={visitors}
            empty={visitors.isSuccess && rows.length === 0}
            emptyText="No visitor entries in this view."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Apartment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Checked in</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v) => (
                  <Fragment key={v.id}>
                    <TableRow>
                      <TableCell className="font-medium">
                        {v.visitorName}
                        {v.visitorPhone && (
                          <span className="text-muted-foreground block text-xs">{v.visitorPhone}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.type}</TableCell>
                      <TableCell className="text-muted-foreground">{aptLabel.get(v.apartmentId) ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[v.status]}>{v.status}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatTime(v.createdAt)}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{formatTime(v.checkInAt)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {availableVisitorActions(v.status).map((action) => {
                            if (action === 'approve')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Approve"
                                  mutationFn={apiClient.approveVisitor}
                                />
                              )
                            if (action === 'checkin')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Check in"
                                  mutationFn={apiClient.checkInVisitor}
                                />
                              )
                            if (action === 'checkout')
                              return (
                                <TransitionButton
                                  key={action}
                                  entry={v}
                                  label="Check out"
                                  variant="outline"
                                  mutationFn={apiClient.checkOutVisitor}
                                />
                              )
                            if (action === 'deny')
                              return (
                                <Button
                                  key={action}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setDenying(denying === v.id ? null : v.id)}
                                >
                                  {denying === v.id ? 'Close' : 'Deny'}
                                </Button>
                              )
                            return null
                          })}
                        </div>
                      </TableCell>
                    </TableRow>
                    {denying === v.id && (
                      <TableRow>
                        <TableCell colSpan={7}>
                          <DenyPanel entry={v} onDone={() => setDenying(null)} />
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
