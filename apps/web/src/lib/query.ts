import { QueryClient } from '@tanstack/react-query'

// One client per browser session; a fresh one per SSR render.
let browserQueryClient: QueryClient | undefined

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    return new QueryClient({ defaultOptions: { queries: { retry: false } } })
  }
  if (!browserQueryClient) {
    browserQueryClient = new QueryClient({
      defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
    })
  }
  return browserQueryClient
}
