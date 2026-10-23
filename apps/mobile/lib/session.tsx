import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createDemoRuntime, type DemoRuntime } from './demo/runtime'
import type { DemoRole } from './demo/store'

type Session = { mode: 'welcome' | 'live' | 'demo'; demo: DemoRuntime | null; revision: number }
type SessionContextValue = Session & {
  startDemo: (role?: DemoRole) => void
  switchRole: (role: DemoRole) => void
  resetDemo: () => void
  exitDemo: () => void
  openLive: () => void
}
const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children, initialLive = false }: { children: ReactNode; initialLive?: boolean }) {
  const [session, setSession] = useState<Session>({ mode: initialLive ? 'live' : 'welcome', demo: null, revision: 0 })
  const current = useRef(session)
  useEffect(() => () => current.current.demo?.retire(), [])
  function replace(mode: Session['mode'], demo: DemoRuntime | null = null) {
    const previous = current.current
    previous.demo?.retire()
    current.current = { mode, demo, revision: previous.revision + 1 }
    setSession(current.current)
  }
  return <SessionContext.Provider value={{
    ...session,
    startDemo: (role = 'resident') => replace('demo', createDemoRuntime(role)),
    switchRole: role => {
      const demo = current.current.demo
      if (demo && role !== demo.role) replace('demo', createDemoRuntime(role, demo.store))
    },
    resetDemo: () => { if (current.current.demo) replace('demo', createDemoRuntime(current.current.demo.role)) },
    exitDemo: () => replace('welcome'),
    openLive: () => replace('live'),
  }}>{children}</SessionContext.Provider>
}

export function useSession() {
  const session = useContext(SessionContext)
  if (!session) throw new Error('SessionProvider is required.')
  return session
}
