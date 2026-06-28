import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { UpdateSocietyConfig } from '@opensociety/shared'

import { apiClient } from '../lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'

export const Route = createFileRoute('/admin')({ component: AdminPage })

function State({
  q,
  empty,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; error?: unknown }
  empty?: boolean
  children: ReactNode
}) {
  if (q.isLoading) return <p className="text-muted-foreground text-sm">Loading…</p>
  if (q.isError)
    return (
      <p className="text-destructive text-sm">
        API unreachable ({String((q.error as Error)?.message ?? 'error')})
      </p>
    )
  if (empty) return <p className="text-muted-foreground text-sm">Nothing yet.</p>
  return <>{children}</>
}

const EMPTY_SOCIETY: UpdateSocietyConfig = { name: '', address: '', city: '', state: '', pincode: '' }

function SocietyForm({ initial }: { initial: UpdateSocietyConfig }) {
  const qc = useQueryClient()
  const [form, setForm] = useState<UpdateSocietyConfig>(initial)
  const mutation = useMutation({
    mutationFn: () => apiClient.updateSociety(form),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['society'] }),
  })

  const field = (key: keyof UpdateSocietyConfig, label: string) => (
    <Input placeholder={label} value={form[key]} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
  )

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        mutation.mutate()
      }}
    >
      {field('name', 'Society name')}
      {field('address', 'Address')}
      <div className="grid grid-cols-3 gap-2">
        {field('city', 'City')}
        {field('state', 'State')}
        {field('pincode', 'Pincode')}
      </div>
      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </Button>
        {mutation.isSuccess && <span className="text-sm text-emerald-600 dark:text-emerald-400">Saved ✓</span>}
        {mutation.isError && <span className="text-destructive text-sm">Save failed</span>}
      </div>
    </form>
  )
}

function AddApartmentForm() {
  const qc = useQueryClient()
  const [tower, setTower] = useState('')
  const [apartmentNo, setApartmentNo] = useState('')
  const mutation = useMutation({
    mutationFn: () => apiClient.createApartment({ tower, apartmentNo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['apartments'] })
      setTower('')
      setApartmentNo('')
    },
  })

  return (
    <form
      className="mt-4 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (tower && apartmentNo) mutation.mutate()
      }}
    >
      <Input placeholder="Tower" value={tower} onChange={(e) => setTower(e.target.value)} />
      <Input placeholder="No." value={apartmentNo} onChange={(e) => setApartmentNo(e.target.value)} />
      <Button type="submit" disabled={mutation.isPending || !tower || !apartmentNo}>
        Add
      </Button>
    </form>
  )
}

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  APPROVED: 'default',
  ENTERED: 'default',
  PENDING: 'secondary',
  DENIED: 'destructive',
  CANCELLED: 'destructive',
  EXPIRED: 'outline',
  EXITED: 'outline',
}

function AdminPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health })
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: apiClient.listVisitors })

  return (
    <div className="bg-background text-foreground min-h-screen p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-black tracking-tight">Admin Dashboard</h1>
          <div className="flex items-center gap-3">
            <Badge variant={health.isSuccess ? 'default' : 'destructive'}>
              API: {health.isLoading ? '…' : health.isSuccess ? 'online' : 'offline'}
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">← Home</Link>
            </Button>
            <ThemeToggle />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Society setup</CardTitle>
            </CardHeader>
            <CardContent>
              <State q={society}>
                <SocietyForm key={society.data?.id ?? 'new'} initial={society.data ?? EMPTY_SOCIETY} />
              </State>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Apartments ({apartments.data?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <State q={apartments} empty={apartments.isSuccess && apartments.data?.length === 0}>
                <ul className="text-muted-foreground max-h-40 space-y-1 overflow-auto text-sm">
                  {apartments.data?.slice(0, 50).map((a) => (
                    <li key={a.id}>
                      <span className="text-foreground font-medium">
                        {a.tower}-{a.apartmentNo}
                      </span>
                      {a.bhkType ? ` · ${a.bhkType}` : ''}
                    </li>
                  ))}
                </ul>
              </State>
              <AddApartmentForm />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Visitors ({visitors.data?.length ?? 0})</CardTitle>
            </CardHeader>
            <CardContent>
              <State q={visitors} empty={visitors.isSuccess && visitors.data?.length === 0}>
                <ul className="max-h-64 space-y-2 overflow-auto text-sm">
                  {visitors.data?.slice(0, 50).map((v) => (
                    <li key={v.id} className="flex items-center justify-between gap-3">
                      <span>
                        {v.visitorName} <span className="text-muted-foreground">({v.type})</span>
                      </span>
                      <Badge variant={STATUS_VARIANT[v.status] ?? 'outline'}>{v.status}</Badge>
                    </li>
                  ))}
                </ul>
              </State>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Connection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">
                API base: <code className="text-foreground">{import.meta.env.VITE_API_URL ?? 'http://localhost:8787'}</code>
              </p>
              <p className="text-muted-foreground text-xs">
                Set <code>VITE_API_URL</code> and run the API (with a Neon <code>DATABASE_URL</code>) to persist changes.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
