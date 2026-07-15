import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { Apartment, CreateHouseHelp, HouseHelpType, IdProofType } from '@opensociety/shared'
import type { BackgroundCheckStatus } from '@opensociety/shared'
import {
  houseHelpTypeSchema,
  idProofTypeSchema,
  backgroundCheckStatusSchema,
  summarizeHouseHelpAttendance,
  formatWorkedMinutes,
  houseHelpAttendanceToCsv,
  houseHelpWorkedMinutes,
} from '@opensociety/shared'

import { apiClient, type HouseHelpRow } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Modal } from '@/components/ui/modal'

export const Route = createFileRoute('/admin/house-help')({ component: HouseHelpPage })

function AddHouseHelp() {
  const { t } = useT()
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [type, setType] = useState<HouseHelpType>('MAID')
  const [idProofType, setIdProofType] = useState<IdProofType>('AADHAAR')
  const [idProofNumber, setIdProofNumber] = useState('')

  const reset = () => {
    setName('')
    setPhone('')
    setType('MAID')
    setIdProofType('AADHAAR')
    setIdProofNumber('')
  }

  const mutation = useMutation({
    mutationFn: () => {
      const body: CreateHouseHelp = { name: name.trim(), type }
      if (phone.trim()) body.phone = phone.trim()
      if (idProofNumber.trim()) {
        body.idProofType = idProofType
        body.idProofNumber = idProofNumber.trim()
      }
      return apiClient.createHouseHelp(body)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house-help'] })
      reset()
    },
  })

  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (name.trim()) mutation.mutate()
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="hh-name">{t('common.name')}</Label>
        <Input
          id="hh-name"
          className="w-44"
          placeholder="Lakshmi Devi"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-phone">{t('common.phone')}</Label>
        <Input
          id="hh-phone"
          className="w-36"
          placeholder="+91…"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label>{t('common.type')}</Label>
        <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {houseHelpTypeSchema.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>{t('page.houseHelp.idProof')}</Label>
        <Select value={idProofType} onValueChange={(v) => setIdProofType(v as IdProofType)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {idProofTypeSchema.options.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {opt}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hh-idnum">{t('page.houseHelp.idNumber')}</Label>
        <Input
          id="hh-idnum"
          className="w-44"
          placeholder="optional"
          value={idProofNumber}
          onChange={(e) => setIdProofNumber(e.target.value)}
        />
      </div>
      <Button type="submit" disabled={mutation.isPending || !name.trim()}>
        {mutation.isPending ? t('common.adding') : t('page.houseHelp.addButton')}
      </Button>
      {mutation.isError && (
        <p className="text-destructive w-full text-sm">{(mutation.error as Error).message}</p>
      )}
    </form>
  )
}

function TrustBadge({ help }: { help: HouseHelpRow }) {
  const { t } = useT()
  const verified = help.verificationLevel === 'VERIFIED'
  return (
    <div className="flex flex-col items-start gap-1">
      <Badge variant={verified ? 'default' : 'secondary'}>{verified ? t('page.houseHelp.verified') : t('page.houseHelp.unverified')}</Badge>
      <span className="text-muted-foreground text-xs">{t('page.houseHelp.trust')} {help.trustScore}/100</span>
    </div>
  )
}

function VerificationButton({ help }: { help: HouseHelpRow }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [idVerified, setIdVerified] = useState(help.idVerified)
  const [backgroundCheck, setBackgroundCheck] = useState<BackgroundCheckStatus>(help.backgroundCheck)
  const [incidents, setIncidents] = useState(String(help.incidentCount))

  const save = useMutation({
    mutationFn: () =>
      apiClient.updateHouseHelpVerification(help.id, {
        idVerified,
        backgroundCheck,
        incidentCount: Number(incidents) || 0,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['house-help'] })
      setOpen(false)
    },
  })

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t('page.houseHelp.verify')}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} className="w-full max-w-sm space-y-4">
        <p className="text-lg font-semibold">{help.name}{t('page.houseHelp.verificationSuffix')}</p>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={idVerified} onChange={(e) => setIdVerified(e.target.checked)} />
          {t('page.houseHelp.idVerified')}
        </label>
        <div className="space-y-1.5">
          <Label>{t('page.houseHelp.backgroundCheck')}</Label>
          <Select value={backgroundCheck} onValueChange={(v) => setBackgroundCheck(v as BackgroundCheckStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {backgroundCheckStatusSchema.options.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="incidents">{t('page.houseHelp.incidentReports')}</Label>
          <Input id="incidents" type="number" min={0} value={incidents} onChange={(e) => setIncidents(e.target.value)} />
        </div>
        <div className="flex gap-2 pt-1">
          <Button className="flex-1" disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? t('common.saving') : t('common.save')}
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
        </div>
      </Modal>
    </>
  )
}

function Rating({ avg, count }: { avg: number | null; count: number }) {
  const { t } = useT()
  if (count === 0) return <span className="text-muted-foreground text-sm">{t('page.houseHelp.noRatings')}</span>
  return (
    <span className="text-sm">
      <span className="text-amber-500">★</span> {avg}{' '}
      <span className="text-muted-foreground">({count})</span>
    </span>
  )
}

function ReviewsButton({ helpId, name }: { helpId: string; name: string }) {
  const { t } = useT()
  const [open, setOpen] = useState(false)
  const reviews = useQuery({
    queryKey: ['house-help-reviews', helpId],
    queryFn: () => apiClient.getHouseHelpReviews(helpId),
    enabled: open,
  })
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        {t('page.houseHelp.reviews')}
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} className="max-h-[80vh] w-full max-w-md overflow-auto">
        <p className="mb-1 text-lg font-semibold">{name}</p>
        {reviews.data && (
          <p className="text-muted-foreground mb-4 text-sm">
            <span className="text-amber-500">★</span> {reviews.data.summary.average ?? '—'} · {t('page.houseHelp.trust')}{' '}
            {reviews.data.summary.trustScore}/100 · {reviews.data.summary.count}{' '}
            {reviews.data.summary.count === 1 ? t('page.houseHelp.reviewOne') : t('page.houseHelp.reviewMany')}
          </p>
        )}
        <div className="space-y-3">
          {reviews.data?.reviews.length === 0 && <p className="text-muted-foreground text-sm">{t('page.houseHelp.noReviews')}</p>}
          {reviews.data?.reviews.map((r) => (
            <div key={r.id} className="border-border border-b pb-2 last:border-0">
              <p className="text-sm">
                <span className="text-amber-500">{'★'.repeat(r.rating)}</span>
                <span className="text-muted-foreground">{'★'.repeat(5 - r.rating)}</span>
              </p>
              {r.comment && <p className="text-muted-foreground text-sm">{r.comment}</p>}
            </div>
          ))}
        </div>
        <Button className="mt-4 w-full" variant="outline" onClick={() => setOpen(false)}>
          {t('common.close')}
        </Button>
      </Modal>
    </>
  )
}

function HouseHelpRow({ help, apartments }: { help: HouseHelpRow; apartments: Apartment[] }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showFlats, setShowFlats] = useState(false)
  const [name, setName] = useState(help.name)
  const [phone, setPhone] = useState(help.phone ?? '')
  const [type, setType] = useState<HouseHelpType>(help.type)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help'] })

  const save = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { name: name.trim(), phone: phone.trim() || null, type }),
    onSuccess: () => {
      invalidate()
      setEditing(false)
    },
  })

  const toggleActive = useMutation({
    mutationFn: () => apiClient.updateHouseHelp(help.id, { isActive: !help.isActive }),
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
          <Select value={type} onValueChange={(v) => setType(v as HouseHelpType)}>
            <SelectTrigger className="h-8 w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {houseHelpTypeSchema.options.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell />
        <TableCell />
        <TableCell />
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
      <TableRow className={help.isActive ? undefined : 'opacity-60'}>
        <TableCell className="font-medium">{help.name}</TableCell>
        <TableCell className="text-muted-foreground">{help.phone ?? '—'}</TableCell>
        <TableCell>
          <Badge variant="secondary">{help.type}</Badge>
        </TableCell>
        <TableCell className="text-muted-foreground">
          {help.idProofType ? `${help.idProofType}${help.idProofNumber ? ` · ${help.idProofNumber}` : ''}` : '—'}
        </TableCell>
        <TableCell>
          <Rating avg={help.ratingAvg} count={help.reviewCount} />
        </TableCell>
        <TableCell>
          <TrustBadge help={help} />
        </TableCell>
        <TableCell>
          <Badge variant={help.isActive ? 'default' : 'secondary'}>{help.isActive ? t('common.active') : t('common.inactive')}</Badge>
        </TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <VerificationButton help={help} />
            <ReviewsButton helpId={help.id} name={help.name} />
            <Button size="sm" variant="ghost" onClick={() => setShowFlats((s) => !s)}>
              {showFlats ? t('page.houseHelp.hideFlats') : t('page.houseHelp.flats')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
              {t('common.edit')}
            </Button>
            <Button
              size="sm"
              variant={help.isActive ? 'ghost' : 'default'}
              onClick={() => toggleActive.mutate()}
              disabled={toggleActive.isPending}
            >
              {toggleActive.isPending ? '…' : help.isActive ? t('common.deactivate') : t('common.activate')}
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {showFlats && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/40">
            <AssignmentsPanel helpId={help.id} apartments={apartments} />
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function AssignmentsPanel({ helpId, apartments }: { helpId: string; apartments: Apartment[] }) {
  const { t } = useT()
  const qc = useQueryClient()
  const [apartmentId, setApartmentId] = useState('')
  const assignments = useQuery({
    queryKey: ['house-help-assignments', helpId],
    queryFn: () => apiClient.listHouseHelpAssignments(helpId),
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['house-help-assignments', helpId] })
  const labelOf = (id: string) => {
    const a = apartments.find((x) => x.id === id)
    return a ? `${a.tower}-${a.apartmentNo}` : id
  }

  const add = useMutation({
    mutationFn: () => apiClient.assignHouseHelp(helpId, apartmentId),
    onSuccess: () => {
      invalidate()
      setApartmentId('')
    },
  })
  const remove = useMutation({
    mutationFn: (aptId: string) => apiClient.removeHouseHelpAssignment(helpId, aptId),
    onSuccess: invalidate,
  })

  const assignedIds = new Set((assignments.data ?? []).map((a) => a.apartmentId))
  const available = apartments.filter((a) => !assignedIds.has(a.id))

  return (
    <div className="space-y-3 py-1">
      <p className="text-sm font-medium">{t('page.houseHelp.assignedFlats')}</p>
      <div className="flex flex-wrap gap-2">
        {(assignments.data ?? []).length === 0 && (
          <span className="text-muted-foreground text-sm">{t('page.houseHelp.notAssigned')}</span>
        )}
        {(assignments.data ?? []).map((a) => (
          <Badge key={a.id} variant="secondary" className="gap-1.5">
            {labelOf(a.apartmentId)}
            <button
              className="hover:text-destructive"
              onClick={() => remove.mutate(a.apartmentId)}
              disabled={remove.isPending}
              aria-label={`Remove ${labelOf(a.apartmentId)}`}
            >
              ✕
            </button>
          </Badge>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Select value={apartmentId} onValueChange={setApartmentId}>
          <SelectTrigger className="h-8 w-40">
            <SelectValue placeholder={t('page.houseHelp.addFlat')} />
          </SelectTrigger>
          <SelectContent>
            {available.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tower}-{a.apartmentNo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" disabled={!apartmentId || add.isPending} onClick={() => add.mutate()}>
          {add.isPending ? '…' : t('common.assign')}
        </Button>
      </div>
      {add.isError && <p className="text-destructive text-sm">{(add.error as Error).message}</p>}
    </div>
  )
}

function HouseHelpPage() {
  const { t } = useT()
  const help = useQuery({ queryKey: ['house-help'], queryFn: () => apiClient.listHouseHelp() })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.houseHelp')}
        description={`${help.data?.length ?? 0} ${help.data?.length === 1 ? t('page.houseHelp.workerOne') : t('page.houseHelp.workerMany')} ${t('common.registered')}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>{t('page.houseHelp.registerTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <AddHouseHelp />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.houseHelp.allTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <QueryState
            q={help}
            empty={help.isSuccess && help.data?.length === 0}
            emptyText={t('page.houseHelp.empty')}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.phone')}</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead>{t('page.houseHelp.idProof')}</TableHead>
                  <TableHead>{t('page.houseHelp.rating')}</TableHead>
                  <TableHead>{t('page.houseHelp.trust')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead className="text-right">{t('common.action')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {help.data?.map((h) => (
                  <HouseHelpRow key={h.id} help={h} apartments={apartments.data ?? []} />
                ))}
              </TableBody>
            </Table>
          </QueryState>
        </CardContent>
      </Card>

      <AttendanceReports />
    </div>
  )
}

function AttendanceReports() {
  const { t } = useT()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const entries = useQuery({
    queryKey: ['house-help-entries', from, to],
    queryFn: () => apiClient.listHouseHelpEntries({ from: from || undefined, to: to || undefined }),
  })

  const rows = useMemo(() => entries.data ?? [], [entries.data])
  const summary = useMemo(() => summarizeHouseHelpAttendance(rows), [rows])
  const csvHref = useMemo(
    () => `data:text/csv;charset=utf-8,${encodeURIComponent(houseHelpAttendanceToCsv(rows))}`,
    [rows],
  )
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.houseHelp.attendanceTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="att-from">{t('common.from')}</Label>
            <Input id="att-from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="att-to">{t('common.to')}</Label>
            <Input id="att-to" type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFrom('')
                setTo('')
              }}
            >
              {t('common.clear')}
            </Button>
          )}
          <a
            href={csvHref}
            download="house-help-attendance.csv"
            className="border-input hover:bg-accent hover:text-accent-foreground ml-auto inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={rows.length === 0}
          >
            {t('common.downloadCsv')}
          </a>
        </div>

        <QueryState q={entries} empty={entries.isSuccess && rows.length === 0} emptyText={t('page.houseHelp.noAttendance')}>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('page.houseHelp.hoursPerHelp')}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.type')}</TableHead>
                  <TableHead className="text-right">{t('page.houseHelp.visits')}</TableHead>
                  <TableHead className="text-right">{t('common.hours')}</TableHead>
                  <TableHead className="text-right">{t('page.houseHelp.inside')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s) => (
                  <TableRow key={s.houseHelpId}>
                    <TableCell className="font-medium">{s.helpName}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{s.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{s.visits}</TableCell>
                    <TableCell className="text-right">{formatWorkedMinutes(s.totalMinutes)}</TableCell>
                    <TableCell className="text-right">{s.openVisits || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('page.houseHelp.entryLog')}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.name')}</TableHead>
                  <TableHead>{t('common.flat')}</TableHead>
                  <TableHead>{t('common.checkIn')}</TableHead>
                  <TableHead>{t('common.checkOut')}</TableHead>
                  <TableHead className="text-right">{t('common.duration')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.helpName}</TableCell>
                    <TableCell className="text-muted-foreground">{r.apartment ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(r.checkInAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{fmt(r.checkOutAt)}</TableCell>
                    <TableCell className="text-right">
                      {formatWorkedMinutes(houseHelpWorkedMinutes(r.checkInAt, r.checkOutAt))}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </QueryState>
      </CardContent>
    </Card>
  )
}
