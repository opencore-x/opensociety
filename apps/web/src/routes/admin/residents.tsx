import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import type { ResidencyRelation, User, UserRole, UserStatus } from '@opensociety/shared'
import { residencyRelationSchema, userRoleSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const Route = createFileRoute('/admin/residents')({ component: ResidentsPage })

const FILTERS: { label: string; value: UserStatus | 'ALL' }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Approved', value: 'APPROVED' },
  { label: 'Suspended', value: 'SUSPENDED' },
]

const STATUS_VARIANT: Record<UserStatus, 'default' | 'secondary' | 'destructive'> = {
  APPROVED: 'default',
  PENDING: 'secondary',
  SUSPENDED: 'destructive',
}

function ApprovePanel({ user, onDone }: { user: User; onDone: () => void }) {
  const qc = useQueryClient()
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const [apartmentId, setApartmentId] = useState('')
  const [relation, setRelation] = useState<ResidencyRelation>('OWNER')
  const [isPrimary, setIsPrimary] = useState(true)

  const mutation = useMutation({
    mutationFn: () => apiClient.approveUser(user.id, { apartmentId, relation, isPrimary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onDone()
    },
  })

  return (
    <div className="bg-muted/40 flex flex-wrap items-end gap-3 rounded-md p-3">
      <div className="space-y-1.5">
        <Label>Apartment</Label>
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Select unit" />
          </SelectTrigger>
          <SelectContent>
            {apartments.data?.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Relation</Label>
        <Select value={relation} onValueChange={(v) => setRelation(v as ResidencyRelation)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {residencyRelationSchema.options.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm">
        <input
          type="checkbox"
          checked={isPrimary}
          onChange={(e) => setIsPrimary(e.target.checked)}
          className="accent-primary size-4"
        />
        Primary resident
      </label>
      <Button onClick={() => mutation.mutate()} disabled={!apartmentId || mutation.isPending}>
        {mutation.isPending ? 'Approving…' : 'Confirm'}
      </Button>
      <Button variant="ghost" onClick={onDone}>
        Cancel
      </Button>
      {apartments.isSuccess && apartments.data?.length === 0 && (
        <p className="text-destructive w-full text-xs">Add apartments first before approving residents.</p>
      )}
      {mutation.isError && <p className="text-destructive w-full text-xs">{(mutation.error as Error).message}</p>}
    </div>
  )
}

function RoleSelect({ user }: { user: User }) {
  const qc = useQueryClient()
  const mutation = useMutation({
    mutationFn: (role: UserRole) => apiClient.updateUserRole(user.id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
  return (
    <Select value={user.role} onValueChange={(v) => mutation.mutate(v as UserRole)} disabled={mutation.isPending}>
      <SelectTrigger size="sm" className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {userRoleSchema.options.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function ResidentsPage() {
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [approving, setApproving] = useState<string | null>(null)
  const users = useQuery({
    queryKey: ['users', filter],
    queryFn: () => apiClient.listUsers(filter === 'ALL' ? undefined : filter),
  })

  return (
    <div>
      <PageHeader title="Residents" description="Approve new residents and manage their roles." />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <QueryState
            q={users}
            empty={users.isSuccess && users.data?.length === 0}
            emptyText="No residents in this view yet."
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data?.map((u) => (
                  <Fragment key={u.id}>
                    <TableRow>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-muted-foreground">{u.email ?? u.phone ?? '—'}</TableCell>
                      <TableCell>
                        <RoleSelect user={u} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[u.status]}>{u.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {u.status === 'PENDING' && (
                          <Button
                            size="sm"
                            variant={approving === u.id ? 'secondary' : 'default'}
                            onClick={() => setApproving(approving === u.id ? null : u.id)}
                          >
                            {approving === u.id ? 'Close' : 'Approve'}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {approving === u.id && (
                      <TableRow>
                        <TableCell colSpan={5}>
                          <ApprovePanel user={u} onDone={() => setApproving(null)} />
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
