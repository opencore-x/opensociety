import { Stack } from 'expo-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
})

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'OpenSociety' }} />
        <Stack.Screen name="visitors" options={{ title: 'Visitors' }} />
        <Stack.Screen name="gate" options={{ title: 'Gate' }} />
        <Stack.Screen name="register" options={{ title: 'Register visitor' }} />
      </Stack>
    </QueryClientProvider>
  )
}
