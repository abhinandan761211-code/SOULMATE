import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

/** Shared page header so every route has the same title / subtitle rhythm. */
export function PageHeader({
  title,
  subtitle,
  actions,
  eyebrow,
}: {
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
  eyebrow?: ReactNode
}) {
  return (
    <header className="flex flex-col gap-3 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5">{eyebrow}</div>}
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-sub max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: ReactNode
  wide?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Escape closes; keep focus inside the dialog while it is open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      const nodes = panel.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (!nodes || nodes.length === 0) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // focus the first field so a keyboard user can start typing immediately
    requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>(
        'input:not([type=hidden]), textarea, select, button',
      )
      first?.focus()
    })
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previousOverflow
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`w-full ${wide ? 'max-w-3xl' : 'max-w-lg'} animate-[fadeIn_.16s_ease-out] rounded-t-2xl border border-slate-200 bg-white p-5 shadow-modal sm:my-8 sm:rounded-xl sm:p-6`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-semibold tracking-tight text-slate-900">
              {title}
            </h3>
            {description && <p className="mt-1 text-[13px] text-slate-500">{description}</p>}
          </div>
          <button className="btn-icon -mr-1 -mt-1 shrink-0" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode
  title: string
  hint?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300/80 bg-slate-50/60 px-6 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 shadow-xs">
        {icon}
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {hint && <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-slate-500">{hint}</p>}
      </div>
      {action}
    </div>
  )
}

export function Progress({
  value,
  tone = 'violet',
  size = 'md',
}: {
  value: number
  tone?: 'violet' | 'emerald' | 'rose' | 'amber'
  size?: 'sm' | 'md'
}) {
  const tones = {
    violet: 'bg-brand-500',
    emerald: 'bg-emerald-500',
    rose: 'bg-rose-500',
    amber: 'bg-amber-500',
  }
  const pct = Math.min(Math.max(value, 0), 100)
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`w-full overflow-hidden rounded-full bg-slate-200/80 ${size === 'sm' ? 'h-1' : 'h-1.5'}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ease-out ${tones[tone]}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
      {label ?? 'Loading…'}
    </div>
  )
}
