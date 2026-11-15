import { useState } from 'react'
import { Check, LayoutTemplate, Loader2 } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createChallenge, createGoal, createHabit, today as todayStr } from '../lib/api'
import { TEMPLATES, templateSummary, todayISO, type Template } from '../lib/templates'
import { Modal } from './ui'

/**
 * One-click starter packs. Seeds habits, a challenge and the first goals so a
 * new workspace is not an empty page. Everything created is normal data — the
 * user can edit or delete any of it.
 */
export function TemplatePicker({
  open,
  onClose,
  onApplied,
}: {
  open: boolean
  /** modal close — fired on Escape / backdrop / after a template is applied */
  onClose: () => void
  /** caller hides the section after a successful apply */
  onApplied?: (t: Template) => void
}) {
  const { user, refresh } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [applied, setApplied] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = async (t: Template) => {
    if (!user) return
    setBusy(t.id)
    setError(null)
    try {
      for (const name of t.habits) await createHabit(user.id, name)
      if (t.challenge) {
        await createChallenge(user.id, {
          title: t.challenge.title,
          description: t.challenge.description,
          duration: t.challenge.duration,
          start_date: todayISO(),
        })
      }
      for (const g of t.goals) {
        await createGoal(user.id, {
          title: g.title,
          description: g.description ?? null,
          horizon: g.horizon,
          bucket: g.horizon === 'long_term' ? 'future' : 'present',
          status: 'planned',
          priority: g.priority ?? 'medium',
          progress: 0,
          due_date: g.horizon === 'today' ? todayStr() : null,
          repeat: g.repeat ?? null,
        })
      }
      await refresh()
      setApplied(t.id)
      onApplied?.(t)
      setTimeout(() => {
        setApplied(null)
        onClose()
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the template')
    } finally {
      setBusy(null)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="Start with a template"
      description="A ready-made week of habits, goals and a challenge. Pick one, then make it yours."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((t) => {
          const isBusy = busy === t.id
          const isDone = applied === t.id
          return (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600"
            >
              <div className="flex items-start gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-lg ${t.accent}`}
                  aria-hidden
                >
                  {t.emoji}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{t.name}</p>
                  <p className="text-[12px] leading-snug text-slate-500">{t.tagline}</p>
                </div>
              </div>

              <p className="mt-3 text-[11px] font-medium text-slate-400">{templateSummary(t)}</p>

              <ul className="mt-2 space-y-0.5 text-[11px] text-slate-500">
                {t.habits.slice(0, 3).map((h) => (
                  <li key={h} className="truncate">
                    · {h}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => apply(t)}
                disabled={!!busy || !!applied}
                className="btn-primary mt-3 w-full py-2 text-xs"
              >
                {isDone ? (
                  <>
                    <Check size={14} /> Added to your workspace
                  </>
                ) : isBusy ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Setting up…
                  </>
                ) : (
                  <>
                    <LayoutTemplate size={14} /> Use this template
                  </>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
          {error}
        </p>
      )}

      <p className="mt-4 text-[11px] text-slate-400">
        Tip: templates add data, they never overwrite what you already have.
      </p>
    </Modal>
  )
}

/**
 * Inline starter card for a brand-new workspace (Dashboard). Shows the packs
 * directly so the first screen has a way forward instead of four empty boxes.
 */
export function TemplateStarter({ onApplied }: { onApplied?: () => void }) {
  const { user, refresh } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const apply = async (t: Template) => {
    if (!user) return
    setBusy(t.id)
    setError(null)
    try {
      for (const name of t.habits) await createHabit(user.id, name)
      if (t.challenge) {
        await createChallenge(user.id, {
          title: t.challenge.title,
          description: t.challenge.description,
          duration: t.challenge.duration,
          start_date: todayISO(),
        })
      }
      for (const g of t.goals) {
        await createGoal(user.id, {
          title: g.title,
          description: g.description ?? null,
          horizon: g.horizon,
          bucket: g.horizon === 'long_term' ? 'future' : 'present',
          status: 'planned',
          priority: g.priority ?? 'medium',
          progress: 0,
          due_date: g.horizon === 'today' ? todayStr() : null,
          repeat: g.repeat ?? null,
        })
      }
      await refresh()
      onApplied?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not apply the template')
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
          <LayoutTemplate size={17} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Start with a template
          </h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            A ready-made week of habits, goals and a challenge — delete anything you don’t need.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => apply(t)}
            disabled={!!busy}
            className="group flex flex-col items-start gap-1 rounded-xl border border-slate-200 p-3 text-left transition hover:border-brand-300 hover:bg-brand-50/40 disabled:opacity-60 dark:border-slate-700 dark:hover:border-brand-600 dark:hover:bg-brand-950/30"
          >
            <span className="text-lg" aria-hidden>
              {t.emoji}
            </span>
            <span className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">{t.name}</span>
            <span className="text-[11px] leading-snug text-slate-500">{t.tagline}</span>
            <span className="mt-1 text-[10px] font-medium text-brand-600 dark:text-brand-300">
              {busy === t.id ? 'Setting up…' : templateSummary(t)}
            </span>
          </button>
        ))}
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
          {error}
        </p>
      )}
    </section>
  )
}
