import { useEffect, useState } from 'react'
import { onlineManager, useQueryClient } from '@tanstack/react-query'

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
