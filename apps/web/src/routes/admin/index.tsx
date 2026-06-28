import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Building2, Megaphone, UserCheck, Users } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../../lib/api'
import { PageHeader } from '@/components/admin/ui'
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
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: () => apiClient.listApartments() })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: () => apiClient.listVisitors() })
  const notices = useQuery({ queryKey: ['notices'], queryFn: apiClient.listNotices })
  const pending = useQuery({ queryKey: ['users', 'PENDING'], queryFn: () => apiClient.listUsers('PENDING') })

  const pendingVisitors = visitors.data?.filter((v) => v.status === 'PENDING').length ?? 0

  return (
    <div>
      <PageHeader
        title="Overview"
        description={society.data ? society.data.name : 'Society not configured yet'}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Building2}
          label="Apartments"
          value={apartments.data?.length ?? '—'}
          to="/admin/apartments"
        />
        <StatCard
          icon={Users}
          label="Pending residents"
          value={pending.data?.length ?? '—'}
          to="/admin/residents"
          hint="Awaiting approval"
        />
        <StatCard
          icon={UserCheck}
          label="Visitors"
          value={visitors.data?.length ?? '—'}
          to="/admin/visitors"
          hint={`${pendingVisitors} pending`}
        />
        <StatCard icon={Megaphone} label="Notices" value={notices.data?.length ?? '—'} to="/admin/notices" />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Getting started</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            1. Configure your society in <Link to="/admin/society" className="text-foreground underline">Society</Link>.
          </p>
          <p>
            2. Add units in{' '}
            <Link to="/admin/apartments" className="text-foreground underline">Apartments</Link> (single or bulk).
          </p>
          <p>
            3. Approve residents as they sign up under{' '}
            <Link to="/admin/residents" className="text-foreground underline">Residents</Link>.
          </p>
          <p>
            4. Register gate staff in{' '}
            <Link to="/admin/guards" className="text-foreground underline">Guards</Link>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
