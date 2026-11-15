import { useEffect, useRef, useState } from 'react'
import { Check, Download, FileJson, FileSpreadsheet, FileText, Upload } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { exportAll, type ExportFormat } from '../lib/export'

const FORMATS: { value: ExportFormat; label: string; hint: string; icon: typeof FileText }[] = [
  { value: 'markdown', label: 'Markdown', hint: 'Readable journal + goals (.md)', icon: FileText },
  { value: 'json', label: 'Full backup', hint: 'Everything, restorable (.json)', icon: FileJson },
  { value: 'csv', label: 'Goals CSV', hint: 'Open in Excel / Sheets', icon: FileSpreadsheet },
]

/** Download a copy of the user's data — the promise that it stays theirs. */
export function ExportMenu({ compact, full, iconOnly }: { compact?: boolean; full?: boolean; iconOnly?: boolean }) {
  const { data, user } = useApp()
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  // the command palette can trigger the export sheet
  useEffect(() => {
    const onExport = () => setOpen(true)
    window.addEventListener('soulmate:export', onExport)
    return () => window.removeEventListener('soulmate:export', onExport)
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (format: ExportFormat) => {
    const file = exportAll(data, format, user?.name)
    setDone(file)
    setTimeout(() => {
      setDone(null)
      setOpen(false)
    }, 1800)
  }

  return (
    <div ref={wrap} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={
          iconOnly
            ? 'btn-icon shrink-0'
            : `btn-ghost gap-2 px-3 py-2 text-xs ${full ? 'w-full justify-center' : ''}`
        }
        aria-haspopup="menu"
        aria-expanded={open}
        title="Export my data"
        aria-label="Download my data"
      >
        <Download size={iconOnly ? 16 : 15} className="shrink-0" />
        {!compact && !iconOnly && <span>Export</span>}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-pop md:left-full md:top-auto md:bottom-0 md:ml-2 md:mb-0 dark:border-slate-700 dark:bg-slate-900"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            Download my data
          </p>
          {FORMATS.map(({ value, label, hint, icon: Icon }) => (
            <button
              key={value}
              role="menuitem"
              onClick={() => run(value)}
              className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" />
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-slate-800 dark:text-slate-200">{label}</span>
                <span className="block text-[11px] text-slate-500">{hint}</span>
              </span>
            </button>
          ))}
          <p className="mt-1 flex items-center gap-1.5 border-t border-slate-100 px-2.5 pb-1 pt-2 text-[10px] text-slate-400 dark:border-slate-800">
            <Upload size={10} /> {done ? `Saved ${done}` : 'Nothing is uploaded — files stay on your device.'}
          </p>
        </div>
      )}

      {done && (
        <span className="pointer-events-none absolute left-0 top-full mt-1 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[10px] text-white">
          <Check size={10} className="mr-1 inline" /> {done}
        </span>
      )}
    </div>
  )
}
