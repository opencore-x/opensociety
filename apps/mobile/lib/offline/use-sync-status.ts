import { useEffect, useMemo, useState } from 'react'
import { onlineManager, useQueryClient } from '@tanstack/react-query'
import type { CreateVisitorEntry } from '@opensociety/shared'

import { CREATE_VISITOR_KEY } from './mutation-defaults'

const CREATE_VISITOR_KEY_ID = CREATE_VISITOR_KEY.join('/')

function isCreateVisitor(mutationKey: readonly unknown[] | undefined): boolean {
  return mutationKey?.join('/') === CREATE_VISITOR_KEY_ID
}

// Live view of connectivity + how many writes are waiting to sync. `pending`
// counts both queued-while-offline (paused) mutations and ones currently
// in-flight, so the UI can show "Offline — N queued" and "Syncing N…".
export function useSyncStatus(): { isOnline: boolean; pending: number } {
  const queryClient = useQueryClient()
  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline())
  const [pending, setPending] = useState(0)

  useEffect(() => onlineManager.subscribe(setIsOnline), [])

  useEffect(() => {
    const cache = queryClient.getMutationCache()
    const recount = () => {
      setPending(cache.getAll().filter((m) => m.state.isPaused || m.state.status === 'pending').length)
    }
    recount()
    return cache.subscribe(recount)
  }, [queryClient])

  return { isOnline, pending }
}

export type SyncError = {
  mutationId: number
  visitorName: string
  message: string
}

// Queued registrations that ultimately failed to sync (e.g. a rejected write
// once back online), surfaced so the guard can retry or discard them. Retrying
// re-runs the same mutation — the clientId idempotency key makes that safe even
// if the original write had actually reached the server.
export function useSyncErrors(): {
  errors: SyncError[]
  retry: (mutationId: number) => void
  dismiss: (mutationId: number) => void
} {
  const queryClient = useQueryClient()
  const [errors, setErrors] = useState<SyncError[]>([])

  useEffect(() => {
    const cache = queryClient.getMutationCache()
    const recompute = () => {
      const failed = cache
        .getAll()
        .filter((m) => isCreateVisitor(m.options.mutationKey) && m.state.status === 'error')
      setErrors(
        failed.map((m) => ({
          mutationId: m.mutationId,
          visitorName: (m.state.variables as CreateVisitorEntry | undefined)?.visitorName?.trim() || 'Visitor',
          message: (m.state.error as Error | null)?.message ?? 'Failed to sync',
        })),
      )
    }
    recompute()
    return cache.subscribe(recompute)
  }, [queryClient])

  return useMemo(() => {
    const cache = queryClient.getMutationCache()
    const find = (id: number) => cache.getAll().find((m) => m.mutationId === id)
    return {
      errors,
      retry: (id: number) => {
        const m = find(id)
        if (m) void m.execute(m.state.variables)
      },
      dismiss: (id: number) => {
        const m = find(id)
        if (m) cache.remove(m)
      },
    }
  }, [errors, queryClient])
}
