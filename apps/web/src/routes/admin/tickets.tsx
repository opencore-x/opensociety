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
import { useT } from '@/lib/i18n'
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

const ACTION_KEY: Record<TicketAction, string> = {
  start: 'page.tickets.actionStart',
  resolve: 'page.tickets.actionResolve',
  close: 'common.close',
  reopen: 'page.tickets.actionReopen',
  cancel: 'common.cancel',
}

function CreateForm({ apartmentOptions }: { apartmentOptions: { id: string; label: string }[] }) {
  const { t } = useT()
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
          <Label>{t('common.apartment')}</Label>
          <Select value={apartmentId} onValueChange={setApartmentId}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t('common.selectUnit')} />
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
          <Label>{t('common.title')}</Label>
          <Input
            className="w-44"
            placeholder={t('page.tickets.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('common.description')}</Label>
          <Input
            className="w-56"
            placeholder={t('page.tickets.descPlaceholder')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>{t('common.category')}</Label>
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
          <Label>{t('common.priority')}</Label>
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
          {create.isPending ? t('page.tickets.creating') : t('page.tickets.raiseTicket')}
        </Button>
        {create.isError && (
          <p className="text-destructive w-full text-xs">{(create.error as Error).message}</p>
        )}
      </CardContent>
    </Card>
  )
}

function ActionButtons({ id, status }: { id: string; status: TicketStatus }) {
  const { t } = useT()
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
          {t(ACTION_KEY[a])}
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
  const { t } = useT()
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
        <SelectValue placeholder={t('page.tickets.unassigned')} />
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
  const { t } = useT()
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
        title={t('page.tickets.title')}
        description={t('page.tickets.desc')}
      />

      <CreateForm apartmentOptions={apartmentOptions} />

      <div className="mb-4 flex items-center gap-2">
        <Label className="text-muted-foreground text-xs">{t('page.tickets.filter')}</Label>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t('common.allStatuses')}</SelectItem>
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
          <QueryState q={tickets} empty={tickets.isSuccess && rows.length === 0} emptyText={t('page.tickets.empty')}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.title')}</TableHead>
                  <TableHead>{t('common.apartment')}</TableHead>
                  <TableHead>{t('common.category')}</TableHead>
                  <TableHead>{t('common.priority')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('common.assignee')}</TableHead>
                  <TableHead>{t('common.raised')}</TableHead>
                  <TableHead className="text-right">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.title}
                      <span className="text-muted-foreground block max-w-xs truncate text-xs">
                        {ticket.description}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{aptLabel.get(ticket.apartmentId) ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{ticket.category}</TableCell>
                    <TableCell>
                      <Badge
                        variant={ticket.priority === 'URGENT' || ticket.priority === 'HIGH' ? 'destructive' : 'secondary'}
                      >
                        {ticket.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[ticket.status]}>{ticket.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <AssignCell
                        id={ticket.id}
                        assignedTo={ticket.assignedTo}
                        assignees={assignees}
                        userLabel={userLabel}
                        editable={ticket.status !== 'CLOSED' && ticket.status !== 'CANCELLED'}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{formatDate(ticket.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <ActionButtons id={ticket.id} status={ticket.status} />
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
