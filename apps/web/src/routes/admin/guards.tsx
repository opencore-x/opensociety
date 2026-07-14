import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import type { CreateGuard, Guard } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/guards')({ component: GuardsPage })

function AddGuard() {
  const { t } = useT()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateGuard = { name }
      if (phone.trim()) body.phone = phone.trim()
      if (employeeCode.trim()) body.employeeCode = employeeCode.trim()
      return apiClient.createGuard(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['guards'] })
      setName('')
      setPhone('')
      setEmployeeCode('')
    },
  })

  return (
    <form
      className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="g-name">{t('common.name')}</Label>
        <Input id="g-name" placeholder="Ramesh Kumar" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-phone">{t('common.phone')}</Label>
        <Input id="g-phone" placeholder="+91…" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="g-code">{t('page.guards.employeeCode')}</Label>
        <Input
          id="g-code"
          placeholder="G-001"
          value={employeeCode}
          onChange={(e) => setEmployeeCode(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? t('common.adding') : t('page.guards.addButton')}
      </Button>
      {mutation.isError && (
        <p className="text-destructive col-span-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function GuardRow({ guard }: { guard: Guard }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showDevice, setShowDevice] = useState(false)
  const [name, setName] = useState(guard.name)
  const [phone, setPhone] = useState(guard.phone ?? '')
  const [employeeCode, setEmployeeCode] = useState(guard.employeeCode ?? '')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['guards'] })

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateGuard(guard.id, {
        name,
        phone: phone.trim() || null,
        employeeCode: employeeCode.trim() || null,
      }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateGuard(guard.id, { isActive: !guard.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell>
          <Input value={employeeCode} onChange={(e) => setEmployeeCode(e.target.value)} className="h-8 w-28" />
        </TableCell>
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={save.isPending || !name.trim()} onClick={() => save.mutate()}>
              {save.isPending ? '…' : t('common.save')}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
      <TableRow className={guard.isActive ? undefined : 'opacity-60'}>
        <TableCell className="font-medium">{guard.name}</TableCell>
        <TableCell className="text-muted-foreground">{guard.phone ?? '—'}</TableCell>
        <TableCell className="text-muted-foreground">{guard.employeeCode ?? '—'}</TableCell>
        <TableCell>
          <Badge variant={guard.isActive ? 'default' : 'secondary'}>{guard.isActive ? t('common.active') : t('common.inactive')}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setShowDevice((s) => !s)}>
              {showDevice ? t('page.guards.hideDevice') : t('page.guards.device')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant={guard.isActive ? 'ghost' : 'default'}
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {toggleActive.isPending ? '…' : guard.isActive ? t('common.deactivate') : t('common.activate')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showDevice && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/40">
            <GuardDevices guardId={guard.id} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function GuardDevices({ guardId }: { guardId: string }) {
  const { t } = useT()
  const qc = useQueryClient()
  const devices = useQuery({ queryKey: ['guard-devices', guardId], queryFn: () => apiClient.listGuardDevices(guardId) })
  const revoke = useMutation({
    mutationFn: (deviceId: string) => apiClient.revokeGuardDevice(guardId, deviceId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['guard-devices', guardId] }),
  })
  const fmt = (iso: string) => new Date(iso).toLocaleString()
  const active = devices.data?.filter((d) => d.revokedAt === null) ?? []
  const revoked = devices.data?.filter((d) => d.revokedAt !== null) ?? []

  return (
    <div className="space-y-2 py-1 text-sm">
      <p className="font-medium">{t('page.guards.boundDevice')}</p>
      {devices.isLoading && <p className="text-muted-foreground">{t('common.loading')}</p>}
      {devices.isSuccess && active.length === 0 && (
        <p className="text-muted-foreground">{t('page.guards.noDevice')}</p>
      )}
      {active.map((d) => (
        <div key={d.id} className="flex items-center gap-3">
          <span className="font-medium">{d.model ?? t('page.guards.unknownModel')}</span>
          <span className="text-muted-foreground text-xs">{t('page.guards.lastActive')} {fmt(d.lastActiveAt)}</span>
          <Button size="sm" variant="outline" onClick={() => revoke.mutate(d.deviceId)} disabled={revoke.isPending}>
            {revoke.isPending ? '…' : t('common.revoke')}
          </Button>
        </div>
      ))}
      {revoked.length > 0 && (
        <p className="text-muted-foreground text-xs">
          {t('page.guards.revoked')} {revoked.map((d) => d.model ?? d.deviceId.slice(0, 8)).join(', ')}
        </p>
      )}
    </div>
  )
}

function GuardsPage() {
  const { t } = useT()
  const guards = useQuery({ queryKey: ['guards'], queryFn: apiClient.listGuards })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.guards')}
        description={`${guards.data?.length ?? 0} ${guards.data?.length === 1 ? t('page.guards.guardOne') : t('page.guards.guardMany')} ${t('common.registered')}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.guards.registerTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddGuard />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.guards.allTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={guards}
            empty={guards.isSuccess && guards.data?.length === 0}
            emptyText={t('page.guards.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.phone')}</TableHead>
                  <TableHead>{t('page.guards.employeeCode')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guards.data?.map((g) => (
                  <GuardRow key={g.id} guard={g} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
