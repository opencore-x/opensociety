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
  'common.type': 'Type',
  'common.apartment': 'Apartment',
  'common.failed': 'Failed',
  'common.retry': 'Retry',
  'common.dismiss': 'Dismiss',

  // Offline / sync
  'offline.offline': 'Offline',
  'offline.queued': 'waiting to sync',
  'offline.offlineIdle': 'changes will sync when reconnected',
  'offline.syncing': 'Syncing',
  'offline.entryOne': 'entry',
  'offline.entryMany': 'entries',
  'offline.failedToSync': 'failed to sync',

  // Register visitor
  'register.visitorName': 'Visitor name',
  'register.phoneOptional': 'Phone (optional)',
  'register.phonePlaceholder': '10-digit number',
  'register.registering': 'Registering…',
  'register.loadError': 'Could not load apartments',
  'register.offlineNote': "You're offline — this visitor will be saved and synced when you reconnect.",

  'common.checkIn': 'Check in',
  'common.checkOut': 'Check out',
  'common.cancel': 'Cancel',

  // Gate
  'gate.codePlaceholder': 'Pre-approval code',
  'gate.redeeming': 'Redeeming…',
  'gate.redeem': 'Redeem',
  'gate.scanQr': 'Scan QR code',
  'gate.invalidCode': 'Invalid code',
  'gate.offlineNote': "Code redemption and check-in/out need a connection. You can still register visitors — they'll sync when you reconnect.",
  'gate.empty': 'No visitors at the gate.',
  'gate.apiUnreachable': 'API unreachable',
  'gate.qrWebHint': 'QR scanning uses the device camera. Open the app on a phone, or enter the code manually.',
  'gate.cameraNeeded': 'Camera access is needed to scan pre-approval QR codes.',
  'gate.grantCamera': 'Grant camera access',
  'gate.pointCamera': 'Point the camera at the pre-approval QR code',

  // Sign in
  'signIn.email': 'Email',
  'signIn.password': 'Password',
  'signIn.signingIn': 'Signing in…',
  'signIn.mfaRequired': 'Additional verification (two-factor) is required for this account.',
  'signIn.failed': 'Sign in failed',

  // Guard duty
  'duty.empty': 'No active guards.',
  'duty.onDuty': 'ON DUTY',
  'duty.off': 'OFF',
  'duty.clockIn': 'Clock in',
  'duty.clockOut': 'Clock out',

  // Bills
  'bills.loadError': 'Couldn’t load bills',
  'bills.empty': 'No bills yet.',
  'bills.oneTime': 'One-time',
  'bills.due': 'due',
  'bills.paid': 'Paid',
  'bills.paymentHistory': 'Payment history',
  'bills.noPayments': 'No payments yet.',

  'common.approve': 'Approve',
  'common.deny': 'Deny',
  'common.confirm': 'Confirm',

  // Visitors (resident approval queue)
  'visitors.empty': 'No visitors yet.',
  'visitors.denyReason': 'Reason for denial',
  'visitors.denying': 'Denying…',

  // Notices
  'notices.loadError': 'Couldn’t load notices',
  'notices.searchPlaceholder': 'Search notices',
  'notices.noMatch': 'No matching notices.',
  'notices.empty': 'No notices yet.',
  'notices.new': 'NEW',
  'notices.attachmentFallback': 'Attachment',
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
  'common.type': 'प्रकार',
  'common.apartment': 'अपार्टमेंट',
  'common.failed': 'विफल',
  'common.retry': 'पुनः प्रयास',
  'common.dismiss': 'खारिज करें',

  // Offline / sync
  'offline.offline': 'ऑफ़लाइन',
  'offline.queued': 'सिंक होने की प्रतीक्षा में',
  'offline.offlineIdle': 'पुनः कनेक्ट होने पर परिवर्तन सिंक होंगे',
  'offline.syncing': 'सिंक हो रहा',
  'offline.entryOne': 'प्रविष्टि',
  'offline.entryMany': 'प्रविष्टियाँ',
  'offline.failedToSync': 'सिंक विफल',

  // Register visitor
  'register.visitorName': 'आगंतुक का नाम',
  'register.phoneOptional': 'फ़ोन (वैकल्पिक)',
  'register.phonePlaceholder': '10-अंकों का नंबर',
  'register.registering': 'पंजीकरण हो रहा है…',
  'register.loadError': 'अपार्टमेंट लोड नहीं हो सके',
  'register.offlineNote': 'आप ऑफ़लाइन हैं — यह आगंतुक सहेजा जाएगा और पुनः कनेक्ट होने पर सिंक होगा।',

  'common.checkIn': 'चेक इन',
  'common.checkOut': 'चेक आउट',
  'common.cancel': 'रद्द करें',

  // Gate
  'gate.codePlaceholder': 'पूर्व-अनुमति कोड',
  'gate.redeeming': 'रिडीम हो रहा…',
  'gate.redeem': 'रिडीम करें',
  'gate.scanQr': 'QR कोड स्कैन करें',
  'gate.invalidCode': 'अमान्य कोड',
  'gate.offlineNote': 'कोड रिडेम्पशन और चेक-इन/आउट के लिए कनेक्शन चाहिए। आप फिर भी आगंतुक पंजीकृत कर सकते हैं — पुनः कनेक्ट होने पर वे सिंक होंगे।',
  'gate.empty': 'गेट पर कोई आगंतुक नहीं।',
  'gate.apiUnreachable': 'API अनुपलब्ध',
  'gate.qrWebHint': 'QR स्कैनिंग डिवाइस कैमरा का उपयोग करती है। फ़ोन पर ऐप खोलें, या कोड मैन्युअल रूप से दर्ज करें।',
  'gate.cameraNeeded': 'पूर्व-अनुमति QR कोड स्कैन करने के लिए कैमरा एक्सेस आवश्यक है।',
  'gate.grantCamera': 'कैमरा एक्सेस दें',
  'gate.pointCamera': 'कैमरा को पूर्व-अनुमति QR कोड पर इंगित करें',

  // Sign in
  'signIn.email': 'ईमेल',
  'signIn.password': 'पासवर्ड',
  'signIn.signingIn': 'साइन इन हो रहा है…',
  'signIn.mfaRequired': 'इस खाते के लिए अतिरिक्त सत्यापन (टू-फैक्टर) आवश्यक है।',
  'signIn.failed': 'साइन इन विफल',

  // Guard duty
  'duty.empty': 'कोई सक्रिय गार्ड नहीं।',
  'duty.onDuty': 'ड्यूटी पर',
  'duty.off': 'बंद',
  'duty.clockIn': 'क्लॉक इन',
  'duty.clockOut': 'क्लॉक आउट',

  // Bills
  'bills.loadError': 'बिल लोड नहीं हो सके',
  'bills.empty': 'अभी कोई बिल नहीं।',
  'bills.oneTime': 'एकमुश्त',
  'bills.due': 'देय',
  'bills.paid': 'भुगतान किया',
  'bills.paymentHistory': 'भुगतान इतिहास',
  'bills.noPayments': 'अभी कोई भुगतान नहीं।',

  'common.approve': 'स्वीकृत करें',
  'common.deny': 'अस्वीकृत करें',
  'common.confirm': 'पुष्टि करें',

  // Visitors (resident approval queue)
  'visitors.empty': 'अभी कोई आगंतुक नहीं।',
  'visitors.denyReason': 'अस्वीकृति का कारण',
  'visitors.denying': 'अस्वीकृत हो रहा…',

  // Notices
  'notices.loadError': 'सूचनाएँ लोड नहीं हो सकीं',
  'notices.searchPlaceholder': 'सूचनाएँ खोजें',
  'notices.noMatch': 'कोई मिलती-जुलती सूचना नहीं।',
  'notices.empty': 'अभी कोई सूचना नहीं।',
  'notices.new': 'नया',
  'notices.attachmentFallback': 'अनुलग्नक',
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
