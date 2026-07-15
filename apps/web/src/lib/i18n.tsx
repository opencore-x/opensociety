import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { type Language, translate, webResources } from '@opensociety/shared'

// Dictionaries live in @opensociety/shared (single source of truth, shared with
// the mobile app). This module is just the web React provider + hook.
export type { Language }

type I18nContextValue = { language: Language; setLanguage: (l: Language) => void; t: (key: string) => string }

const I18nContext = createContext<I18nContextValue | null>(null)
const STORAGE_KEY = 'lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Apply the stored preference on the client after the (English) first render.
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Language | null
    if (stored === 'hi' || stored === 'en') {
      setLanguageState(stored)
      document.documentElement.lang = stored
    }
  }, [])

  const setLanguage = (l: Language) => {
    setLanguageState(l)
    localStorage.setItem(STORAGE_KEY, l)
    document.documentElement.lang = l
  }

  const t = (key: string) => translate(webResources, language, key)

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within <I18nProvider>')
  return ctx
}
