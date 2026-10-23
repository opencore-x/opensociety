import type { CreateVisitorEntry } from '@opensociety/shared'
import { MutationCache, QueryClient } from '@tanstack/react-query'
import { createMobileDemoClient } from './client'
import { createMobileDemoStore, type DemoRole, type MobileApi } from './store'
import { CREATE_VISITOR_KEY } from '../offline/mutation-defaults'

export function createDemoRuntime(role: DemoRole, store = createMobileDemoStore()) {
  let active = true
  const client = createMobileDemoClient(store, role)
  const api = new Proxy(client, {
    get(target, property: keyof MobileApi) {
      const method = target[property]
      return async (...args: unknown[]) => {
        if (!active) throw new Error('This demo session has ended.')
        return Reflect.apply(method, target, args)
      }
    },
  })
  const queryClient: QueryClient = new QueryClient({
    defaultOptions: {
      queries: { networkMode: 'always', retry: false, staleTime: 0 },
      mutations: { networkMode: 'always', retry: false },
    },
    mutationCache: new MutationCache({ onSuccess: () => queryClient.invalidateQueries() }),
  })
  // This cache never uses the live persister or the live mutation defaults.
  // The function captures this session's client even if it executes after exit.
  queryClient.setMutationDefaults(CREATE_VISITOR_KEY, { mutationFn: (body: CreateVisitorEntry) => api.createVisitor(body) })
  return {
    role, store, api, queryClient,
    retire() { active = false; queryClient.clear() },
  }
}
export type DemoRuntime = ReturnType<typeof createDemoRuntime>
