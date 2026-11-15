import { useEffect, useRef, useState } from 'react'
import { format } from 'date-fns'
import { BookOpen, Check, ImagePlus, Target, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createGoal, saveJournal, today as todayStr } from '../lib/api'
import { uploadJournalPhotos } from '../lib/storage'
import { openQuickCapture, useQuickCapture } from '../lib/quickCapture'
import { MOODS, type Mood } from '../lib/types'

/** Local draft key survives reloads and offline use. */
const draftKey = (mode: string, extra: string) => `soulmate:draft:${mode}:${extra}`

function readDraft<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback
  } catch {
    return fallback
  }
}

function writeDraft(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* quota — ignore */
  }
}

function clearDraft(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

/**
 * Global "write it down right now" sheet.
 * Cmd/Ctrl+J → journal, Cmd/Ctrl+Shift+K → goal. Works from any page.
 * Journal text is auto-saved to localStorage as you type, so closing the tab
 * (or going offline) never loses a thought.
 */
export function QuickCapture() {
  const { mode, close } = useQuickCapture()
  return mode === 'journal' ? <JournalCapture onClose={close} /> : mode === 'goal' ? <GoalCapture onClose={close} /> : null
}

/** Shared shell: centred sheet on desktop, bottom sheet on mobile. */
function Sheet({
  title,
  hint,
  onClose,
  children,
}: {
  title: string
  hint: string
  onClose: () => void
  children: React.ReactNode
}) {
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault()
        panel.current?.querySelector<HTMLButtonElement>('[data-submit]')?.click()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    requestAnimationFrame(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-xl animate-[fadeIn_.16s_ease-out] rounded-t-2xl border border-slate-200 bg-white p-5 shadow-modal sm:rounded-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h2>
            <p className="mt-0.5 text-[12px] text-slate-500">{hint}</p>
          </div>
          <button className="btn-icon -mr-1 -mt-1" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/* ------------------------------- journal ------------------------------- */

interface JournalDraft {
  title: string
  content: string
  mood: Mood | null
}

function JournalCapture({ onClose }: { onClose: () => void }) {
  const { user, data, refresh } = useApp()
  const key = draftKey('journal', todayStr())
  const existing = data.journal.find((j) => j.entry_date === todayStr())

  // A saved local draft always wins over the server copy — it is newer.
  const [draft, setDraft] = useState<JournalDraft>(() => {
    const stored = localStorage.getItem(key)
    if (stored) return readDraft<JournalDraft>(key, { title: '', content: '', mood: null })
    return {
      title: existing?.title ?? '',
      content: existing?.content ?? '',
      mood: (existing?.mood as Mood | null) ?? null,
    }
  })
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // autosave the draft; the sheet is meant to be closed without thinking
  useEffect(() => {
    const t = setTimeout(() => writeDraft(key, draft), 300)
    return () => clearTimeout(t)
  }, [draft, key])

  const save = async () => {
    if (!user) return
    if (!draft.content.trim() && !draft.title.trim() && files.length === 0) {
      onClose()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const uploaded = files.length ? await uploadJournalPhotos(user.id, files) : []
      const photos = [...(existing?.photos ?? []), ...uploaded]
      await saveJournal(user.id, {
        entry_date: todayStr(),
        title: draft.title,
        mood: draft.mood,
        content: draft.content,
        photos,
      })
      clearDraft(key)
      await refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Today’s journal" hint={format(new Date(), 'EEEE, d MMMM')} onClose={onClose}>
      <div className="space-y-3">
        <input
          data-autofocus
          className="input"
          placeholder="One line — how was today?"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
        />
        <textarea
          className="input min-h-[160px] resize-y leading-relaxed"
          placeholder="What happened? What went right, what went wrong?"
          value={draft.content}
          onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
        />

        <div className="flex flex-wrap items-center gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={draft.mood === m.value}
              onClick={() => setDraft((d) => ({ ...d, mood: d.mood === m.value ? null : m.value }))}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${draft.mood === m.value
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
            >
              {m.emoji} {m.label}
            </button>
          ))}
        </div>

        <PhotoPicker files={files} setFiles={setFiles} />

        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-400">Draft saves as you type · ⌘↵ to save</span>
          <div className="flex gap-2">
            <button className="btn-ghost px-3 py-2 text-xs" onClick={onClose}>
              Cancel
            </button>
            <button data-submit onClick={save} disabled={busy} className="btn-primary px-3 py-2 text-xs">
              <Check size={14} /> {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/* --------------------------------- goal -------------------------------- */

interface GoalDraft {
  title: string
  when: 'today' | 'tomorrow' | 'week' | 'month'
}

function GoalCapture({ onClose }: { onClose: () => void }) {
  const { user, refresh } = useApp()
  const key = draftKey('goal', 'new')
  const [draft, setDraft] = useState<GoalDraft>(() => readDraft<GoalDraft>(key, { title: '', when: 'today' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => writeDraft(key, draft), 300)
    return () => clearTimeout(t)
  }, [draft, key])

  const save = async () => {
    if (!user || !draft.title.trim()) return
    setBusy(true)
    setError(null)
    try {
      await createGoal(user.id, {
        title: draft.title.trim(),
        horizon: draft.when,
        bucket: draft.when === 'today' || draft.when === 'tomorrow' ? 'present' : 'present',
        status: 'planned',
        priority: 'medium',
        progress: 0,
        due_date: todayStr(),
      })
      clearDraft(key)
      await refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title="Quick goal" hint="One line is enough — you can refine it later." onClose={onClose}>
      <div className="space-y-3">
        <input
          data-autofocus
          className="input"
          placeholder="e.g. Call the bank"
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && save()}
        />
        <div className="flex flex-wrap gap-1.5">
          {([
            ['today', 'Today'],
            ['tomorrow', 'Tomorrow'],
            ['week', 'This week'],
            ['month', 'This month'],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setDraft((d) => ({ ...d, when: value }))}
              aria-pressed={draft.when === value}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${draft.when === value
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>}
        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-slate-400">⌘↵ to save</span>
          <div className="flex gap-2">
            <button className="btn-ghost px-3 py-2 text-xs" onClick={onClose}>
              Cancel
            </button>
            <button data-submit onClick={save} disabled={busy || !draft.title.trim()} className="btn-primary px-3 py-2 text-xs">
              <Target size={14} /> {busy ? 'Saving…' : 'Add goal'}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  )
}

/* ------------------------------ photo picker ---------------------------- */

export function PhotoPicker({ files, setFiles }: { files: File[]; setFiles: (f: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([])

  useEffect(() => {
    const next = files.map((f) => ({ url: URL.createObjectURL(f), name: f.name }))
    setPreviews(next)
    return () => next.forEach((p) => URL.revokeObjectURL(p.url))
  }, [files])

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ImagePlus size={14} /> Add photo
      </button>
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 6))
          e.target.value = ''
        }}
      />
      {previews.map((p, i) => (
        <span key={p.url} className="group relative h-12 w-12 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
          <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
          <button
            type="button"
            onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
            className="absolute inset-0 hidden items-center justify-center bg-slate-900/60 text-white group-hover:flex"
            aria-label={`Remove ${p.name}`}
          >
            <X size={14} />
          </button>
        </span>
      ))}
    </div>
  )
}

/** Small trigger button used in the sidebar + mobile bar. */
export function QuickCaptureButton({ mode, label }: { mode: 'journal' | 'goal'; label?: string }) {
  const Icon = mode === 'journal' ? BookOpen : Target
  return (
    <button onClick={() => openQuickCapture(mode)} className="btn-ghost gap-2 px-3 py-2 text-xs" title={label}>
      <Icon size={15} />
      <span className="hidden xl:inline">{label}</span>
    </button>
  )
}
