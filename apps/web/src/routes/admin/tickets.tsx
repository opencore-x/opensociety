import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { TicketAction, TicketCategory, TicketPriority, TicketStatus, User } from '@opensociety/shared'
import {
  availableTicketActions,
  ticketCategorySchema,
  ticketPrioritySchema,
  ticketStatusSchema,
} from '@opensociety/shared'

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

export const Route = createFileRoute('/admin/tickets')({ component: TicketsPage })

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { dateStyle: 'medium' })
}

const STATUS_VARIANT: Record<TicketStatus, 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  IN_PROGRESS: 'default',
  RESOLVED: 'secondary',
  CLOSED: 'outline',
  CANCELLED: 'outline',
}

const ACTION_LABEL: Record<TicketAction, string> = {
  start: 'Start',
  resolve: 'Resolve',
  close: 'Close',
  reopen: 'Reopen',
  cancel: 'Cancel',
}

function CreateForm({ apartmentOptions }: { apartmentOptions: { id: string; label: string }[] }) {
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState<TicketCategory>('OTHER')
  const [priority, setPriority] = useState<TicketPriority>('NORMAL')

  const create = useMutation({
    mutationFn: () =>
      apiClient.createTicket({ apartmentId, title: title.trim(), description: description.trim(), category, priority }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] })
      setTitle('')
      setDescription('')
      setApartmentId('')
    },
  })

  const canSubmit = title.trim().length > 0 && description.trim().length > 0 && !!apartmentId && !create.isPending

  return (
    <Card className="mb-4">
      <CardContent className="flex flex-wrap items-end gap-3 pt-6">
        <div className="space-y-1.5">
          <Label>Apartment</Label>
          <Select value={apartmentId} onValueChange={setApartmentId}>
            <SelectTrigger className="w-36">
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
          <Label>Title</Label>
          <Input
            className="w-44"
            placeholder="e.g. Leaking tap"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description</Label>
          <Input
            className="w-56"
            placeholder="What needs fixing?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ticketCategorySchema.options.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ticketPrioritySchema.options.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => create.mutate()} disabled={!canSubmit}>
          {create.isPending ? 'Creating…' : 'Raise ticket'}
        </Button>
        {create.isError && (
          <p className="text-destructive w-full text-xs">{(create.error as Error).message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ActionButtons({ id, status }: { id: string; status: TicketStatus }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (action: TicketAction) => apiClient.transitionTicket(id, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
  const actions = availableTicketActions(status)
  if (actions.length === 0) return <span className="text-muted-foreground text-xs">—</span>
  return (
    <div className="flex justify-end gap-1.5">
      {actions.map((a) => (
        <Button
          key={a}
          size="sm"
          variant={a === 'cancel' ? 'outline' : 'default'}
          disabled={mutation.isPending}
          onClick={() => mutation.mutate(a)}
        >
          {ACTION_LABEL[a]}
        </Button>
      ))}
    </div>
  )
}

function AssignCell({
  id,
  assignedTo,
  assignees,
  userLabel,
  editable,
}: {
  id: string
  assignedTo: string | null
  assignees: User[]
  userLabel: Map<string, string>
  editable: boolean
}) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (userId: string) => apiClient.assignTicket(id, userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  })
  if (!editable) {
    return (
      <span className="text-muted-foreground text-xs">
        {assignedTo ? (userLabel.get(assignedTo) ?? '—') : '—'}
      </span>
    )
  }
  return (
    <Select value={assignedTo ?? undefined} onValueChange={(v) => mutation.mutate(v)} disabled={mutation.isPending}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent>
        {assignees.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {u.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const tickets = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => apiClient.listTickets(statusFilter === 'ALL' ? undefined : statusFilter),
  })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const users = useQuery({ queryKey: ['users'], queryFn: () => apiClient.listUsers() })

  const aptLabel = useMemo(() => {
    const m = new Map<string, string>()
    apartments.data?.forEach((a) => m.set(a.id, `${a.tower}-${a.apartmentNo}`))
    return m
  }, [apartments.data])

  // Tickets are assigned to staff who do the work — not residents.
  const assignees = useMemo(
    () => (users.data ?? []).filter((u) => u.role === 'ADMIN' || u.role === 'STAFF' || u.role === 'GUARD'),
    [users.data],
  )
  const userLabel = useMemo(() => {
    const m = new Map<string, string>()
    users.data?.forEach((u) => m.set(u.id, u.name))
    return m
  }, [users.data])

  const apartmentOptions = useMemo(
    () => apartments.data?.map((a) => ({ id: a.id, label: `${a.tower}-${a.apartmentNo}` })) ?? [],
    [apartments.data],
  )

  const rows = tickets.data ?? []

  return (
    <div>
      <PageHeader
        title="Maintenance tickets"
        description="Requests raised by residents — triage, work and resolve them here."
      />

      <CreateForm apartmentOptions={apartmentOptions} />

      <div className="mb-4 flex items-center gap-2">
        <Label className="text-muted-foreground text-xs">Filter</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {ticketStatusSchema.options.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          <QueryState q={tickets} empty={tickets.isSuccess && rows.length === 0} emptyText="No tickets.">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Apartment</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assignee</TableHead>
                  <TableHead>Raised</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      {t.title}
                      <span className="text-muted-foreground block max-w-xs truncate text-xs">
                        {t.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{aptLabel.get(t.apartmentId) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{t.category}</TableCell>
                    <TableCell>
                      <Badge variant={t.priority === 'URGENT' || t.priority === 'HIGH' ? 'destructive' : 'secondary'}>
                        {t.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[t.status]}>{t.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <AssignCell
                        id={t.id}
                        assignedTo={t.assignedTo}
                        assignees={assignees}
                        userLabel={userLabel}
                        editable={t.status !== 'CLOSED' && t.status !== 'CANCELLED'}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(t.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <ActionButtons id={t.id} status={t.status} />
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
