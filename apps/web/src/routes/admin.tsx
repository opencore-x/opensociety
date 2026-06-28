import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { apiClient } from '../lib/api'

export const Route = createFileRoute('/admin')({ component: AdminPage })

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

function State({ q, empty, children }: { q: { isLoading: boolean; isError: boolean; error?: unknown }; empty?: boolean; children: ReactNode }) {
  if (q.isLoading) return <p className="text-gray-400">Loading…</p>
  if (q.isError)
    return <p className="text-rose-400">API unreachable ({String((q.error as Error)?.message ?? 'error')})</p>
  if (empty) return <p className="text-gray-500">Nothing yet.</p>
  return <>{children}</>
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
                health.isSuccess
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-rose-500/20 text-rose-300'
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
          <Panel title="Society">
            <State q={society} empty={society.isSuccess && !society.data}>
              {society.data && (
                <div className="text-gray-300 text-sm space-y-1">
                  <p className="text-white font-medium">{society.data.name}</p>
                  <p>
                    {society.data.address}, {society.data.city}, {society.data.state} -{' '}
                    {society.data.pincode}
                  </p>
                </div>
              )}
            </State>
          </Panel>

          <Panel title={`Apartments (${apartments.data?.length ?? 0})`}>
            <State q={apartments} empty={apartments.isSuccess && apartments.data?.length === 0}>
              <ul className="text-gray-300 text-sm space-y-1 max-h-48 overflow-auto">
                {apartments.data?.slice(0, 50).map((a) => (
                  <li key={a.id}>
                    {a.tower}-{a.apartmentNo}
                    {a.bhkType ? ` · ${a.bhkType}` : ''}
                  </li>
                ))}
              </ul>
            </State>
          </Panel>

          <Panel title={`Visitors (${visitors.data?.length ?? 0})`}>
            <State q={visitors} empty={visitors.isSuccess && visitors.data?.length === 0}>
              <ul className="text-gray-300 text-sm space-y-2 max-h-64 overflow-auto">
                {visitors.data?.slice(0, 50).map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-3">
                    <span>
                      {v.visitorName} <span className="text-gray-500">({v.type})</span>
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-cyan-300">
                      {v.status}
                    </span>
                  </li>
                ))}
              </ul>
            </State>
          </Panel>

          <Panel title="Connection">
            <p className="text-gray-400 text-sm">
              API base: <code className="text-cyan-400">{import.meta.env.VITE_API_URL ?? 'http://localhost:8787'}</code>
            </p>
            <p className="text-gray-500 text-xs mt-2">
              Set <code>VITE_API_URL</code> and run the API (with a Neon <code>DATABASE_URL</code>) to see live data.
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
