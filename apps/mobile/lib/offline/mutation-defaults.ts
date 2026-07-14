import type { QueryClient } from '@tanstack/react-query'
import type { CreateVisitorEntry, VisitorEntry } from '@opensociety/shared'

import { apiClient } from '../../api/client'
import { buildOptimisticVisitor } from './optimistic'

// A stable mutation key lets paused (offline-queued) mutations reattach to this
// mutationFn after an app restart — a persisted mutation only stores its key and
// variables, not its function.
export const CREATE_VISITOR_KEY = ['visitors', 'create'] as const

const VISITORS_KEY = ['visitors'] as const

type CreateVisitorContext = {
  previous?: VisitorEntry[]
  optimisticId: string
}

// Register the offline-capable createVisitor mutation on the shared client.
// onMutate runs immediately (even while offline, before the mutation pauses), so
// the guard sees the new entry at the gate the instant they hit register. Call
// once at startup, before rendering.
export function registerOfflineMutationDefaults(queryClient: QueryClient) {
  queryClient.setMutationDefaults(CREATE_VISITOR_KEY, {
    mutationFn: (vars: CreateVisitorEntry) => apiClient.createVisitor(vars),
    // Attempt the write even while offline; on network failure it pauses and
    // retries on reconnect rather than surfacing an error to the guard.
    networkMode: 'offlineFirst',
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
    onMutate: async (vars: CreateVisitorEntry): Promise<CreateVisitorContext> => {
      await queryClient.cancelQueries({ queryKey: VISITORS_KEY })
      const previous = queryClient.getQueryData<VisitorEntry[]>(VISITORS_KEY)
      const optimistic = buildOptimisticVisitor(vars)
      queryClient.setQueryData<VisitorEntry[]>(VISITORS_KEY, (old) => {
        const list = old ?? []
        // A manual retry replays the same clientId — replace the prior optimistic
        // row in place rather than stacking a duplicate.
        const idx = vars.clientId ? list.findIndex((v) => v.clientId === vars.clientId) : -1
        if (idx >= 0) {
          const next = list.slice()
          next[idx] = optimistic
          return next
        }
        return [optimistic, ...list]
      })
      return { previous, optimisticId: optimistic.id }
    },
    onError: (_err, _vars, context) => {
      const ctx = context as CreateVisitorContext | undefined
      if (ctx?.previous) queryClient.setQueryData(VISITORS_KEY, ctx.previous)
    },
    onSettled: () => {
      // Reconcile the optimistic entry with the server's real row once online.
      queryClient.invalidateQueries({ queryKey: VISITORS_KEY })
    },
  })
}
