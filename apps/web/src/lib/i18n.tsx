import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

// Lightweight i18n. A custom provider (rather than react-i18next) keeps SSR
// hydration simple: the first render is always English on server + client, and
// the stored preference is applied on the client after mount — no mismatch.
export type Language = 'en' | 'hi'

type Dict = Record<string, string>

const en: Dict = {
  'nav.overview': 'Overview',
  'nav.society': 'Society',
  'nav.apartments': 'Apartments',
  'nav.residents': 'Residents',
  'nav.guards': 'Guards',
  'nav.duty': 'Guard duty',
  'nav.houseHelp': 'House help',
  'nav.vehicles': 'Vehicles',
  'nav.parking': 'Parking',
  'nav.visitors': 'Visitors',
  'nav.preApprovals': 'Pre-approvals',
  'nav.tickets': 'Tickets',
  'nav.billing': 'Billing',
  'nav.reports': 'Reports',
  'nav.analytics': 'Analytics',
  'nav.notices': 'Notices',
  'header.apiOnline': 'online',
  'header.apiOffline': 'offline',
  'header.api': 'API',
  'auth.signIn': 'Sign in',
  'auth.signOut': 'Sign out',
  'lang.label': 'Language',
  'lang.english': 'English',
  'lang.hindi': 'हिंदी',
  'page.billing.desc': 'Generate maintenance bills, record payments, and track dues.',
  'page.duty.desc': 'on duty now',
  'page.notices.desc': 'Publish announcements to residents.',
  'page.residents.desc': 'Approve new residents and manage their roles.',
  'page.parking.desc': 'Allocate parking slots to flats and keep a live directory.',
  'page.reports.title': 'Financial reports',
  'page.reports.desc': 'Collection summary, method breakdown, and export.',
  'page.setup.title': 'Society setup',
  'page.setup.desc': 'Get your society ready in three quick steps.',
  'page.society.desc': 'Configure the basic details for your society.',
}

const hi: Dict = {
  'nav.overview': 'अवलोकन',
  'nav.society': 'सोसायटी',
  'nav.apartments': 'अपार्टमेंट',
  'nav.residents': 'निवासी',
  'nav.guards': 'गार्ड',
  'nav.duty': 'गार्ड ड्यूटी',
  'nav.houseHelp': 'घरेलू सहायक',
  'nav.vehicles': 'वाहन',
  'nav.parking': 'पार्किंग',
  'nav.visitors': 'आगंतुक',
  'nav.preApprovals': 'पूर्व-अनुमोदन',
  'nav.tickets': 'टिकट',
  'nav.billing': 'बिलिंग',
  'nav.reports': 'रिपोर्ट',
  'nav.analytics': 'विश्लेषण',
  'nav.notices': 'सूचनाएं',
  'header.apiOnline': 'ऑनलाइन',
  'header.apiOffline': 'ऑफ़लाइन',
  'header.api': 'API',
  'auth.signIn': 'साइन इन',
  'auth.signOut': 'साइन आउट',
  'lang.label': 'भाषा',
  'lang.english': 'English',
  'lang.hindi': 'हिंदी',
  'page.billing.desc': 'रखरखाव बिल बनाएँ, भुगतान दर्ज करें और बकाया ट्रैक करें।',
  'page.duty.desc': 'अभी ड्यूटी पर',
  'page.notices.desc': 'निवासियों के लिए घोषणाएँ प्रकाशित करें।',
  'page.residents.desc': 'नए निवासियों को स्वीकृत करें और उनकी भूमिकाएँ प्रबंधित करें।',
  'page.parking.desc': 'फ्लैटों को पार्किंग स्लॉट आवंटित करें और लाइव निर्देशिका रखें।',
  'page.reports.title': 'वित्तीय रिपोर्ट',
  'page.reports.desc': 'संग्रह सारांश, विधि विवरण और निर्यात।',
  'page.setup.title': 'सोसायटी सेटअप',
  'page.setup.desc': 'तीन आसान चरणों में अपनी सोसायटी तैयार करें।',
  'page.society.desc': 'अपनी सोसायटी के बुनियादी विवरण कॉन्फ़िगर करें।',
}

const resources: Record<Language, Dict> = { en, hi }

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

  const t = (key: string) => resources[language][key] ?? resources.en[key] ?? key

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>
}

export function useT() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useT must be used within <I18nProvider>')
  return ctx
}
