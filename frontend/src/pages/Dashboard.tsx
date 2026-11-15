import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  Flame,
  FolderKanban,
  Minus,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { computeStats, moodBadge } from '../lib/stats'
import { createGoal, isPreviewMode, markHabit, updateGoal, today as todayStr } from '../lib/api'
import { HORIZON_LABEL } from '../lib/types'
import { createDueRecurringGoals } from '../lib/recurring'
import { EmptyState, PageHeader, Progress } from '../components/ui'
import { TemplateStarter } from '../components/TemplatePicker'

export default function Dashboard() {
  const { user, data, refresh } = useApp()
  const [busy, setBusy] = useState<string | null>(null)
  const [hideStarter, setHideStarter] = useState(false)
  const d = todayStr()

  // A brand-new workspace: no journal, no goals, no habits yet.
  const isFresh = !data.journal.length && !data.goals.length && !data.habits.length

  // Roll recurring goals forward once per visit (creates today's copy).
  useEffect(() => {
    if (!user || isPreviewMode()) return
    const hasRecurring = data.goals.some((g) => g.repeat && g.series_id)
    if (!hasRecurring) return
    let alive = true
    createDueRecurringGoals(user.id, data.goals)
      .then((n) => {
        if (alive && n > 0) return refresh()
      })
      .catch(() => {
        /* offline or RLS — the user can retry by reloading */
      })
    return () => {
      alive = false
    }
    // only when the goal set actually changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, data.goals.length])

  const stats = useMemo(
    () =>
      computeStats(
        data.goals,
        data.journal,
        data.habitLogs,
        data.habits.length,
        data.projects,
        data.analysis,
      ),
    [data],
  )

  const todayGoalList = data.goals.filter(
    (g) => g.horizon === 'today' || g.due_date === d,
  )
  const tomorrowGoalList = data.goals.filter((g) => g.horizon === 'tomorrow')
  const journalToday = data.journal.find((j) => j.entry_date === d)
  const mood = moodBadge(journalToday?.mood ?? null)
  const todayLogs = data.habitLogs.filter((l) => l.log_date === d)

  const setGoalStatus = async (id: string, status: 'success' | 'failed' | 'planned') => {
    setBusy(id)
    try {
      await updateGoal(id, {
        status,
        completed_at: status === 'success' ? new Date().toISOString() : null,
        progress: status === 'success' ? 100 : 0,
      })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  /** add one of the suggested goals to tomorrow without leaving the dashboard */
  const quickAddTomorrow = async (title: string) => {
    if (!user) return
    setBusy(`add-${title}`)
    try {
      await createGoal(user.id, {
        title,
        horizon: 'tomorrow',
        bucket: 'present',
        status: 'planned',
        priority: 'medium',
        progress: 0,
        due_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
      })
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const toggleHabit = async (habitId: string, mark: 'yes' | 'no') => {
    const key = `${habitId}-${mark}`
    setBusy(key)
    try {
      await markHabit(user!.id, habitId, d, mark)
      await refresh()
    } finally {
      setBusy(null)
    }
  }

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  })()

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={<p className="text-xs font-medium text-slate-400">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>}
        title={
          <>
            {greeting}, {user?.name?.split(' ')[0]}
          </>
        }
        subtitle={
          stats.todayTotal
            ? `${stats.todayDone} of ${stats.todayTotal} of today's goals done.`
            : 'No goals set for today yet — start with one small win.'
        }
        actions={
          <>
            <Link to="/app/journal" className="btn-ghost">
              <Sparkles size={16} /> Write journal
            </Link>
            <Link to="/app/goals" className="btn-primary">
              <Target size={16} /> Add goal
            </Link>
          </>
        }
      />

      {(isFresh && !hideStarter) && <TemplateStarter onApplied={() => setHideStarter(true)} />}

      {/* KPI row */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={<Target size={16} />}
          label="Today's progress"
          value={`${stats.todayDone}/${stats.todayTotal}`}
          sub={stats.todayTotal ? `${Math.round((stats.todayDone / stats.todayTotal) * 100)}% complete` : 'nothing scheduled'}
          progress={stats.todayTotal ? (stats.todayDone / stats.todayTotal) * 100 : 0}
        />
        <Kpi
          icon={<TrendingUp size={16} />}
          label="Success rate"
          value={`${stats.successRate}%`}
          sub={`${stats.successGoals.length} success · ${stats.failedGoals.length} failed`}
          progress={stats.successRate}
          tone="emerald"
        />
        <Kpi
          icon={<Flame size={16} />}
          label="Journal streak"
          value={`${stats.streak} d`}
          sub={stats.streak ? 'keep it alive!' : 'write today to start'}
          progress={Math.min(stats.streak * 10, 100)}
          tone="amber"
        />
        <Kpi
          icon={<FolderKanban size={16} />}
          label="Projects"
          value={`${stats.projectStats.active} active`}
          sub={`${stats.projectStats.success} success · ${stats.projectStats.failed} failed`}
          progress={stats.projectStats.total ? (stats.projectStats.success / stats.projectStats.total) * 100 : 0}
        />
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        {/* today's goals */}
        <section className="card h-fit self-start p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Today&apos;s goals</h2>
            <Link to="/app/goals" className="text-xs font-medium text-brand-600 hover:text-brand-700">
              View all <ArrowRight size={12} className="inline" />
            </Link>
          </div>
          {todayGoalList.length === 0 ? (
            <EmptyState
              icon={<Target size={22} />}
              title="Nothing planned for today"
              hint="Write down 1–3 things you must finish today. Small, specific goals beat big vague ones."
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {todayGoalList.map((g) => (
                <li key={g.id} className="flex items-center gap-3 py-3">
                  <button
                    onClick={() => setGoalStatus(g.id, g.status === 'success' ? 'planned' : 'success')}
                    disabled={busy === g.id}
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${g.status === 'success'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 text-transparent hover:border-emerald-400'
                      }`}
                    aria-label="Mark done"
                  >
                    <Check size={14} />
                  </button>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm ${g.status === 'success' ? 'text-slate-500 line-through' : 'text-slate-900'
                        }`}
                    >
                      {g.title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {HORIZON_LABEL[g.horizon]} · {g.priority} priority
                    </p>
                  </div>
                  {g.status === 'failed' ? (
                    <span className="chip bg-rose-50 text-rose-700">failed</span>
                  ) : (
                    <button
                      onClick={() => setGoalStatus(g.id, 'failed')}
                      disabled={busy === g.id}
                      className="btn-icon"
                      title="Mark not done"
                    >
                      <X size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <CalendarClock size={14} className="text-brand-400" /> Tomorrow
              </h3>
              <Link to="/app/goals" className="text-[11px] text-brand-600 hover:text-brand-700">
                Plan <ArrowRight size={11} className="inline" />
              </Link>
            </div>
            {tomorrowGoalList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 px-3 py-3 dark:border-slate-700">
                <p className="text-xs text-slate-500">Plan tomorrow before you sleep — it makes mornings easy.</p>
                {/* one-tap common picks, so the card is never a dead end */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {['Wake up early', 'Workout', 'Deep work block', 'Read 20 pages'].map((title) => (
                    <button
                      key={title}
                      onClick={() => quickAddTomorrow(title)}
                      disabled={busy === `add-${title}`}
                      className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:bg-brand-950/40"
                    >
                      + {title}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {tomorrowGoalList.slice(0, 4).map((g) => (
                  <li key={g.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span className="truncate">{g.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* journal + habits */}
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Today&apos;s journal</h2>
            {journalToday ? (
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`chip ${mood.cls}`}>
                    {mood.emoji} {mood.text}
                  </span>
                  <span className="text-[11px] text-slate-500">entry saved</span>
                </div>
                <p className="text-sm font-medium text-slate-700">{journalToday.title || 'Untitled'}</p>
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500">
                  {journalToday.content || 'No content.'}
                </p>
                <Link to="/app/journal" className="mt-3 inline-flex text-xs font-medium text-brand-600">
                  Open journal <ArrowRight size={12} className="ml-1 inline" />
                </Link>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center">
                <p className="text-sm text-slate-400">You haven&apos;t written today.</p>
                <p className="mt-1 text-xs text-slate-500">2 minutes of reflection beats a perfect plan.</p>
                <Link to="/app/journal" className="btn-primary mt-3 w-full">
                  Write now
                </Link>
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Daily check-in</h2>
              <span className="text-[11px] text-slate-500">
                {stats.habitsToday.yes} right · {stats.habitsToday.no} wrong
              </span>
            </div>
            {data.habits.length === 0 ? (
              <EmptyState icon={<CheckCircle2 size={22} />} title="No habits tracked yet" hint="Habits live inside the Journal page — add ones like 'woke up early' or 'no phone at night'." />
            ) : (
              <ul className="space-y-2">
                {data.habits.map((h) => {
                  const log = todayLogs.find((l) => l.habit_id === h.id)
                  return (
                    <li key={h.id} className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{h.name}</span>
                      <button
                        onClick={() => toggleHabit(h.id, 'yes')}
                        disabled={busy === `${h.id}-yes`}
                        aria-pressed={log?.mark === 'yes'}
                        aria-label={`${h.name}: did it right`}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-50 ${log?.mark === 'yes'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-emerald-950 dark:hover:text-emerald-400'
                          }`}
                        title="Done right"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => toggleHabit(h.id, 'no')}
                        disabled={busy === `${h.id}-no`}
                        aria-pressed={log?.mark === 'no'}
                        aria-label={`${h.name}: missed`}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition disabled:opacity-50 ${log?.mark === 'no'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-rose-950 dark:hover:text-rose-400'
                          }`}
                        title="Missed / wrong"
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* upcoming */}
      <section className="card p-5">
        <h2 className="mb-3 font-semibold text-slate-900">Last analysis</h2>
        {data.analysis ? (
          <div className="space-y-1.5 text-sm">
            <p className="text-slate-500">
              Week of {data.analysis.period_start} · score{' '}
              <span className="font-semibold text-brand-600">{data.analysis.score}/100</span>
            </p>
            <p className="line-clamp-2 text-slate-400">{data.analysis.lessons || 'No lessons recorded.'}</p>
            <Link to="/app/analysis" className="inline-flex text-xs font-medium text-brand-600">
              Open analysis <ArrowRight size={12} className="ml-1 inline" />
            </Link>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-slate-500">No analysis yet. Review your week to spot patterns.</p>
            <Link to="/app/analysis" className="btn-ghost shrink-0 text-xs">
              Analyse
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

function Kpi({
  icon,
  label,
  value,
  sub,
  progress,
  tone = 'violet',
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  progress: number
  tone?: 'violet' | 'emerald' | 'amber'
}) {
  const iconTone = {
    violet: 'bg-brand-50 text-brand-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }[tone]

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${iconTone}`}>{icon}</span>
        <p className="text-xs font-medium text-slate-500">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mb-2 text-[11px] text-slate-500">{sub}</p>
      <Progress value={progress} tone={tone === 'amber' ? 'emerald' : tone} />
    </div>
  )
}
