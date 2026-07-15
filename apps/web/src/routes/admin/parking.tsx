import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, ParkingSlotType, ParkingSummary } from '@opensociety/shared'
import { parkingSlotTypeSchema, parkingSlotStatus, summarizeParking } from '@opensociety/shared'

import { apiClient, type ParkingSlotRow } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/parking')({ component: ParkingPage })

const NOW_ISH = () => Date.now()

function toMs(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  return Number.isNaN(t) ? null : t
}

function statusOf(slot: ParkingSlotRow) {
  return parkingSlotStatus(
    {
      isActive: slot.isActive,
      apartmentId: slot.apartmentId,
      isTemporary: slot.isTemporary,
      assignedUntilMs: toMs(slot.assignedUntil),
    },
    NOW_ISH(),
  )
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  AVAILABLE: 'outline',
  ASSIGNED: 'default',
  TEMPORARY: 'secondary',
  INACTIVE: 'secondary',
}

function AddSlot() {
  const { t } = useT()
  const qc = useQueryClient()
  const [slotNumber, setSlotNumber] = useState('')
  const [type, setType] = useState<ParkingSlotType>('OPEN')
  const [isVisitor, setIsVisitor] = useState(false)

  const create = useMutation({
    mutationFn: () => apiClient.createParkingSlot({ slotNumber: slotNumber.trim(), type, isVisitor }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['parking-slots'] })
      qc.invalidateQueries({ queryKey: ['visitor-parking'] })
      setSlotNumber('')
      setType('OPEN')
      setIsVisitor(false)
    },
  })

  const canSubmit = slotNumber.trim().length > 0 && !create.isPending

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) create.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="slot-no">{t('page.parking.slotNumber')}</Label>
        <Input
          id="slot-no"
          className="w-40"
          placeholder="e.g. B1-05"
          value={slotNumber}
          onChange={(e) => setSlotNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('common.type')}</Label>
        <Select value={type} onValueChange={(v) => setType(v as ParkingSlotType)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {parkingSlotTypeSchema.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <label className="text-muted-foreground flex items-center gap-1.5 pb-2 text-sm">
        <input type="checkbox" checked={isVisitor} onChange={(e) => setIsVisitor(e.target.checked)} />
        {t('page.parking.visitorSlot')}
      </label>
      <Button type="submit" disabled={!canSubmit}>
        {create.isPending ? t('common.adding') : t('page.parking.addSlot')}
      </Button>
      {create.isError && <p className="text-destructive w-full text-sm">{(create.error as Error).message}</p>}
    </form>
  )
}

function VisitorParkingCard() {
  const { t } = useT()
  const q = useQuery({ queryKey: ['visitor-parking'], queryFn: apiClient.listVisitorParking })
  const summary = q.data?.summary
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' }) : '—')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          {t('page.parking.visitorParking')}
          {summary?.isFull && (
            <Badge variant="destructive">
              {t('page.parking.full')} — {summary.occupied}/{summary.total}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState
          q={q}
          empty={q.isSuccess && (q.data?.slots.length ?? 0) === 0}
          emptyText={t('page.parking.visitorEmpty')}
        >
          {summary && (
            <p className="text-muted-foreground mb-4 text-sm">
              {summary.available} / {summary.total} {t('page.parking.free')} · {summary.occupied}{' '}
              {t('page.parking.occupied')}
            </p>
          )}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('page.parking.slot')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.visitor')}</TableHead>
                <TableHead>{t('page.parking.vehicle')}</TableHead>
                <TableHead>{t('common.since')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data?.slots.map((s) => (
                <TableRow key={s.id} className={s.isActive ? undefined : 'opacity-60'}>
                  <TableCell className="font-mono font-medium">{s.slotNumber}</TableCell>
                  <TableCell>
                    <Badge variant={s.occupiedByEntryId ? 'default' : 'outline'}>
                      {s.occupiedByEntryId ? t('page.parking.occupiedBadge') : t('page.parking.freeBadge')}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.visitorName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground font-mono">{s.vehicleNumber ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{fmt(s.occupiedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function AssignControls({ slot, apartments }: { slot: ParkingSlotRow; apartments: Apartment[] }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [temporary, setTemporary] = useState(false)
  const [until, setUntil] = useState('')
  const invalidate = () => qc.invalidateQueries({ queryKey: ['parking-slots'] })

  const assign = useMutation({
    mutationFn: () =>
      apiClient.assignParkingSlot(slot.id, {
        apartmentId,
        isTemporary: temporary,
        assignedUntil: temporary && until ? new Date(`${until}T23:59:59`).toISOString() : null,
      }),
    onSuccess: () => {
      invalidate()
      setApartmentId('')
      setTemporary(false)
      setUntil('')
    },
  })
  const release = useMutation({
    mutationFn: () => apiClient.assignParkingSlot(slot.id, { apartmentId: null, isTemporary: false, assignedUntil: null }),
    onSuccess: invalidate,
  })

  const canAssign = !!apartmentId && (!temporary || until.length > 0) && !assign.isPending

  if (slot.apartmentId) {
    return (
      <Button size="sm" variant="ghost" disabled={release.isPending} onClick={() => release.mutate()}>
        {release.isPending ? '…' : t('common.release')}
      </Button>
    )
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Select value={apartmentId} onValueChange={setApartmentId}>
        <SelectTrigger className="h-8 w-28">
          <SelectValue placeholder={t('common.flat')} />
        </SelectTrigger>
        <SelectContent>
          {apartments.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.tower}-{a.apartmentNo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <label className="text-muted-foreground flex items-center gap-1 text-xs">
        <input type="checkbox" checked={temporary} onChange={(e) => setTemporary(e.target.checked)} />
        {t('page.parking.temp')}
      </label>
      {temporary && (
        <Input type="date" className="h-8 w-36" value={until} onChange={(e) => setUntil(e.target.value)} />
      )}
      <Button size="sm" disabled={!canAssign} onClick={() => assign.mutate()}>
        {assign.isPending ? '…' : t('common.assign')}
      </Button>
    </div>
  )
}

function SlotRow({ slot, apartments }: { slot: ParkingSlotRow; apartments: Apartment[] }) {
  const { t } = useT()
  const qc = useQueryClient()
  const status = statusOf(slot)
  const statusLabel: Record<string, string> = {
    AVAILABLE: t('page.parking.available'),
    ASSIGNED: t('page.parking.assigned'),
    TEMPORARY: t('page.parking.temporary'),
    INACTIVE: t('common.inactive'),
  }
  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateParkingSlot(slot.id, { isActive: !slot.isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['parking-slots'] }),
  })
  const fmtDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'

  return (
    <TableRow className={slot.isActive ? undefined : 'opacity-60'}>
      <TableCell className="font-mono font-medium">{slot.slotNumber}</TableCell>
      <TableCell>
        <Badge variant="secondary">{slot.type}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{slot.apartment ?? '—'}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANT[status]}>{statusLabel[status] ?? status}</Badge>
        {slot.isTemporary && slot.assignedUntil && (
          <span className="text-muted-foreground ml-1 text-xs">
            {t('page.parking.till')} {fmtDate(slot.assignedUntil)}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-2">
          {slot.isActive && <AssignControls slot={slot} apartments={apartments} />}
          <Button
            size="sm"
            variant={slot.isActive ? 'ghost' : 'default'}
            disabled={toggleActive.isPending}
            onClick={() => toggleActive.mutate()}
          >
            {toggleActive.isPending ? '…' : slot.isActive ? t('common.deactivate') : t('common.activate')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function SummaryCard({ summary }: { summary: ParkingSummary }) {
  const { t } = useT()
  const stat = (label: string, value: number) => (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold">{value}</span>
      <span className="text-muted-foreground text-xs">{label}</span>
    </div>
  )
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-8 pt-6">
        {stat(t('common.total'), summary.total)}
        {stat(t('page.parking.available'), summary.available)}
        {stat(t('page.parking.assigned'), summary.assigned)}
        {stat(t('page.parking.temporary'), summary.temporary)}
        {stat(t('page.parking.covered'), summary.covered)}
        {stat(t('page.parking.open'), summary.open)}
      </CardContent>
    </Card>
  )
}

function ParkingPage() {
  const { t } = useT()
  const slots = useQuery({ queryKey: ['parking-slots'], queryFn: apiClient.listParkingSlots })
  const apartmentsQ = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const apartments = apartmentsQ.data ?? []

  const summary = useMemo<ParkingSummary>(
    () =>
      summarizeParking(
        (slots.data ?? []).map((s) => ({
          isActive: s.isActive,
          type: s.type,
          apartmentId: s.apartmentId,
          isTemporary: s.isTemporary,
          assignedUntilMs: toMs(s.assignedUntil),
        })),
        NOW_ISH(),
      ),
    [slots.data],
  )

  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.parking')} description={t('page.parking.desc')} />

      <SummaryCard summary={summary} />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.parking.addSlot')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddSlot />
        </CardContent>
      </Card>

      <VisitorParkingCard />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.parking.residentSlots')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={slots}
            empty={slots.isSuccess && slots.data?.length === 0}
            emptyText={t('page.parking.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('page.parking.slot')}</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.flat')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {slots.data?.map((s) => (
                  <SlotRow key={s.id} slot={s} apartments={apartments} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>
    </div>
  )
}
