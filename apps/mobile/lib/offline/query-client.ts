import { QueryClient } from '@tanstack/react-query'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'

import { CREATE_VISITOR_KEY } from './mutation-defaults'

const ONE_DAY = 1000 * 60 * 60 * 24
const CREATE_VISITOR_KEY_ID = CREATE_VISITOR_KEY.join('/')

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      // gcTime must outlive maxAge below, else the persister drops queries the
      // cache has already garbage-collected and offline reads go blank.
      gcTime: ONE_DAY,
    },
  },
})

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'opensociety-query-cache',
  throttleTime: 1000,
})

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: ONE_DAY,
  dehydrateOptions: {
    // Persist only queued createVisitor mutations. They have a registered
    // mutationFn (see registerOfflineMutationDefaults) so they can replay after
    // a restart; other paused mutations lack a re-attachable fn and would fail
    // to resume, so we never persist them.
    shouldDehydrateMutation: (mutation) =>
      mutation.state.isPaused && mutation.options.mutationKey?.join('/') === CREATE_VISITOR_KEY_ID,
  },
}
