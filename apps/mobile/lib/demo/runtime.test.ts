import { afterEach, describe, expect, it, vi } from 'vitest'
import { onlineManager, QueryClient } from '@tanstack/react-query'
import type { CreateVisitorEntry } from '@opensociety/shared'

import { createDemoRuntime } from './runtime'
import { CREATE_VISITOR_KEY, registerOfflineMutationDefaults } from '../offline/mutation-defaults'

vi.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-999999999999' }))

const runtimes: ReturnType<typeof createDemoRuntime>[] = []
function runtime(role: 'resident' | 'guard' = 'guard') {
  const value = createDemoRuntime(role)
  runtimes.push(value)
  return value
}
afterEach(() => { runtimes.forEach(r => r.retire()); runtimes.length = 0; onlineManager.setOnline(true); vi.unstubAllGlobals() })

describe('demo session isolation', () => {
  it('executes queries and registrations while the device is offline', async () => {
    onlineManager.setOnline(false)
    const demo = runtime()
    const visitors = await demo.queryClient.fetchQuery({ queryKey: ['visitors'], queryFn: () => demo.api.listVisitors() })
    expect(visitors.length).toBeGreaterThan(0)
    const mutation = demo.queryClient.getMutationCache().build(demo.queryClient, { mutationKey: CREATE_VISITOR_KEY })
    await mutation.execute({ apartmentId: demo.store.apartmentId, visitorName: 'Offline demo guest', type: 'GUEST' })
    expect(mutation.state.isPaused).toBe(false)
    expect((await demo.api.listVisitors())[0].visitorName).toBe('Offline demo guest')
  })

  it('never sends a delayed demo write through live mutation defaults after exit', async () => {
    const fetch = vi.fn(() => { throw new Error('Live network forbidden') })
    vi.stubGlobal('fetch', fetch)
    const demo = runtime()
    let release!: () => void
    const hold = new Promise<void>(resolve => { release = resolve })
    const mutation = demo.queryClient.getMutationCache().build(demo.queryClient, {
      mutationKey: CREATE_VISITOR_KEY, onMutate: () => hold,
    })
    const result = mutation.execute({ apartmentId: demo.store.apartmentId, visitorName: 'Delayed demo', type: 'GUEST' } satisfies CreateVisitorEntry)
    const rejected = expect(result).rejects.toThrow('session has ended')
    demo.retire()
    const live = new QueryClient()
    registerOfflineMutationDefaults(live)
    release()
    await rejected
    await live.resumePausedMutations()
    expect(live.getMutationCache().getAll()).toHaveLength(0)
    expect(fetch).not.toHaveBeenCalled()
    live.clear()
  })

  it('preserves data across role switches and resets data and cache for a new demo', async () => {
    const demo = runtime('resident')
    const pending = (await demo.api.listVisitors('PENDING'))[0]
    await demo.api.approveVisitor(pending.id)
    const guard = createDemoRuntime('guard', demo.store)
    runtimes.push(guard)
    demo.retire()
    expect((await guard.api.checkInVisitor(pending.id)).status).toBe('ENTERED')
    await expect(demo.api.listVisitors()).rejects.toThrow('session has ended')
    const fresh = runtime('resident')
    expect((await fresh.api.listVisitors('PENDING'))[0].id).toBe(pending.id)
    expect(fresh.queryClient.getQueryCache().getAll()).toHaveLength(0)
  })
})
