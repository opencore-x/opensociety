import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { formatPaise, collectionRatePct, collectionReportToCsv } from '@opensociety/shared'

import { apiClient } from '../../lib/api'
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

function ReportsPage() {
  const report = useQuery({ queryKey: ['finance-report'], queryFn: apiClient.getFinanceReport })
  const csvHref = report.data
    ? `data:text/csv;charset=utf-8,${encodeURIComponent(collectionReportToCsv(report.data.byMonth))}`
    : '#'

  return (
    <div className="space-y-6">
      <PageHeader title="Financial reports" description="Collection summary, method breakdown, and export." />
      <QueryState q={report} empty={false} emptyText="">
        {report.data && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Collection summary</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-10">
                <Stat label="Total billed" value={formatPaise(report.data.totalBilled)} />
                <Stat label="Total collected" value={formatPaise(report.data.totalCollected)} />
                <Stat
                  label="Collection rate"
                  value={`${collectionRatePct(report.data.totalBilled, report.data.totalCollected)}%`}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Collection by month</CardTitle>
                <a
                  href={csvHref}
                  download="collection-report.csv"
                  className="border-input hover:bg-accent hover:text-accent-foreground inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors aria-disabled:pointer-events-none aria-disabled:opacity-50"
                  aria-disabled={report.data.byMonth.length === 0}
                >
                  Download CSV
                </a>
              </CardHeader>
              <CardContent>
                {report.data.byMonth.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No bills yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Period</TableHead>
                        <TableHead className="text-right">Billed</TableHead>
                        <TableHead className="text-right">Collected</TableHead>
                        <TableHead className="w-48">Collection %</TableHead>
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
                              <div className="flex items-center gap-2">
                                <div className="bg-muted h-2 w-full overflow-hidden rounded">
                                  <div className="h-2 rounded bg-emerald-500" style={{ width: `${Math.min(pct, 100)}%` }} />
                                </div>
                                <span className="text-muted-foreground w-12 shrink-0 text-right text-xs">{pct}%</span>
                              </div>
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
                <CardTitle>Payment method breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {report.data.byMethod.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No payments recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Method</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
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
    </div>
  )
}
