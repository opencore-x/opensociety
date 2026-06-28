import { createFileRoute, Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'
import type { UpdateSocietyConfig } from '@opensociety/shared'
import { apiClient } from '../lib/api'

export const Route = createFileRoute('/admin')({ component: AdminPage })

const inputCls =
  'w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-white text-sm focus:outline-none focus:border-cyan-500'
const btnCls =
  'px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white text-sm font-semibold'

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function State({
  q,
  empty,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; error?: unknown }
  empty?: boolean
  children: ReactNode
}) {
  if (q.isLoading) return <p className="text-gray-400">Loading…</p>
  if (q.isError)
    return <p className="text-rose-400">API unreachable ({String((q.error as Error)?.message ?? 'error')})</p>
  if (empty) return <p className="text-gray-500">Nothing yet.</p>
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
    <input
      className={inputCls}
      placeholder={label}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
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
        <button className={btnCls} disabled={mutation.isPending}>
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
        {mutation.isSuccess && <span className="text-emerald-400 text-sm">Saved ✓</span>}
        {mutation.isError && <span className="text-rose-400 text-sm">Save failed</span>}
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
      className="flex items-center gap-2 mt-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (tower && apartmentNo) mutation.mutate()
      }}
    >
      <input className={inputCls} placeholder="Tower" value={tower} onChange={(e) => setTower(e.target.value)} />
      <input
        className={inputCls}
        placeholder="No."
        value={apartmentNo}
        onChange={(e) => setApartmentNo(e.target.value)}
      />
      <button className={btnCls} disabled={mutation.isPending || !tower || !apartmentNo}>
        Add
      </button>
    </form>
  )
}

function AdminPage() {
  const health = useQuery({ queryKey: ['health'], queryFn: apiClient.health })
  const society = useQuery({ queryKey: ['society'], queryFn: apiClient.getSociety })
  const apartments = useQuery({ queryKey: ['apartments'], queryFn: apiClient.listApartments })
  const visitors = useQuery({ queryKey: ['visitors'], queryFn: apiClient.listVisitors })

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-white">
            Admin <span className="text-cyan-400">Dashboard</span>
          </h1>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`px-3 py-1 rounded-full ${
                health.isSuccess ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
            >
              API: {health.isLoading ? '…' : health.isSuccess ? 'online' : 'offline'}
            </span>
            <Link to="/" className="text-gray-400 hover:text-white">
              ← Home
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Panel title="Society setup">
            <State q={society}>
              <SocietyForm key={society.data?.id ?? 'new'} initial={society.data ?? EMPTY_SOCIETY} />
            </State>
          </Panel>

          <Panel title={`Apartments (${apartments.data?.length ?? 0})`}>
            <State q={apartments} empty={apartments.isSuccess && apartments.data?.length === 0}>
              <ul className="text-gray-300 text-sm space-y-1 max-h-40 overflow-auto">
                {apartments.data?.slice(0, 50).map((a) => (
                  <li key={a.id}>
                    {a.tower}-{a.apartmentNo}
                    {a.bhkType ? ` · ${a.bhkType}` : ''}
                  </li>
                ))}
              </ul>
            </State>
            <AddApartmentForm />
          </Panel>

          <Panel title={`Visitors (${visitors.data?.length ?? 0})`}>
            <State q={visitors} empty={visitors.isSuccess && visitors.data?.length === 0}>
              <ul className="text-gray-300 text-sm space-y-2 max-h-64 overflow-auto">
                {visitors.data?.slice(0, 50).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <span>
                      {v.visitorName} <span className="text-gray-500">({v.type})</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-cyan-300">{v.status}</span>
                  </li>
                ))}
              </ul>
            </State>
          </Panel>

          <Panel title="Connection">
            <p className="text-gray-400 text-sm">
              API base:{' '}
              <code className="text-cyan-400">{import.meta.env.VITE_API_URL ?? 'http://localhost:8787'}</code>
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Set <code>VITE_API_URL</code> and run the API (with a Neon <code>DATABASE_URL</code>) to persist
              changes.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
