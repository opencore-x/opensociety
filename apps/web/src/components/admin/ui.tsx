import type { ReactNode } from 'react'
import { useT } from '@/lib/i18n'

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function QueryState({
  q,
  empty,
  emptyText,
  children,
}: {
  q: { isLoading: boolean; isError: boolean; error?: unknown }
  empty?: boolean
  emptyText?: string
  children: ReactNode
}) {
  const { t } = useT()
  if (q.isLoading) return <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
  if (q.isError)
    return (
      <p className="text-destructive text-sm">
        {t('common.apiUnreachable')} ({String((q.error as Error)?.message ?? 'error')})
      </p>
    )
  if (empty) return <p className="text-muted-foreground text-sm">{emptyText ?? t('common.empty')}</p>
  return <>{children}</>
}
