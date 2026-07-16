import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { formatPaise, collectionRatePct, collectionReportToCsv, towerCollectionToCsv } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
import { useT } from '@/lib/i18n'
import { PageHeader, QueryState } from '@/components/admin/ui'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Auth-fetch a report export and open it (the browser downloads attachments).
function ExportButtons({ path, formats = ['pdf', 'xlsx', 'csv'] }: { path: string; formats?: string[] }) {
  const labels: Record<string, string> = { pdf: 'PDF', xlsx: 'Excel', csv: 'CSV' }
  const open = async (fmt: string) => {
    const url = await apiClient.reportExportObjectUrl(`${path}${path.includes('?') ? '&' : '?'}format=${fmt}`)
    window.open(url, '_blank')
  }
  return (
    <div className="flex gap-2">
      {formats.map((f) => (
        <Button key={f} size="sm" variant="outline" onClick={() => open(f)}>
          {labels[f] ?? f}
        </Button>
      ))}
    </div>
  )
}

// Statutory financial statements (#98) with xlsx/csv/pdf export (#99).
function StatementsSection() {
  const { t } = useT()
  const tb = useQuery({ queryKey: ['trial-balance'], queryFn: () => apiClient.getTrialBalance() })
  const ie = useQuery({ queryKey: ['income-expenditure'], queryFn: () => apiClient.getIncomeExpenditure() })
  const bs = useQuery({ queryKey: ['balance-sheet'], queryFn: () => apiClient.getBalanceSheet() })
  const rp = useQuery({ queryKey: ['receipts-payments'], queryFn: () => apiClient.getReceiptsPayments() })

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t('page.reports.statements')}</h2>
        <Button size="sm" variant="outline" onClick={async () => window.open(await apiClient.reportExportObjectUrl('/reports/tally-export'), '_blank')}>
          {t('page.reports.exportTally')}
        </Button>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            {t('page.reports.balanceSheet')}{' '}
            {bs.data && (
              <span className={bs.data.balanced ? 'text-emerald-600 text-xs' : 'text-destructive text-xs'}>
                · {bs.data.balanced ? t('page.reports.balanced') : t('page.reports.notBalanced')}
              </span>
            )}
          </CardTitle>
          <ExportButtons path="/reports/balance-sheet" />
        </CardHeader>
        <CardContent>
          {bs.data ? (
            <Table>
              <TableBody>
                <SectionRows label={t('page.reports.assets')} rows={bs.data.assets} />
                <TotalRow label={t('page.reports.total')} amount={bs.data.totalAssets} />
                <SectionRows label={t('page.reports.liabilities')} rows={bs.data.liabilities} />
                <SectionRows label={t('page.reports.funds')} rows={bs.data.funds} />
                <MoneyRow label={t('page.reports.surplus')} amount={bs.data.currentSurplus} />
                <TotalRow label={t('page.reports.total')} amount={bs.data.totalLiabilitiesAndFunds} />
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-sm">{t('page.reports.setupNeeded')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('page.reports.incomeExpenditure')}</CardTitle>
          <ExportButtons path="/reports/income-expenditure" />
        </CardHeader>
        <CardContent>
          {ie.data && (
            <Table>
              <TableBody>
                <SectionRows label={t('page.reports.income')} rows={ie.data.income} />
                <MoneyRow label={t('page.reports.mutualIncome')} amount={ie.data.mutualIncome} />
                <MoneyRow label={t('page.reports.taxableIncome')} amount={ie.data.nonMutualIncome} />
                <SectionRows label={t('page.reports.expenditure')} rows={ie.data.expense} />
                <TotalRow label={t('page.reports.surplus')} amount={ie.data.surplus} />
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{t('page.reports.receiptsPayments')}</CardTitle>
          <ExportButtons path="/reports/receipts-payments" />
        </CardHeader>
        <CardContent>
          {rp.data && (
            <Table>
              <TableBody>
                <MoneyRow label={t('page.reports.opening')} amount={rp.data.openingBalance} />
                <SectionRows label={t('page.reports.receipts')} rows={rp.data.receipts} />
                <SectionRows label={t('page.reports.payments')} rows={rp.data.payments} />
                <TotalRow label={t('page.reports.closing')} amount={rp.data.closingBalance} />
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>
            {t('page.reports.trialBalance')}{' '}
            {tb.data && (
              <span className={tb.data.balanced ? 'text-emerald-600 text-xs' : 'text-destructive text-xs'}>
                · {tb.data.balanced ? t('page.reports.balanced') : t('page.reports.notBalanced')}
              </span>
            )}
          </CardTitle>
          <ExportButtons path="/reports/trial-balance" />
        </CardHeader>
        <CardContent>
          {tb.data && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('page.reports.account')}</TableHead>
                  <TableHead className="text-right">{t('page.reports.debit')}</TableHead>
                  <TableHead className="text-right">{t('page.reports.credit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tb.data.rows.map((r) => (
                  <TableRow key={r.code}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-right">{r.debit ? formatPaise(r.debit) : ''}</TableCell>
                    <TableCell className="text-right">{r.credit ? formatPaise(r.credit) : ''}</TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell className="font-semibold">{t('page.reports.total')}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPaise(tb.data.totalDebit)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatPaise(tb.data.totalCredit)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}

function SectionRows({ label, rows }: { label: string; rows: { code: string; name: string; amount: number }[] }) {
  return (
    <>
      <TableRow>
        <TableCell className="text-muted-foreground text-xs font-semibold uppercase" colSpan={2}>
          {label}
        </TableCell>
      </TableRow>
      {rows.map((r) => (
        <TableRow key={r.code}>
          <TableCell className="pl-6">{r.name}</TableCell>
          <TableCell className="text-right">{formatPaise(r.amount)}</TableCell>
        </TableRow>
      ))}
    </>
  )
}

function MoneyRow({ label, amount }: { label: string; amount: number }) {
  return (
    <TableRow>
      <TableCell>{label}</TableCell>
      <TableCell className="text-right">{formatPaise(amount)}</TableCell>
    </TableRow>
  )
}

function TotalRow({ label, amount }: { label: string; amount: number }) {
  return (
    <TableRow>
      <TableCell className="font-semibold">{label}</TableCell>
      <TableCell className="text-right font-semibold">{formatPaise(amount)}</TableCell>
    </TableRow>
  )
}

// Aging of outstanding dues (#100) with per-flat breakdown.
function AgingSection() {
  const { t } = useT()
  const q = useQuery({ queryKey: ['aging'], queryFn: () => apiClient.getAging() })
  const buckets = (['0-30', '31-60', '61-90', '90+'] as const)
  if (!q.data) return null
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>{t('page.reports.agingTitle')}</CardTitle>
        <ExportButtons path="/bills/dues" formats={['xlsx', 'csv']} />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {buckets.map((b) => (
            <div key={b} className="space-y-1">
              <p className="text-muted-foreground text-xs">{b} days</p>
              <p className="text-xl font-semibold">{formatPaise(q.data.buckets[b])}</p>
            </div>
          ))}
        </div>
        {q.data.byApartment.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('page.reports.flat')}</TableHead>
                {buckets.map((b) => (
                  <TableHead key={b} className="text-right">{b}</TableHead>
                ))}
                <TableHead className="text-right">{t('page.reports.outstanding')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {q.data.byApartment.map((r) => (
                <TableRow key={r.apartmentId}>
                  <TableCell className="font-medium">{r.apartment}</TableCell>
                  {buckets.map((b) => (
                    <TableCell key={b} className="text-right">{r.buckets[b] ? formatPaise(r.buckets[b]) : ''}</TableCell>
                  ))}
                  <TableCell className="text-right font-semibold">{formatPaise(r.outstanding)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

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
      <StatementsSection />
      <AgingSection />
      <AnalyticsSection />
    </div>
  )
}
