import { useCallback, useSyncExternalStore } from 'react'
import { onlineManager, useMutationState, useQueryClient } from '@tanstack/react-query'
import type { CreateVisitorEntry } from '@opensociety/shared'

import { CREATE_VISITOR_KEY } from './mutation-defaults'

// Render-safe read of connectivity via React's external-store machinery, so a
// network flip never triggers a setState mid-render.
function useOnline(): boolean {
  return useSyncExternalStore(
    (cb) => onlineManager.subscribe(cb),
    () => onlineManager.isOnline(),
    () => true,
  )
}

// Live view of connectivity + how many registrations are waiting to sync.
// `pending` counts queued-while-offline (paused) and in-flight createVisitor
// mutations, so the UI can show "Offline — N queued" and "Syncing N…".
export function useSyncStatus(): { isOnline: boolean; pending: number } {
  const isOnline = useOnline()
  const pending = useMutationState({
    filters: { mutationKey: [...CREATE_VISITOR_KEY], exact: true },
    select: (m) => m.state.isPaused || m.state.status === 'pending',
  }).filter(Boolean).length
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

  const errors = useMutationState<SyncError>({
    filters: { mutationKey: [...CREATE_VISITOR_KEY], exact: true, status: 'error' },
    select: (m) => ({
      mutationId: m.mutationId,
      visitorName: (m.state.variables as CreateVisitorEntry | undefined)?.visitorName?.trim() || 'Visitor',
      message: (m.state.error as Error | null)?.message ?? 'Failed to sync',
    }),
  })

  const find = useCallback(
    (id: number) => queryClient.getMutationCache().getAll().find((m) => m.mutationId === id),
    [queryClient],
  )
  const retry = useCallback(
    (id: number) => {
      const m = find(id)
      if (m) void m.execute(m.state.variables)
    },
    [find],
  )
  const dismiss = useCallback(
    (id: number) => {
      const m = find(id)
      if (m) queryClient.getMutationCache().remove(m)
    },
    [find, queryClient],
  )

  return { errors, retry, dismiss }
}
