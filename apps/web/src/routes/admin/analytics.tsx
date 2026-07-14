import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { hourLabel, visitorTrendsToCsv, dayOfWeekLabel } from '@opensociety/shared'
import type { HourCount, TypeCount, LabelCount, DowCount } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export const Route = createFileRoute('/admin/analytics')({ component: AnalyticsPage })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function HourChart({ byHour }: { byHour: HourCount[] }) {
  const max = Math.max(1, ...byHour.map((h) => h.count))
  return (
    <div className="flex h-40 items-stretch gap-1">
      {byHour.map((h) => (
        <div
          key={h.hour}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          title={`${hourLabel(h.hour)}: ${h.count}`}
        >
          <div
            className="bg-primary w-full rounded-t"
            style={{ height: `${(h.count / max) * 100}%`, minHeight: h.count > 0 ? 2 : 0 }}
          />
          {h.hour % 3 === 0 && <span className="text-muted-foreground text-[10px]">{h.hour}</span>}
        </div>
      ))}
    </div>
  )
}

function TypeBars({ byType }: { byType: TypeCount[] }) {
  const max = Math.max(1, ...byType.map((t) => t.count))
  if (byType.length === 0) return <p className="text-muted-foreground text-sm">No visitors in this range.</p>
  return (
    <div className="space-y-3">
      {byType.map((t) => (
        <div key={t.type} className="flex items-center gap-3">
          <span className="w-24 text-sm font-medium">{t.type}</span>
          <div className="bg-muted h-3 flex-1 overflow-hidden rounded">
            <div className="bg-primary h-3 rounded" style={{ width: `${(t.count / max) * 100}%` }} />
          </div>
          <span className="text-muted-foreground w-10 text-right text-sm">{t.count}</span>
        </div>
      ))}
    </div>
  )
}

function LabelBars({ rows, empty }: { rows: LabelCount[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  if (rows.length === 0) return <p className="text-muted-foreground text-sm">{empty}</p>
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3">
          <span className="w-28 text-sm font-medium">{r.label}</span>
          <div className="bg-muted h-3 flex-1 overflow-hidden rounded">
            <div className="bg-primary h-3 rounded" style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
          <span className="text-muted-foreground w-10 text-right text-sm">{r.count}</span>
        </div>
      ))}
    </div>
  )
}

function DowChart({ rows }: { rows: DowCount[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count))
  return (
    <div className="flex h-32 items-stretch gap-2">
      {rows.map((r) => (
        <div
          key={r.dow}
          className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          title={`${dayOfWeekLabel(r.dow)}: ${r.count}`}
        >
          <div
            className="bg-primary w-full rounded-t"
            style={{ height: `${(r.count / max) * 100}%`, minHeight: r.count > 0 ? 2 : 0 }}
          />
          <span className="text-muted-foreground text-[10px]">{dayOfWeekLabel(r.dow)}</span>
        </div>
      ))}
    </div>
  )
}

function OpsSection() {
  const help = useQuery({ queryKey: ['house-help-analytics'], queryFn: apiClient.getHouseHelpAnalytics })
  const maint = useQuery({ queryKey: ['maintenance-analytics'], queryFn: apiClient.getMaintenanceAnalytics })

  return (
    <>
      {help.data && (
        <Card>
          <CardHeader>
            <CardTitle>House help</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-10">
              <Stat label="Active help" value={String(help.data.totalActive)} />
              <Stat label="Total visits logged" value={String(help.data.totalAttendance)} />
            </div>
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">Most employed types</p>
              <LabelBars rows={help.data.byType} empty="No house help registered." />
            </div>
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">Attendance by day (IST)</p>
              <DowChart rows={help.data.attendanceByDow} />
            </div>
          </CardContent>
        </Card>
      )}

      {maint.data && (
        <Card>
          <CardHeader>
            <CardTitle>Maintenance tickets</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap gap-10">
              <Stat label="Total tickets" value={String(maint.data.total)} />
              <Stat label="Pending" value={String(maint.data.pending)} />
              <Stat
                label="Avg resolution"
                value={maint.data.avgResolutionHours === null ? '—' : `${maint.data.avgResolutionHours}h`}
              />
            </div>
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">By category</p>
              <LabelBars rows={maint.data.byCategory} empty="No tickets yet." />
            </div>
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium uppercase">By status</p>
              <LabelBars rows={maint.data.byStatus} empty="No tickets yet." />
            </div>
          </CardContent>
        </Card>
      )}
    </>
  )
}

function AnalyticsPage() {
  const { t } = useT()
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const trends = useQuery({
    queryKey: ['visitor-trends', from, to],
    queryFn: () => apiClient.getVisitorTrends(from || undefined, to || undefined),
  })

  const csvHref = trends.data
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(visitorTrendsToCsv(trends.data.byDay))}`
    : '#'

  const openPdf = async () => {
    const url = await apiClient.visitorTrendsPdfObjectUrl(from || undefined, to || undefined)
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('nav.analytics')}
        description={t('page.analytics.desc')}
      />

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input id="from" type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input id="to" type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          {(from || to) && (
            <Button
              variant="ghost"
              onClick={() => {
                setFrom('')
                setTo('')
              }}
            >
              Reset
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <a
              href={csvHref}
              download="visitor-trends.csv"
              className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors"
            >
              CSV
            </a>
            <Button variant="outline" onClick={openPdf}>
              PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <QueryState q={trends} empty={false} emptyText="">
        {trends.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>
                  {trends.data.from} → {trends.data.to}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-10">
                <Stat label="Total visitors" value={String(trends.data.total)} />
                <Stat label="Avg / active day" value={String(trends.data.avgPerDay)} />
                <Stat
                  label="Peak hour"
                  value={trends.data.peakHour === null ? '—' : hourLabel(trends.data.peakHour)}
                />
                <Stat label="Active days" value={String(trends.data.distinctDays)} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Entries by hour (IST)</CardTitle>
              </CardHeader>
              <CardContent>
                <HourChart byHour={trends.data.byHour} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Visitor type breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <TypeBars byType={trends.data.byType} />
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>

      <OpsSection />
    </div>
  )
}
