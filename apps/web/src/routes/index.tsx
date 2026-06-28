import { createFileRoute, Link } from '@tanstack/react-router'
import { Zap, Server, Route as RouteIcon, Shield, Waves, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/')({ component: App })

const features = [
  { icon: Zap, title: 'Visitor management', description: 'Real-time entry requests with resident approve/deny and full entry/exit logging.' },
  { icon: Shield, title: 'Guard check-in', description: 'Gate workflow for check-in/out, pre-approval codes, and a tamper-evident audit trail.' },
  { icon: RouteIcon, title: 'Pre-approvals', description: 'Residents generate shareable codes; guards redeem them for instant, friction-free entry.' },
  { icon: Server, title: 'Single-tenant', description: 'Each society runs its own isolated database — complete data ownership, no lock-in.' },
  { icon: Waves, title: 'Notice board', description: 'Society-wide announcements with priority and push notifications.' },
  { icon: Sparkles, title: 'Open source', description: 'TanStack Start, Hono on Cloudflare Workers, Drizzle + Neon. Your code, your data.' },
]

function App() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <span className="text-lg font-bold tracking-tight">OpenSociety</span>
        <ThemeToggle />
      </header>

      <section className="px-6 py-16 text-center">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-black tracking-tight md:text-6xl">
            Open<span className="text-cyan-500 dark:text-cyan-400">Society</span>
          </h1>
          <p className="text-muted-foreground mt-4 text-xl">Privacy-first society management platform</p>
          <p className="text-muted-foreground mx-auto mt-3 max-w-2xl">
            An open-source alternative to MyGate and NoBrokerHood for gated communities. You own your data and
            your deployment.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link to="/admin">Open Admin Dashboard</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="https://tanstack.com/start" target="_blank" rel="noopener noreferrer">
                Documentation
              </a>
            </Button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card key={f.title}>
              <CardHeader>
                <f.icon className="size-8 text-cyan-500 dark:text-cyan-400" />
                <CardTitle className="mt-2">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
