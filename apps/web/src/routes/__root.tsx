import { useEffect } from 'react'
import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { QueryClientProvider } from '@tanstack/react-query'
import { ClerkProvider, useAuth } from '@clerk/tanstack-react-start'

import { getQueryClient } from '../lib/query'
import { setAuthTokenGetter } from '../lib/api'
import { ThemeProvider, themeInitScript } from '../lib/theme'
import { I18nProvider } from '../lib/i18n'
import appCss from '../styles.css?url'

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined

// Registers the Clerk session-token getter with the API client so requests
// carry a Bearer token once the user signs in (see lib/api.ts).
function AuthBridge() {
  const { getToken } = useAuth()
  useEffect(() => {
    setAuthTokenGetter(() => getToken())
    return () => setAuthTokenGetter(null)
  }, [getToken])
  return null
}

// Clerk is optional: without a publishable key the app runs on the dev
// x-user-id fallback, mirroring the API's own conditional auth.
function Providers({ children }: { children: React.ReactNode }) {
  const tree = (
    <ThemeProvider>
      <I18nProvider>
        <QueryClientProvider client={getQueryClient()}>{children}</QueryClientProvider>
      </I18nProvider>
    </ThemeProvider>
  )
  if (!CLERK_PUBLISHABLE_KEY) return tree
  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <AuthBridge />
      {tree}
    </ClerkProvider>
  )
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'OpenSociety',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <HeadContent />
      </head>
      <body>
        <Providers>{children}</Providers>
        <TanStackDevtools
          config={{
            position: 'bottom-right',
          }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
