import { useMemo, useRef, useState } from 'react'
import { addDays, format, parseISO } from 'date-fns'
import {
  Check,
  Flame,
  Plus,
  Target,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  clearChallengeDay,
  createChallenge,
  deleteChallenge,
  markChallengeDay,
  today as todayStr,
} from '../lib/api'
import { challengeRollup, challengeStats, dayNumber, isFinished, isRunning } from '../lib/challenges'
import { CHALLENGE_PRESETS, type Challenge } from '../lib/types'
import { EmptyState, Modal, PageHeader, Progress } from '../components/ui'

type Filter = 'active' | 'finished' | 'all'

export default function Challenges() {
  const { user, data, refresh } = useApp()
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('active')

  const today = todayStr()

  const withStats = useMemo(
    () =>
      data.challenges.map((c) => ({
        challenge: c,
        stats: challengeStats(c, data.challengeLogs, today),
      })),
    [data.challenges, data.challengeLogs, today],
  )

  const running = withStats.filter((x) => !x.stats.finished && isRunning(x.challenge, today))
  const upcoming = withStats.filter((x) => dayNumber(x.challenge, today) < 1)
  const finished = withStats.filter((x) => x.stats.finished)

  const visible =
    filter === 'active'
      ? [...running, ...upcoming]
      : filter === 'finished'
        ? finished
        : withStats

  const mark = async (c: Challenge, result: 'pass' | 'fail') => {
    if (!user) return
    setError(null)
    try {
      const existing = data.challengeLogs.find((l) => l.challenge_id === c.id && l.log_date === today)
      // clicking the same result again clears the day
      if (existing?.result === result) {
        await clearChallengeDay(c.id, today)
      } else {
        await markChallengeDay(user.id, c.id, today, result)
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that mark')
    }
  }

  const remove = async (id: string) => {
    setError(null)
    try {
      await deleteChallenge(id)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete the challenge')
    }
  }

  // summary across every active challenge — for the header KPIs
  const activeCount = running.length
  const rollup = challengeRollup(data.challenges, data.challengeLogs, today)
  const overallRate = rollup.rate
  const bestStreak = withStats.reduce((m, x) => Math.max(m, x.stats.streak), 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Challenges"
        subtitle="Pick a length, show up every day, and mark it honestly as pass or fail. Run as many at once as you like."
        actions={
          <button onClick={() => setOpen(true)} className="btn-primary shrink-0">
            <Plus size={16} /> New challenge
          </button>
        }
      />

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Active challenges</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-slate-900">{activeCount}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Overall pass rate</p>
          <p className="mt-1 text-2xl font-bold tabular-nums tracking-tight text-emerald-600">{overallRate}%</p>
          <div className="mt-2">
            <Progress value={overallRate} tone="emerald" />
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs font-medium text-slate-500">Best current streak</p>
          <p className="mt-1 flex items-baseline gap-1.5 whitespace-nowrap text-2xl font-bold tabular-nums tracking-tight text-slate-900">
            <Flame size={18} className="shrink-0 self-center text-amber-500" />
            {bestStreak}
            <span className="text-sm font-medium text-slate-400">days</span>
          </p>
        </div>
      </section>

      {/* ---------- success / failure ratio across all active challenges ---------- */}
      <section className="card p-5">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="flex items-center gap-2 font-semibold text-slate-900">
            <TrendingUp size={16} className="text-emerald-500" /> Success / failure ratio
          </h2>
          <p className="text-[11px] text-slate-500">
            Only <span className="font-medium text-slate-700">marked days</span> share the 100% — 2 marked = 50% each, 3 marked = 33.3% each
          </p>
        </div>

        {rollup.active === 0 ? (
          <EmptyState
            icon={<TrendingUp size={22} />}
            title="No active challenge"
            hint="Start one above and this ratio fills in as you mark each day."
          />
        ) : (
          <>
            {/* headline split bar */}
            <div className="mt-4">
              <div className="mb-2 flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold tabular-nums text-emerald-600">{overallRate}%</p>
                  <p className="text-[11px] text-slate-500">
                    {rollup.pass} pass · {rollup.fail} fail · {rollup.unmarked} unmarked
                  </p>
                </div>
                <p className="text-[11px] text-slate-500">
                  Discipline <span className="font-semibold text-slate-700">{rollup.discipline}%</span>
                  <span className="mx-1 text-slate-300">·</span>
                  {rollup.active} running
                </p>
              </div>
              <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${rollup.rate}%` }} />
                <div className="h-full bg-rose-500" style={{ width: `${100 - rollup.rate}%` }} />
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded bg-emerald-500" /> Pass {rollup.pass}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded bg-rose-500" /> Fail {rollup.fail}
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded bg-slate-200" /> Unmarked {rollup.unmarked}
                </span>
              </div>
            </div>

            {/* per-challenge breakdown — cards on mobile, table from sm up */}
            <div className="mt-5 space-y-2 sm:hidden">
              {rollup.rows.map(({ challenge, ratio }) => (
                <div key={challenge.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{challenge.title}</p>
                      <p className="text-[11px] text-slate-400">{challenge.duration} days</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-800">
                      {ratio.marked ? `${ratio.rate}%` : '—'}
                    </span>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-100">
                    {ratio.marked > 0 && (
                      <>
                        <div className="h-full bg-emerald-500" style={{ width: `${ratio.rate}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${100 - ratio.rate}%` }} />
                      </>
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-x-3 text-[11px] text-slate-500">
                    <span className="text-emerald-600">{ratio.pass} pass</span>
                    <span className="text-rose-600">{ratio.fail} fail</span>
                    <span>{ratio.marked} marked</span>
                    <span className="ml-auto">
                      {ratio.marked ? `each ${ratio.perDay % 1 === 0 ? ratio.perDay : ratio.perDay.toFixed(1)}%` : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 hidden overflow-x-auto sm:block">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-3 font-medium">Challenge</th>
                    <th className="pb-2 pr-3 text-right font-medium">Marked</th>
                    <th className="pb-2 pr-3 text-right font-medium">Per day</th>
                    <th className="pb-2 pr-3 text-right font-medium">Pass</th>
                    <th className="pb-2 pr-3 text-right font-medium">Fail</th>
                    <th className="w-[34%] pb-2 font-medium">Ratio</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rollup.rows.map(({ challenge, ratio }) => (
                    <tr key={challenge.id}>
                      <td className="py-2.5 pr-3">
                        <span className="block truncate font-medium text-slate-800">{challenge.title}</span>
                        <span className="text-[11px] text-slate-400">{challenge.duration} days</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-600">{ratio.marked}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums text-slate-500">
                        {ratio.marked ? `${ratio.perDay % 1 === 0 ? ratio.perDay : ratio.perDay.toFixed(1)}%` : '—'}
                      </td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-emerald-600">{ratio.pass}</td>
                      <td className="py-2.5 pr-3 text-right font-medium tabular-nums text-rose-600">{ratio.fail}</td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                            {ratio.marked > 0 && (
                              <>
                                <div className="h-full bg-emerald-500" style={{ width: `${ratio.rate}%` }} />
                                <div className="h-full bg-rose-500" style={{ width: `${100 - ratio.rate}%` }} />
                              </>
                            )}
                          </div>
                          <span className="w-12 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-800">
                            {ratio.marked ? `${ratio.rate}%` : '—'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
        {(
          [
            { key: 'active', label: 'Active', count: running.length + upcoming.length },
            { key: 'finished', label: 'Finished', count: finished.length },
            { key: 'all', label: 'All', count: withStats.length },
          ] as { key: Filter; label: string; count: number }[]
        ).map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${filter === f.key
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs font-normal text-slate-400">{f.count}</span>
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <section className="card p-5">
          <EmptyState
            icon={<Target size={22} />}
            title={filter === 'finished' ? 'No finished challenges yet' : 'No challenges yet'}
            hint="Start with 30 days. It is long enough to change something and short enough to finish."
          />
        </section>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {visible.map(({ challenge, stats }) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              stats={stats}
              today={today}
              todaysMark={
                data.challengeLogs.find((l) => l.challenge_id === challenge.id && l.log_date === today)?.result ?? null
              }
              onMark={(r) => mark(challenge, r)}
              onDelete={() => remove(challenge.id)}
            />
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Start a challenge">
        <ChallengeForm
          onSubmit={async (payload) => {
            if (!user) return
            try {
              await createChallenge(user.id, payload)
              await refresh()
              setOpen(false)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Could not create the challenge')
              setOpen(false)
            }
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  )
}

function ChallengeCard({
  challenge,
  stats,
  today,
  todaysMark,
  onMark,
  onDelete,
}: {
  challenge: Challenge
  stats: ReturnType<typeof challengeStats>
  today: string
  todaysMark: 'pass' | 'fail' | null
  onMark: (r: 'pass' | 'fail') => void
  onDelete: () => void
}) {
  const started = dayNumber(challenge, today) >= 1
  const running = isRunning(challenge, today)
  const done = isFinished(challenge, today)

  return (
    <section className="card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <Flame size={15} />
            </span>
            <h2 className="truncate font-semibold text-slate-900">{challenge.title}</h2>
          </div>
          {challenge.description && (
            <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">{challenge.description}</p>
          )}
        </div>
        <button
          onClick={onDelete}
          className="btn-icon shrink-0 text-slate-400 hover:text-rose-600"
          title="Delete challenge"
          aria-label={`Delete ${challenge.title}`}
        >
          <X size={15} />
        </button>
      </div>

      {/* day counter + status */}
      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-slate-100 text-slate-600">{challenge.duration} days</span>
        {!started && (
          <span className="chip bg-sky-50 text-sky-700">Starts {challenge.start_date}</span>
        )}
        {running && (
          <span className="chip bg-emerald-50 text-emerald-700">
            Day {Math.min(dayNumber(challenge, today), challenge.duration)} of {challenge.duration}
          </span>
        )}
        {done && <span className="chip bg-violet-50 text-violet-700">Finished</span>}
        {stats.streak > 0 && (
          <span className="chip bg-amber-50 text-amber-700">
            <Flame size={11} /> {stats.streak} streak
          </span>
        )}
      </div>

      {/* overall progress */}
      <div className="mt-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-slate-500">
          <span>Progress</span>
          <span className="font-medium text-slate-700">
            {stats.pass + stats.fail} / {challenge.duration} days marked
          </span>
        </div>
        <Progress value={stats.progress} tone={done ? 'emerald' : 'violet'} />
      </div>

      {/* today's mark */}
      {running && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium text-slate-600">
              Today · {format(parseISO(today), 'd MMM')}
              {todaysMark && (
                <span className={todaysMark === 'pass' ? ' ml-1.5 text-emerald-600' : ' ml-1.5 text-rose-600'}>
                  marked {todaysMark}
                </span>
              )}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onMark('pass')}
                aria-pressed={todaysMark === 'pass'}
                aria-label={`Mark ${challenge.title} pass for today`}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${todaysMark === 'pass'
                    ? 'bg-emerald-500 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
                  }`}
              >
                <Check size={13} strokeWidth={3} /> Pass
              </button>
              <button
                onClick={() => onMark('fail')}
                aria-pressed={todaysMark === 'fail'}
                aria-label={`Mark ${challenge.title} fail for today`}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${todaysMark === 'fail'
                    ? 'bg-rose-500 text-white'
                    : 'border border-slate-200 bg-white text-slate-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700'
                  }`}
              >
                <X size={13} strokeWidth={3} /> Fail
              </button>
            </div>
          </div>
        </div>
      )}

      {/* day grid */}
      <div className="mt-4">
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {challenge.duration > 30 ? `First 30 of ${challenge.duration} days` : 'Daily marks'}
        </p>
        <div className="flex flex-wrap gap-1">
          {stats.grid.map((d) => {
            const cls =
              d.result === 'pass'
                ? 'bg-emerald-500 text-white'
                : d.result === 'fail'
                  ? 'bg-rose-500 text-white'
                  : d.date === today
                    ? 'border border-brand-400 bg-brand-50 text-brand-700'
                    : d.date > today
                      ? 'border border-slate-200 bg-white text-slate-300'
                      : 'border border-slate-200 bg-slate-100 text-slate-400'
            return (
              <span
                key={d.date}
                title={`Day ${d.day} · ${d.date}${d.result ? ` · ${d.result}` : ''}`}
                className={`flex h-5 w-5 items-center justify-center rounded text-[9px] font-semibold tabular-nums ${cls}`}
              >
                {d.result === 'pass' ? <Check size={10} strokeWidth={3} /> : d.result === 'fail' ? <X size={10} strokeWidth={3} /> : d.day}
              </span>
            )
          })}
        </div>
      </div>

      <div className="mt-auto grid grid-cols-4 gap-2 border-t border-slate-100 pt-3 text-center">
        <Stat label="Pass" value={stats.pass} tone="emerald" />
        <Stat label="Fail" value={stats.fail} tone="rose" />
        <Stat label="Rate" value={`${stats.rate}%`} tone="slate" />
        <Stat label="Best" value={`${stats.bestStreak}d`} tone="amber" />
      </div>
    </section>
  )
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone: 'emerald' | 'rose' | 'slate' | 'amber' }) {
  const cls = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    slate: 'text-slate-800',
    amber: 'text-amber-600',
  }[tone]
  return (
    <div>
      <p className={`text-sm font-bold tabular-nums ${cls}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
    </div>
  )
}

function ChallengeForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (p: { title: string; description: string | null; duration: number; start_date: string }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState(30)
  /** true when the user is entering their own length instead of a preset */
  const [customMode, setCustomMode] = useState(false)
  const [custom, setCustom] = useState('')
  const [startDate, setStartDate] = useState(todayStr())
  const [busy, setBusy] = useState(false)
  const customRef = useRef<HTMLInputElement>(null)

  // In custom mode the typed number wins. If it is blank or invalid we fall
  // back to the preset length rather than silently jumping to a wrong value.
  const parsed = Number(custom)
  const finalDuration = customMode && parsed >= 1 ? Math.min(Math.floor(parsed), 365) : duration
  const customInvalid = customMode && (custom === '' || parsed < 1)

  const choosePreset = (days: number) => {
    setDuration(days)
    setCustomMode(false)
    setCustom('')
  }

  const enterCustom = () => {
    setCustomMode(true)
    // pre-fill with the current length so the field is never mysteriously empty
    setCustom((v) => (v && Number(v) >= 1 ? v : String(duration)))
  }

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        duration: finalDuration,
        start_date: startDate,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Challenge</label>
        <input
          className="input"
          autoFocus
          placeholder="e.g. No sugar, 30 min workout, 10 pages daily"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      <div>
        <label className="label">Why this? (optional)</label>
        <textarea
          className="input min-h-[60px] resize-y"
          placeholder="What will be different if you finish it?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Length</label>
        <div className="grid grid-cols-3 gap-2">
          {CHALLENGE_PRESETS.map((p) => (
            <button
              key={p.days}
              type="button"
              onClick={() => choosePreset(p.days)}
              aria-pressed={!customMode && duration === p.days}
              className={`rounded-lg border px-2 py-2.5 text-center transition ${!customMode && duration === p.days
                  ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
            >
              <span className="block text-sm font-semibold">{p.label}</span>
              <span className="block text-[10px] text-slate-400">{p.hint}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={enterCustom}
            aria-pressed={customMode}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
              customMode
                ? 'border-brand-500 bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Zap size={13} className="text-amber-500" /> Custom
          </button>
          <input
            ref={customRef}
            type="number"
            min={1}
            max={365}
            inputMode="numeric"
            className={`input w-24 py-1.5 text-sm ${
              customInvalid ? 'border-rose-300 focus:border-rose-400 focus:ring-rose-500/15' : ''
            }`}
            placeholder="e.g. 21"
            aria-label="Custom number of days"
            value={custom}
            onChange={(e) => {
              setCustom(e.target.value)
              if (e.target.value) setCustomMode(true)
            }}
            onFocus={enterCustom}
          />
          <span className="text-xs text-slate-400">days</span>
        </div>
        {customInvalid && (
          <p className="mt-1.5 text-[11px] text-rose-600">
            Enter a number of days between 1 and 365 — using {duration} days until then.
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Start date</label>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Ends</label>
          <input
            type="text"
            readOnly
            className="input bg-slate-50 text-slate-500"
            value={
              startDate
                ? format(addDays(parseISO(startDate), Math.max(finalDuration - 1, 0)), 'd MMM yyyy')
                : '—'
            }
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-500">
        {customMode ? 'Custom length: ' : ''}
        {finalDuration} days
        {startDate
          ? ` · ${format(parseISO(startDate), 'd MMM')} to ${format(
              addDays(parseISO(startDate), Math.max(finalDuration - 1, 0)),
              'd MMM yyyy',
            )}`
          : ''}
      </p>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button onClick={submit} disabled={busy || !title.trim()} className="btn-primary">
          {busy ? 'Starting…' : 'Start challenge'}
        </button>
      </div>
    </div>
  )
}
