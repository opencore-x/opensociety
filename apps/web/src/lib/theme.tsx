import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark'
type ThemeContextValue = { theme: Theme; setTheme: (t: Theme) => void; toggle: () => void }

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Runs before React hydration to set the .dark class with no flash of the wrong theme.
export const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');if(!t)t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark')
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')

  // Sync React state with whatever the init script already applied.
  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const initial =
      stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setThemeState(initial)
    applyTheme(initial)
  }, [])

  const setTheme = (t: Theme) => {
    setThemeState(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}
