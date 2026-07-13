import { useT, type Language } from '@/lib/i18n'

// Compact English/हिंदी toggle. Persists via the i18n provider (localStorage).
export function LanguageSwitcher() {
  const { language, setLanguage, t } = useT()
  const options: { value: Language; label: string }[] = [
    { value: 'en', label: t('lang.english') },
    { value: 'hi', label: t('lang.hindi') },
  ]
  return (
    <div className="border-input inline-flex overflow-hidden rounded-md border text-xs" role="group" aria-label={t('lang.label')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => setLanguage(o.value)}
          aria-pressed={language === o.value}
          className={
            language === o.value
              ? 'bg-accent text-accent-foreground px-2 py-1 font-medium'
              : 'text-muted-foreground hover:bg-accent/50 px-2 py-1'
          }
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
