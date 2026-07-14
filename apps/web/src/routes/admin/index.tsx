import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Building2, Megaphone, UserCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { PageHeader } from '@/components/admin/ui'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const Route = createFileRoute('/admin/')({ component: Overview })

function StatCard({
  icon: Icon,
  label,
  value,
  to,
  hint,
}: {
  icon: LucideIcon
  label: string
  value: number | string
  to: string
  hint?: string
}) {
  return (
    <Link to={to} className="block">
      <Card className="hover:border-ring transition-colors">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-muted-foreground text-sm font-medium">{label}</CardTitle>
          <Icon className="text-muted-foreground size-4" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{value}</div>
          {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
        </CardContent>
      </Card>
    </Link>
  )
}

function Overview() {
  const { t } = useT()
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const notices = useQuery({ queryKey: ['notices'], queryFn: () => apiClient.listNotices() })
  const pending = useQuery({ queryKey: ['users', 'PENDING'], queryFn: () => apiClient.listUsers('PENDING') })

  const pendingVisitors = visitors.data?.filter((v) => v.status === 'PENDING').length ?? 0

  return (
    <div>
      <PageHeader
        title={t('nav.overview')}
        description={society.data ? society.data.name : t('overview.notConfigured')}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label={t('nav.apartments')}
          value={apartments.data?.length ?? '—'}
          to="/admin/apartments"
        />
        <StatCard
          icon={Users}
          label={t('overview.pendingResidents')}
          value={pending.data?.length ?? '—'}
          to="/admin/residents"
          hint={t('overview.awaitingApproval')}
        />
        <StatCard
          icon={UserCheck}
          label={t('nav.visitors')}
          value={visitors.data?.length ?? '—'}
          to="/admin/visitors"
          hint={`${pendingVisitors} ${t('overview.pending')}`}
        />
        <StatCard icon={Megaphone} label={t('nav.notices')} value={notices.data?.length ?? '—'} to="/admin/notices" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>{t('overview.gettingStarted')}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p className="text-foreground">
            {t('overview.newHerePrefix')}
            <Button asChild size="sm" className="mx-1 align-middle">
              <Link to="/admin/setup">{t('overview.wizardLink')}</Link>
            </Button>
            {t('overview.newHereSuffix')}
          </p>
          <p>
            {t('overview.step1Prefix')}
            <Link to="/admin/society" className="text-foreground underline">{t('nav.society')}</Link>
            {t('overview.step1Suffix')}
          </p>
          <p>
            {t('overview.step2Prefix')}
            <Link to="/admin/apartments" className="text-foreground underline">{t('nav.apartments')}</Link>
            {t('overview.step2Suffix')}
          </p>
          <p>
            {t('overview.step3Prefix')}
            <Link to="/admin/residents" className="text-foreground underline">{t('nav.residents')}</Link>
            {t('overview.step3Suffix')}
          </p>
          <p>
            {t('overview.step4Prefix')}
            <Link to="/admin/guards" className="text-foreground underline">{t('nav.guards')}</Link>
            {t('overview.step4Suffix')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
