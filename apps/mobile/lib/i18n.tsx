// TODO(i18n option B): this en/hi dictionary duplicates the web app's. Later,
// consolidate both into @opensociety/shared as the single source of truth and
// have web + mobile import it. Kept separate for now to ship mobile coverage
// without touching web.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'

export type Language = 'en' | 'hi'
type Dict = Record<string, string>

const en: Dict = {
  // App shell / navigation
  'nav.appName': 'OpenSociety',
  'nav.signIn': 'Sign in',
  'nav.visitors': 'Visitors',
  'nav.preApprove': 'Pre-approve',
  'nav.preApproveVisitor': 'Pre-approve visitor',
  'nav.notices': 'Notices',
  'nav.maintenance': 'Maintenance',
  'nav.gate': 'Gate',
  'nav.duty': 'Duty',
  'nav.guardDuty': 'Guard duty',
  'nav.registerVisitor': 'Register visitor',
  'nav.houseHelp': 'House help',
  'nav.myHouseHelp': 'My house help',
  'nav.vehicles': 'Vehicles',
  'nav.myVehicles': 'My vehicles',
  'nav.bills': 'Bills',

  // Home screen
  'home.subtitle': 'Privacy-first society management',
  'home.resident': 'Resident',
  'home.guard': 'Guard',

  // Shared
  'common.language': 'Language',
  'common.loading': 'Loading…',
}

const hi: Dict = {
  // App shell / navigation
  'nav.appName': 'OpenSociety',
  'nav.signIn': 'साइन इन',
  'nav.visitors': 'आगंतुक',
  'nav.preApprove': 'पूर्व-अनुमति',
  'nav.preApproveVisitor': 'आगंतुक पूर्व-अनुमति',
  'nav.notices': 'सूचनाएँ',
  'nav.maintenance': 'रखरखाव',
  'nav.gate': 'गेट',
  'nav.duty': 'ड्यूटी',
  'nav.guardDuty': 'गार्ड ड्यूटी',
  'nav.registerVisitor': 'आगंतुक पंजीकरण',
  'nav.houseHelp': 'घरेलू सहायक',
  'nav.myHouseHelp': 'मेरे घरेलू सहायक',
  'nav.vehicles': 'वाहन',
  'nav.myVehicles': 'मेरे वाहन',
  'nav.bills': 'बिल',

  // Home screen
  'home.subtitle': 'गोपनीयता-प्रथम सोसायटी प्रबंधन',
  'home.resident': 'निवासी',
  'home.guard': 'गार्ड',

  // Shared
  'common.language': 'भाषा',
  'common.loading': 'लोड हो रहा है…',
}

const resources: Record<Language, Dict> = { en, hi }

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

  const t = (key: string) => resources[language][key] ?? resources.en[key] ?? key

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within I18nProvider')
  return ctx
}
