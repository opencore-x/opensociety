import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { formatPaise, collectionRatePct, collectionReportToCsv, towerCollectionToCsv } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export const Route = createFileRoute('/admin/reports')({ component: ReportsPage })

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  )
}

function csvDataHref(csv: string): string {
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

function RateBar({ pct }: { pct: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="bg-muted h-2 w-full overflow-hidden rounded">
        <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">{pct}%</span>
    </div>
  )
}

function AnalyticsSection() {
  const { t } = useT()
  const q = useQuery({ queryKey: ['collection-analytics'], queryFn: apiClient.getCollectionAnalytics })
  const data = q.data
  if (!data) return null
  const { payers } = data

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('page.reports.collectionEfficiency')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-10">
          <Stat label={t('page.reports.overallRate')} value={`${data.overallRatePct}%`} />
          <Stat label={t('page.reports.paidInFull')} value={`${data.fullyPaidPct}%`} />
          <Stat
            label={t('page.reports.avgDaysToPay')}
            value={payers.avgDaysToPay === null ? '—' : `${payers.avgDaysToPay > 0 ? '+' : ''}${payers.avgDaysToPay}d`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('page.reports.collectionByTower')}</CardTitle>
          <a
            href={csvDataHref(towerCollectionToCsv(data.byTower))}
            download="collection-by-tower.csv"
            className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
            aria-disabled={data.byTower.length === 0}
          >
            {t('common.downloadCsv')}
          </a>
        </CardHeader>
        <CardContent>
          {data.byTower.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t('common.noBillsYet')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.tower')}</TableHead>
                  <TableHead className="text-right">{t('page.billing.billed')}</TableHead>
                  <TableHead className="text-right">{t('page.reports.collected')}</TableHead>
                  <TableHead className="w-48">{t('page.reports.collectionPct')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byTower.map((row) => (
                  <TableRow key={row.tower}>
                    <TableCell className="font-medium">{row.tower}</TableCell>
                    <TableCell className="text-right">{formatPaise(row.billed)}</TableCell>
                    <TableCell className="text-right">{formatPaise(row.collected)}</TableCell>
                    <TableCell>
                      <RateBar pct={collectionRatePct(row.billed, row.collected)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('page.reports.payerPatterns')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-10">
          <Stat label={t('page.reports.early')} value={String(payers.early)} />
          <Stat label={t('page.reports.onTime')} value={String(payers.onTime)} />
          <Stat label={t('page.reports.late')} value={String(payers.late)} />
          <Stat label={t('page.billing.outstanding')} value={String(payers.outstanding)} />
        </CardContent>
      </Card>
    </>
  )
}

function ReportsPage() {
  const { t } = useT()
  const report = useQuery({ queryKey: ['finance-report'], queryFn: apiClient.getFinanceReport })
  const csvHref = report.data
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(collectionReportToCsv(report.data.byMonth))}`
    : '#'

  return (
    <div className="space-y-6">
      <PageHeader title={t('page.reports.title')} description={t('page.reports.desc')} />
      <QueryState q={report} empty={false} emptyText="">
        {report.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>{t('page.reports.collectionSummary')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-10">
                <Stat label={t('page.reports.totalBilled')} value={formatPaise(report.data.totalBilled)} />
                <Stat label={t('page.reports.totalCollected')} value={formatPaise(report.data.totalCollected)} />
                <Stat
                  label={t('page.reports.collectionRate')}
                  value={`${collectionRatePct(report.data.totalBilled, report.data.totalCollected)}%`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>{t('page.reports.collectionByMonth')}</CardTitle>
                <a
                  href={csvHref}
                  download="collection-report.csv"
                  className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  aria-disabled={report.data.byMonth.length === 0}
                >
                  {t('common.downloadCsv')}
                </a>
              </CardHeader>
              <CardContent>
                {report.data.byMonth.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('common.noBillsYet')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.period')}</TableHead>
                        <TableHead className="text-right">{t('page.billing.billed')}</TableHead>
                        <TableHead className="text-right">{t('page.reports.collected')}</TableHead>
                        <TableHead className="w-48">{t('page.reports.collectionPct')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.data.byMonth.map((r) => {
                        const pct = collectionRatePct(r.billed, r.collected)
                        return (
                          <TableRow key={r.period}>
                            <TableCell className="font-medium">{r.period}</TableCell>
                            <TableCell className="text-right">{formatPaise(r.billed)}</TableCell>
                            <TableCell className="text-right">{formatPaise(r.collected)}</TableCell>
                            <TableCell>
                              <RateBar pct={pct} />
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('page.reports.methodBreakdown')}</CardTitle>
              </CardHeader>
              <CardContent>
                {report.data.byMethod.length === 0 ? (
                  <p className="text-muted-foreground text-sm">{t('page.reports.noPayments')}</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('common.method')}</TableHead>
                        <TableHead className="text-right">{t('page.reports.amount')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.data.byMethod.map((m) => (
                        <TableRow key={m.method}>
                          <TableCell className="font-medium">{m.method}</TableCell>
                          <TableCell className="text-right">{formatPaise(m.amount)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </QueryState>
      <AnalyticsSection />
    </div>
  )
}
