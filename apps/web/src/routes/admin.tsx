import { createFileRoute, Link, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  Home,
  LayoutDashboard,
  Megaphone,
  ShieldCheck,
  Users,
  UserCheck,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { apiClient } from '../lib/api'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/admin')({ component: AdminLayout })

const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/society', label: 'Society', icon: Home },
  { to: '/admin/apartments', label: 'Apartments', icon: Building2 },
  { to: '/admin/residents', label: 'Residents', icon: Users },
  { to: '/admin/guards', label: 'Guards', icon: ShieldCheck },
  { to: '/admin/visitors', label: 'Visitors', icon: UserCheck },
  { to: '/admin/notices', label: 'Notices', icon: Megaphone },
]

function AdminLayout() {
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health, retry: false })

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
            {NAV.map(({ to, label, icon: Icon }) => (
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
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between gap-3 border-b px-6 py-3">
            <nav className="flex gap-1 overflow-x-auto md:hidden">
              {NAV.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  activeOptions={{ exact: to === '/admin' }}
                  className="text-muted-foreground rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap"
                  activeProps={{ className: 'text-foreground' }}
                >
                  {label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <Badge variant={health.isSuccess ? 'default' : 'destructive'}>
                API {health.isLoading ? '…' : health.isSuccess ? 'online' : 'offline'}
              </Badge>
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
