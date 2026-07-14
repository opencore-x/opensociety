import { useEffect, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

// A minimal accessible modal: click-outside or Escape closes it; the content
// stops propagation so inner clicks don't dismiss. `className` sizes/styles the
// content panel (width, spacing, scroll) per caller.
export function Modal({
  open,
  onClose,
  className,
  children,
}: {
  open: boolean
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div className={cn('bg-background rounded-lg p-6 shadow-lg', className)} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
