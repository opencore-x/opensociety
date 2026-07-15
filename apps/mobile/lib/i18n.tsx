// Dictionaries live in @opensociety/shared (single source of truth, shared with
// the web app — this resolves the earlier "option B" TODO). This module is just
// the React Native provider + hook, with AsyncStorage persistence.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { type Language, translate, mobileResources } from '@opensociety/shared'

export type { Language }

type I18nContextValue = { language: Language; setLanguage: (l: Language) => void; t: (key: string) => string }

const I18nContext = createContext<I18nContextValue | null>(null)
const STORAGE_KEY = 'opensociety-lang'

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')

  // Load the stored preference after first render (async on native). Until it
  // resolves the UI shows English; untranslated keys also fall back to English.
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === 'hi' || stored === 'en') setLanguageState(stored)
      })
      .catch(() => {})
  }, [])

  const setLanguage = (l: Language) => {
    setLanguageState(l)
    AsyncStorage.setItem(STORAGE_KEY, l).catch(() => {})
  }

  const t = (key: string) => translate(mobileResources, language, key)

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}
