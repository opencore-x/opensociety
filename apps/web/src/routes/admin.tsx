import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart3,
  Building2,
  Car,
  Clock,
  HeartHandshake,
  Home,
  LayoutDashboard,
  Megaphone,
  Receipt,
  ShieldCheck,
  Wallet,
  SquareParking,
  Ticket,
  TrendingUp,
  Users,
  UserCheck,
  Wrench,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../lib/api'
import { AuthControls, CLERK_ENABLED } from '@/components/auth-controls'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({ component: AdminLayout })

const NAV: { to: string; tKey: string; icon: LucideIcon }[] = [
  { to: '/admin', tKey: 'nav.overview', icon: LayoutDashboard },
  { to: '/admin/society', tKey: 'nav.society', icon: Home },
  { to: '/admin/apartments', tKey: 'nav.apartments', icon: Building2 },
  { to: '/admin/residents', tKey: 'nav.residents', icon: Users },
  { to: '/admin/guards', tKey: 'nav.guards', icon: ShieldCheck },
  { to: '/admin/duty', tKey: 'nav.duty', icon: Clock },
  { to: '/admin/house-help', tKey: 'nav.houseHelp', icon: HeartHandshake },
  { to: '/admin/vehicles', tKey: 'nav.vehicles', icon: Car },
  { to: '/admin/parking', tKey: 'nav.parking', icon: SquareParking },
  { to: '/admin/visitors', tKey: 'nav.visitors', icon: UserCheck },
  { to: '/admin/pre-approvals', tKey: 'nav.preApprovals', icon: Ticket },
  { to: '/admin/tickets', tKey: 'nav.tickets', icon: Wrench },
  { to: '/admin/billing', tKey: 'nav.billing', icon: Receipt },
  { to: '/admin/expenses', tKey: 'nav.expenses', icon: Wallet },
  { to: '/admin/reports', tKey: 'nav.reports', icon: BarChart3 },
  { to: '/admin/analytics', tKey: 'nav.analytics', icon: TrendingUp },
  { to: '/admin/notices', tKey: 'nav.notices', icon: Megaphone },
]

function AdminLayout() {
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false })
  const { t } = useT()

  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl">
        <aside className="bg-card hidden w-60 shrink-0 flex-col border-r p-4 md:flex">
          <Link to="/" className="mb-6 flex items-center gap-2 px-2">
            <span className="text-lg font-bold tracking-tight">
              Open<span className="text-cyan-500 dark:text-cyan-400">Society</span>
            </span>
          </Link>
          <nav className="flex flex-col gap-1">
            {NAV.map(({ to, tKey, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                activeOptions={{ exact: to === '/admin' }}
                className={cn(
                  'text-muted-foreground hover:bg-accent hover:text-accent-foreground flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                )}
                activeProps={{ className: 'bg-accent text-accent-foreground' }}
              >
                <Icon className="size-4" />
                {t(tKey)}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
            <nav className="flex gap-1 overflow-x-auto md:hidden">
              {NAV.map(({ to, tKey }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === '/admin' }}
                  className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap"
                  activeProps={{ className: 'text-foreground' }}
                >
                  {t(tKey)}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant={health.isSuccess ? 'default' : 'destructive'}>
                {t('header.api')}{' '}
                {health.isLoading ? '…' : health.isSuccess ? t('header.apiOnline') : t('header.apiOffline')}
              </Badge>
              <LanguageSwitcher />
              {CLERK_ENABLED && <AuthControls />}
              <ThemeToggle />
            </div>
          </header>

          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
