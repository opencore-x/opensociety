import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Fragment, useState } from 'react'
import type { ResidencyRelation, User, UserRole, UserStatus } from '@opensociety/shared'
import { residencyRelationSchema, userRoleSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
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

const FILTERS: { labelKey: string; value: UserStatus | 'ALL' }[] = [
  { labelKey: 'common.all', value: 'ALL' },
  { labelKey: 'page.residents.pending', value: 'PENDING' },
  { labelKey: 'page.residents.approved', value: 'APPROVED' },
  { labelKey: 'page.residents.suspended', value: 'SUSPENDED' },
]

const STATUS_VARIANT: Record<UserStatus, 'default' | 'secondary' | 'destructive'> = {
  APPROVED: 'default',
  PENDING: 'secondary',
  SUSPENDED: 'destructive',
}

function ApprovePanel({ user, onDone }: { user: User; onDone: () => void }) {
  const { t } = useT()
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
        <Label>{t('common.apartment')}</Label>
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('common.selectUnit')} />
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
        <Label>{t('page.residents.relation')}</Label>
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
        {t('page.residents.primaryResident')}
      </label>
      <Button onClick={() => mutation.mutate()} disabled={!apartmentId || mutation.isPending}>
        {mutation.isPending ? t('page.residents.approving') : t('common.confirm')}
      </Button>
      <Button variant="ghost" onClick={onDone}>
        {t('common.cancel')}
      </Button>
      {apartments.isSuccess && apartments.data?.length === 0 && (
        <p className="text-destructive w-full text-xs">{t('page.residents.addAptsFirst')}</p>
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
  const { t } = useT()
  const [filter, setFilter] = useState<UserStatus | 'ALL'>('ALL')
  const [approving, setApproving] = useState<string | null>(null)
  const users = useQuery({
    queryKey: ['users', filter],
    queryFn: () => apiClient.listUsers(filter === 'ALL' ? undefined : filter),
  })

  return (
    <div>
      <PageHeader title={t('nav.residents')} description={t('page.residents.desc')} />

      <div className="mb-4 flex gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            size="sm"
            variant={filter === f.value ? 'default' : 'outline'}
            onClick={() => setFilter(f.value)}
          >
            {t(f.labelKey)}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6">
          <QueryState
            q={users}
            empty={users.isSuccess && users.data?.length === 0}
            emptyText={t('page.residents.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('page.residents.contact')}</TableHead>
                  <TableHead>{t('page.residents.role')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.action')}</TableHead>
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
                            {approving === u.id ? t('common.close') : t('common.approve')}
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
