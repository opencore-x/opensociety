import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, CreateVehicle, Vehicle, VehicleType } from '@opensociety/shared'
import { vehicleTypeSchema } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/vehicles')({ component: VehiclesPage })

function useApartmentLabels() {
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const labelOf = useMemo(() => {
    const map = new Map((apartments.data ?? []).map((a) => [a.id, `${a.tower}-${a.apartmentNo}`]))
    return (id: string) => map.get(id) ?? id
  }, [apartments.data])
  return { apartments: apartments.data ?? [], labelOf }
}

function AddVehicle({ apartments }: { apartments: Apartment[] }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const [registrationNumber, setRegistrationNumber] = useState('')
  const [type, setType] = useState<VehicleType>('CAR')
  const [make, setMake] = useState('')
  const [color, setColor] = useState('')

  const reset = () => {
    setRegistrationNumber('')
    setType('CAR')
    setMake('')
    setColor('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateVehicle = { apartmentId, registrationNumber: registrationNumber.trim(), type }
      if (make.trim()) body.make = make.trim()
      if (color.trim()) body.color = color.trim()
      return apiClient.createVehicle(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vehicles'] })
      reset()
    },
  })

  const canSubmit = apartmentId && registrationNumber.trim()

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (canSubmit) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label>{t('common.flat')}</Label>
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder={t('common.selectFlat')} />
          </SelectTrigger>
          <SelectContent>
            {apartments.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-reg">{t('page.vehicles.regNumber')}</Label>
        <Input
          id="v-reg"
          className="w-40"
          placeholder="KA 01 AB 1234"
          value={registrationNumber}
          onChange={(e) => setRegistrationNumber(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('common.type')}</Label>
        <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {vehicleTypeSchema.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-make">{t('page.vehicles.make')}</Label>
        <Input id="v-make" className="w-40" placeholder="Honda City" value={make} onChange={(e) => setMake(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="v-color">{t('page.vehicles.color')}</Label>
        <Input id="v-color" className="w-28" placeholder="White" value={color} onChange={(e) => setColor(e.target.value)} />
      </div>
      <Button type="submit" disabled={mutation.isPending || !canSubmit}>
        {mutation.isPending ? t('common.adding') : t('page.vehicles.addButton')}
      </Button>
      {mutation.isError && <p className="text-destructive w-full text-sm">{(mutation.error as Error).message}</p>}
    </form>
  )
}

function VehicleRow({ vehicle, labelOf }: { vehicle: Vehicle; labelOf: (id: string) => string }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [registrationNumber, setRegistrationNumber] = useState(vehicle.registrationNumber)
  const [type, setType] = useState<VehicleType>(vehicle.type)
  const [make, setMake] = useState(vehicle.make ?? '')

  const invalidate = () => qc.invalidateQueries({ queryKey: ['vehicles'] })
  const save = useMutation({
    mutationFn: () =>
      apiClient.updateVehicle(vehicle.id, { registrationNumber: registrationNumber.trim(), type, make: make.trim() || null }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })
  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateVehicle(vehicle.id, { isActive: !vehicle.isActive }),
    onSuccess: invalidate,
  })

  if (editing) {
    return (
      <TableRow>
        <TableCell>
          <Input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell>
          <Select value={type} onValueChange={(v) => setType(v as VehicleType)}>
            <SelectTrigger className="h-8 w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {vehicleTypeSchema.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-muted-foreground">{labelOf(vehicle.apartmentId)}</TableCell>
        <TableCell>
          <Input value={make} onChange={(e) => setMake(e.target.value)} className="h-8 w-36" />
        </TableCell>
        <TableCell />
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" disabled={save.isPending || !registrationNumber.trim()} onClick={() => save.mutate()}>
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
    <TableRow className={vehicle.isActive ? undefined : 'opacity-60'}>
      <TableCell className="font-mono font-medium">{vehicle.registrationNumber}</TableCell>
      <TableCell>
        <Badge variant="secondary">{vehicle.type}</Badge>
      </TableCell>
      <TableCell className="text-muted-foreground">{labelOf(vehicle.apartmentId)}</TableCell>
      <TableCell className="text-muted-foreground">
        {[vehicle.make, vehicle.color].filter(Boolean).join(' · ') || '—'}
      </TableCell>
      <TableCell>
        <Badge variant={vehicle.isActive ? 'default' : 'secondary'}>
          {vehicle.isActive ? t('common.active') : t('common.inactive')}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            {t('common.edit')}
          </Button>
          <Button
            size="sm"
            variant={vehicle.isActive ? 'ghost' : 'default'}
            onClick={() => toggleActive.mutate()}
            disabled={toggleActive.isPending}
          >
            {toggleActive.isPending ? '…' : vehicle.isActive ? t('common.deactivate') : t('common.activate')}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}

function GateLog() {
  const { t } = useT()
  const log = useQuery({ queryKey: ['vehicle-gate-log'], queryFn: apiClient.listVehicleGateLog })
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.vehicles.gateLog')}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={log} empty={log.isSuccess && log.data?.length === 0} emptyText={t('page.vehicles.gateEmpty')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('page.vehicles.plate')}</TableHead>
                <TableHead>{t('common.visitor')}</TableHead>
                <TableHead>{t('common.flat')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
                <TableHead>{t('common.checkIn')}</TableHead>
                <TableHead>{t('page.vehicles.known')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {log.data?.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono">{r.vehicleNumber ?? '—'}</TableCell>
                  <TableCell className="font-medium">{r.visitorName}</TableCell>
                  <TableCell className="text-muted-foreground">{r.apartment ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{r.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{fmt(r.checkInAt)}</TableCell>
                  <TableCell>
                    {r.registered ? (
                      <Badge variant="default">{t('page.vehicles.registeredBadge')}</Badge>
                    ) : (
                      <Badge variant="outline">{t('common.visitor')}</Badge>
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

function VehiclesPage() {
  const { t } = useT()
  const { apartments, labelOf } = useApartmentLabels()
  const vehicles = useQuery({ queryKey: ['vehicles'], queryFn: () => apiClient.listVehicles() })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.vehicles')}
        description={`${vehicles.data?.length ?? 0} ${
          vehicles.data?.length === 1 ? t('page.vehicles.vehicleOne') : t('page.vehicles.vehicleMany')
        } ${t('common.registered')}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.vehicles.registerTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddVehicle apartments={apartments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.vehicles.allTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={vehicles}
            empty={vehicles.isSuccess && vehicles.data?.length === 0}
            emptyText={t('page.vehicles.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('page.vehicles.regNumber')}</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('common.flat')}</TableHead>
                  <TableHead>{t('page.vehicles.makeColor')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vehicles.data?.map((v) => (
                  <VehicleRow key={v.id} vehicle={v} labelOf={labelOf} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      <GateLog />
    </div>
  )
}
