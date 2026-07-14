import { createFileRoute } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  summarizeGuardDuty,
  dutySessionMinutes,
  formatWorkedMinutes,
  entriesDuringSession,
} from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/duty')({ component: DutyPage })

const loc = (lat: number | null, lng: number | null) =>
  lat != null && lng != null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : '—'
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleString() : '—')

function OnDutyNow() {
  const { t } = useT()
  const active = useQuery({ queryKey: ['duty-active'], queryFn: apiClient.listActiveDuty })
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.duty.onDutyNow')}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState q={active} empty={active.isSuccess && active.data?.length === 0} emptyText={t('page.duty.noGuardsOnDuty')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('page.duty.guard')}</TableHead>
                <TableHead>{t('common.since')}</TableHead>
                <TableHead>{t('page.duty.clockInLocation')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {active.data?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.guardName ?? '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{time(s.clockInAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{loc(s.clockInLat, s.clockInLng)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </QueryState>
      </CardContent>
    </Card>
  )
}

function ShiftReport() {
  const { t } = useT()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const sessions = useQuery({
    queryKey: ['duty-sessions', from, to],
    queryFn: () => apiClient.listDutySessions({ from: from || undefined, to: to || undefined }),
  })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })

  const rows = useMemo(() => sessions.data ?? [], [sessions.data])
  const entryTimes = useMemo(() => (visitors.data ?? []).map((v) => v.createdAt), [visitors.data])
  const summary = useMemo(
    () =>
      summarizeGuardDuty(
        rows.map((r) => ({ guardId: r.guardId, guardName: r.guardName ?? '', clockInAt: r.clockInAt, clockOutAt: r.clockOutAt })),
      ),
    [rows],
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('page.duty.shiftReport')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="duty-from">{t('common.from')}</Label>
            <Input id="duty-from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duty-to">{t('common.to')}</Label>
            <Input id="duty-to" type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
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
        </div>

        <QueryState q={sessions} empty={sessions.isSuccess && rows.length === 0} emptyText={t('page.duty.noShifts')}>
          <div className="space-y-2">
            <p className="text-sm font-medium">{t('page.duty.hoursPerGuard')}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('page.duty.guard')}</TableHead>
                  <TableHead className="text-right">{t('page.duty.shifts')}</TableHead>
                  <TableHead className="text-right">{t('common.hours')}</TableHead>
                  <TableHead className="text-right">{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.map((s) => (
                  <TableRow key={s.guardId}>
                    <TableCell className="font-medium">{s.guardName}</TableCell>
                    <TableCell className="text-right">{s.sessions}</TableCell>
                    <TableCell className="text-right">{formatWorkedMinutes(s.totalMinutes)}</TableCell>
                    <TableCell className="text-right">
                      {s.onDuty ? <Badge variant="default">{t('page.duty.onDuty')}</Badge> : <Badge variant="secondary">{t('page.duty.off')}</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('page.duty.shiftLog')}</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('page.duty.guard')}</TableHead>
                  <TableHead>{t('page.duty.clockIn')}</TableHead>
                  <TableHead>{t('page.duty.clockOut')}</TableHead>
                  <TableHead className="text-right">{t('common.duration')}</TableHead>
                  <TableHead className="text-right">{t('page.duty.entries')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.guardName ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{time(r.clockInAt)}</TableCell>
                    <TableCell className="text-muted-foreground">{time(r.clockOutAt)}</TableCell>
                    <TableCell className="text-right">
                      {formatWorkedMinutes(dutySessionMinutes(r.clockInAt, r.clockOutAt))}
                    </TableCell>
                    <TableCell className="text-right">{entriesDuringSession(r, entryTimes)}</TableCell>
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

function DutyPage() {
  const { t } = useT()
  const active = useQuery({ queryKey: ['duty-active'], queryFn: apiClient.listActiveDuty })
  return (
    <div className="space-y-6">
      <PageHeader title={t('nav.duty')} description={`${active.data?.length ?? 0} ${t('page.duty.desc')}`} />
      <OnDutyNow />
      <ShiftReport />
    </div>
  )
}
