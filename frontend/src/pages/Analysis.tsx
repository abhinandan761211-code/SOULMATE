import { useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import {
  BarChart3,
  Brain,
  CheckCircle2,
  Flame,
  Lightbulb,
  Save,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { computeStats, moodBadge } from '../lib/stats'
import { saveAnalysis, weekStart } from '../lib/api'
import { HORIZON_LABEL } from '../lib/types'
import { EmptyState, PageHeader, Progress } from '../components/ui'

export default function Analysis() {
  const { user, data, refresh } = useApp()
  const [wins, setWins] = useState('')
  const [failures, setFailures] = useState('')
  const [lessons, setLessons] = useState('')
  const [nextActions, setNextActions] = useState('')
  const [score, setScore] = useState(70)
  const [busy, setBusy] = useState(false)

  const stats = useMemo(
    () => computeStats(data.goals, data.journal, data.habitLogs, data.habits.length, data.projects, data.analysis),
    [data],
  )

  const decided = stats.successGoals.length + stats.failedGoals.length
  const habitYes = data.habitLogs.filter((l) => l.mark === 'yes').length
  const habitNo = data.habitLogs.filter((l) => l.mark === 'no').length
  const habitRate = habitYes + habitNo ? Math.round((habitYes / (habitYes + habitNo)) * 100) : 0
  const avgMood =
    stats.moodTrend.length
      ? (stats.moodTrend.reduce((s, m) => s + ({ great: 5, good: 4, okay: 3, low: 2, bad: 1 }[m.mood] ?? 3), 0) /
        stats.moodTrend.length).toFixed(1)
      : '—'

  const maxWeekly = Math.max(1, ...stats.weekly.map((w) => Math.max(w.success, w.failed)))

  const autoFill = () => {
    const winsList = stats.successGoals.slice(0, 5).map((g) => `• ${g.title}`).join('\n')
    const failList = stats.failedGoals.slice(0, 5).map((g) => `• ${g.title}`).join('\n')
    setWins(winsList || '• ')
    setFailures(failList || '• ')
    setScore(Math.round((stats.successRate + habitRate) / 2))
  }

  const submit = async () => {
    if (!user) return
    setBusy(true)
    try {
      await saveAnalysis(user.id, {
        period_start: weekStart(),
        wins,
        failures,
        lessons,
        next_actions: nextActions,
        score,
      })
      await refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Success & failure analysis"
        subtitle="Look honestly at what worked and what didn't. Patterns only appear when you write them down."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Target size={16} />} label="Goals decided" value={`${decided}`} sub={`${stats.successGoals.length} success · ${stats.failedGoals.length} failed`} tone="violet" />
        <MetricCard icon={<TrendingUp size={16} />} label="Success rate" value={`${stats.successRate}%`} sub="of all marked goals" tone="emerald" progress={stats.successRate} />
        <MetricCard icon={<CheckCircle2 size={16} />} label="Habit discipline" value={`${habitRate}%`} sub={`${habitYes} right · ${habitNo} wrong`} tone="sky" progress={habitRate} />
        <MetricCard icon={<Flame size={16} />} label="Journal streak" value={`${stats.streak} days`} sub={`${stats.journalCount} entries total`} tone="amber" progress={Math.min(stats.streak * 10, 100)} />
      </section>

      {/* ---------- success / failure ratio per horizon ---------- */}
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <Target size={16} className="text-violet-500" /> Success ratio by horizon
          </h2>
          <p className="text-[11px] text-slate-500">
            Only <span className="font-medium text-slate-700">marked</span> goals share the 100% — 2 marked = 50% each, 3 marked = 33.3% each
          </p>
        </div>

        {stats.horizonStats.length === 0 ? (
          <EmptyState icon={<Target size={22} />} title="No goals yet" hint="Add goals on the Goals page to see your ratio here." />
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Horizon</th>
                  <th className="pb-2 pr-3 text-right font-medium">Marked</th>
                  <th className="pb-2 pr-3 text-right font-medium">Per goal</th>
                  <th className="pb-2 pr-3 text-right font-medium">Pass</th>
                  <th className="pb-2 pr-3 text-right font-medium">Fail</th>
                  <th className="pb-2 pr-3 text-right font-medium">Pending</th>
                  <th className="w-[38%] pb-2 font-medium">Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.horizonStats.map((h) => (
                  <tr key={h.horizon}>
                    <td className="py-2.5 pr-3 font-medium text-slate-800">{h.label}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{h.decided}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">
                      {h.decided ? `${h.perGoal % 1 === 0 ? h.perGoal : h.perGoal.toFixed(1)}%` : '—'}
                    </td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-emerald-600">{h.success}</td>
                    <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-rose-600">{h.failed}</td>
                    <td className="py-2.5 pr-3 text-right tabular-nums text-slate-400">{h.pending}</td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${h.score}%` }} />
                        </div>
                        <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800">
                          {h.decided ? `${h.score}%` : '—'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <BarChart3 size={16} className="text-violet-500" /> Weekly outcomes
          </h2>
          <div className="flex gap-3">
            {/* y-axis: 0 and the peak, so an empty week still reads as zero */}
            <div className="flex h-40 flex-col justify-between pb-5 text-[10px] tabular-nums text-slate-400">
              <span>{maxWeekly}</span>
              <span>0</span>
            </div>
            <div className="flex h-40 flex-1 items-stretch justify-around gap-4 border-l border-b border-slate-200 pl-3 dark:border-slate-700">
              {stats.weekly.map((w) => (
                <div key={w.label} className="flex flex-1 flex-col items-center justify-end">
                  <div className="flex w-full flex-1 items-end justify-center gap-1.5">
                    {([
                      { n: w.success, label: 'success', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
                      { n: w.failed, label: 'failed', bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400' },
                    ] as const).map((s) => (
                      <div
                        key={s.label}
                        className={`relative w-6 rounded-t-md transition-[height] duration-500 ${s.bar} ${s.n ? '' : 'opacity-25'}`}
                        /* a zero week keeps a 2px stub so the bar is visibly “0” */
                        style={{ height: `${Math.max((s.n / maxWeekly) * 100, 1.5)}%` }}
                        title={`${s.n} ${s.label}`}
                      >
                        {s.n > 0 && (
                          <span className={`absolute inset-x-0 -top-4 text-center text-[10px] font-semibold tabular-nums ${s.text}`}>
                            {s.n}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="mt-1.5 text-[10px] text-slate-500">{w.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-emerald-500" /> Success</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded bg-rose-500" /> Failed</span>
          </div>
        </div>

        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 font-semibold text-slate-900">
            <Sparkles size={16} className="text-fuchsia-400" /> Mood trend · last 30 entries
          </h2>
          {stats.moodTrend.length === 0 ? (
            <EmptyState icon={<Sparkles size={20} />} title="No mood data" hint="Add a mood to your journal entries to see the trend." />
          ) : (
            <>
              <div className="flex h-32 items-end gap-1">
                {stats.moodTrend.map((m) => {
                  const h = { great: 100, good: 80, okay: 60, low: 40, bad: 20 }[m.mood] ?? 50
                  const color =
                    m.mood === 'great' || m.mood === 'good'
                      ? 'bg-emerald-500'
                      : m.mood === 'okay'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                  return <div key={m.date} className={`flex-1 rounded-t ${color}`} style={{ height: `${h}%` }} title={`${m.date}: ${m.mood}`} />
                })}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Average mood score</span>
                <span className="font-semibold text-slate-900">{avgMood} / 5</span>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-emerald-600">
            <TrendingUp size={16} /> Successes
          </h2>
          {stats.successGoals.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing marked yet — even a small win counts.</p>
          ) : (
            <ul className="space-y-2">
              {stats.successGoals.slice(0, 8).map((g) => (
                <li key={g.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" />
                  <span className="min-w-0">
                    <span className="block truncate">{g.title}</span>
                    <span className="text-[11px] text-slate-500">{HORIZON_LABEL[g.horizon]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-rose-600">
            <TrendingDown size={16} /> Failures
          </h2>
          {stats.failedGoals.length === 0 ? (
            <p className="text-sm text-slate-500">No failures marked. Honest marking makes this useful.</p>
          ) : (
            <ul className="space-y-2">
              {stats.failedGoals.slice(0, 8).map((g) => (
                <li key={g.id} className="flex items-start gap-2 text-sm text-slate-700">
                  <XCircle size={15} className="mt-0.5 shrink-0 text-rose-400" />
                  <span className="min-w-0">
                    <span className="block truncate">{g.title}</span>
                    <span className="text-[11px] text-slate-500">{HORIZON_LABEL[g.horizon]}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900">
            <Lightbulb size={16} className="text-amber-500" /> Recent mood
          </h2>
          <ul className="space-y-2">
            {data.journal.slice(0, 6).map((j) => {
              const m = moodBadge(j.mood)
              return (
                <li key={j.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-600">{format(new Date(j.entry_date + 'T00:00'), 'd MMM')} · {j.title || 'Untitled'}</span>
                  <span className={`chip shrink-0 ${m.cls}`}>{m.emoji}</span>
                </li>
              )
            })}
            {data.journal.length === 0 && <p className="text-sm text-slate-500">No journal entries yet.</p>}
          </ul>
        </div>
      </section>

      <section className="card p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Brain size={16} className="text-violet-400" /> Weekly review
            </h2>
            <p className="text-xs text-slate-500">Week of {weekStart()} · saved reviews stay in your history</p>
          </div>
          <button onClick={autoFill} className="btn-ghost text-xs">
            <Sparkles size={14} /> Auto-fill from my data
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="What went well (wins)" value={wins} onChange={setWins} placeholder={'• Finished the dashboard\n• Woke up early 5 days'} />
          <Field label="What went wrong (failures)" value={failures} onChange={setFailures} placeholder={'• Skipped gym twice\n• Procrastinated on client email'} />
          <Field label="Lessons learned" value={lessons} onChange={setLessons} placeholder="What will I remember from this week?" />
          <Field label="Next week actions" value={nextActions} onChange={setNextActions} placeholder={'• Block 1h morning for deep work\n• Say no to late-night scrolling'} />
        </div>

        <div className="mt-4">
          <label className="label">Overall week score: {score}/100</label>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            className="w-full accent-violet-500"
          />
          <div className="mt-1">
            <Progress value={score} tone={score >= 70 ? 'emerald' : score >= 40 ? 'violet' : 'rose'} />
          </div>
        </div>

        <div className="mt-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div className="text-xs text-slate-500">
            {data.analysis ? (
              <>
                Last saved review: <span className="text-slate-600">{data.analysis.period_start}</span> · score{' '}
                <span className="text-violet-300">{data.analysis.score}</span>
              </>
            ) : (
              'No review saved yet.'
            )}
          </div>
          <button onClick={submit} disabled={busy} className="btn-primary">
            <Save size={16} /> {busy ? 'Saving…' : 'Save weekly review'}
          </button>
        </div>

        {data.analysis && (
          <div className="mt-5 grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <Prev label="Wins" text={data.analysis.wins} />
            <Prev label="Failures" text={data.analysis.failures} />
            <Prev label="Lessons" text={data.analysis.lessons} />
            <Prev label="Next actions" text={data.analysis.next_actions} />
            <p className="col-span-full text-[11px] text-slate-500">
              Review saved · {format(subDays(new Date(), 0), 'd MMM yyyy')}
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

function MetricCard({
  icon,
  label,
  value,
  sub,
  tone,
  progress,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  tone: 'violet' | 'emerald' | 'sky' | 'amber'
  progress?: number
}) {
  const cls = {
    violet: 'bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100',
    emerald: 'bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100',
    sky: 'bg-sky-50 text-sky-600 ring-1 ring-inset ring-sky-100',
    amber: 'bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-100',
  }[tone]

  return (
    <div className="card p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${cls}`}>{icon}</span>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      <p className="mb-2 text-[11px] text-slate-500">{sub}</p>
      {typeof progress === 'number' && <Progress value={progress} tone={tone === 'sky' ? 'violet' : tone === 'amber' ? 'emerald' : tone} />}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <textarea
        className="input min-h-[110px] resize-y leading-relaxed"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  )
}

function Prev({ label, text }: { label: string; text: string | null }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-0.5 whitespace-pre-line text-slate-600">{text || '—'}</p>
    </div>
  )
}
