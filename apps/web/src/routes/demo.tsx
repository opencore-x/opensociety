import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider, MutationCache, useIsMutating } from '@tanstack/react-query'
import { AdminLayout } from './admin'
import { resetDemoClient } from '@/lib/demo/client'
import { useT } from '@/lib/i18n'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/demo')({
  ssr: false,
  component: DemoLayout,
  head: () => ({ meta: [{ title: 'Try OpenSociety | Interactive demo' }, { name: 'robots', content: 'noindex' }] }),
})

function newDemoQueryClient() {
  const client: QueryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 }, mutations: { retry: false } },
    mutationCache: new MutationCache({ onSuccess: () => { void client.invalidateQueries() } }),
  })
  return client
}

function DemoLayout() {
  const { t } = useT()
  const [session, setSession] = useState(() => ({ client: newDemoQueryClient(), revision: 0 }))
  const [resetting, setResetting] = useState(false)
  const mutating = useIsMutating(undefined, session.client)
  const reset = async () => {
    if (session.client.isMutating()) return
    setResetting(true)
    await session.client.cancelQueries()
    session.client.clear()
    resetDemoClient()
    setSession({ client: newDemoQueryClient(), revision: session.revision + 1 })
    setResetting(false)
  }
  return (
    <QueryClientProvider client={session.client} key={session.revision}>
      <div className="border-b border-cyan-200 bg-cyan-50 px-6 py-3 text-cyan-950 dark:border-cyan-900 dark:bg-cyan-950 dark:text-cyan-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold">{t('demo.title')}</p>
            <p className="mt-1 text-sm">{t('demo.description')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <Button variant="outline" size="sm" onClick={reset} disabled={resetting || mutating > 0}>{t('demo.reset')}</Button>
            <a href="/" className="text-sm font-medium underline">{t('demo.exit')}</a>
          </div>
        </div>
      </div>
      <AdminLayout />
    </QueryClientProvider>
  )
}
