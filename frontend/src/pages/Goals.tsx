import { useMemo, useState } from 'react'
import { addDays, format } from 'date-fns'
import {
  Check,
  CheckCircle2,
  CircleDashed,
  Flag,
  Plus,
  Rocket,
  Repeat as RepeatIcon,
  X,
  XCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createGoal, updateGoal, today as todayStr } from '../lib/api'
import { HORIZON_LABEL, HORIZON_ORDER, type Goal, type GoalStatus, type Horizon, type Priority } from '../lib/types'
import { REPEAT_OPTIONS, repeatLabel, type Repeat } from '../lib/recurring'
import { EmptyState, Modal, PageHeader, Progress } from '../components/ui'

type Tab = 'daily' | 'present' | 'future' | 'results'

const TABS: { key: Tab; label: string; hint: string }[] = [
  { key: 'daily', label: 'Daily plan', hint: 'Today · tomorrow · day after' },
  { key: 'present', label: 'Present goals', hint: 'This week / month / year' },
  { key: 'future', label: 'Future goals', hint: 'Long-term vision' },
  { key: 'results', label: 'Success & failure', hint: 'What you marked' },
]

/** Daily planning columns: today / tomorrow / day after all belong to the daily tab. */
const DAILY_HORIZONS: Horizon[] = ['today', 'tomorrow', 'day_after']

const HORIZON_DEFAULT_DATE: Partial<Record<Horizon, () => string>> = {
  today: () => todayStr(),
  tomorrow: () => format(addDays(new Date(), 1), 'yyyy-MM-dd'),
  day_after: () => format(addDays(new Date(), 2), 'yyyy-MM-dd'),
}

export default function Goals() {
  const { user, data, refresh } = useApp()
  const [tab, setTab] = useState<Tab>('daily')
  const [open, setOpen] = useState(false)
  const [presetHorizon, setPresetHorizon] = useState<Horizon>('today')
  const [presetBucket, setPresetBucket] = useState<'future' | 'present'>('present')
  const [presetRepeat, setPresetRepeat] = useState<Repeat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const goals = data.goals

  const daily = useMemo(
    () =>
      (['today', 'tomorrow', 'day_after'] as Horizon[]).map((h) => ({
        horizon: h,
        items: goals.filter(
          (g) =>
            g.horizon === h ||
            (h === 'today' && g.due_date === todayStr()) ||
            (h === 'tomorrow' && g.due_date === format(addDays(new Date(), 1), 'yyyy-MM-dd')),
        ),
      })),
    [goals],
  )

  // `daily` shows today/tomorrow/day-after, so present & future must not repeat them
  const present = goals.filter((g) => g.bucket === 'present' && !DAILY_HORIZONS.includes(g.horizon))
  const future = goals.filter((g) => g.bucket === 'future' && !DAILY_HORIZONS.includes(g.horizon))
  const results = goals.filter((g) => g.status === 'success' || g.status === 'failed')

  const setStatus = async (g: Goal, status: GoalStatus) => {
    try {
      await updateGoal(g.id, {
        status,
        completed_at: status === 'success' ? new Date().toISOString() : null,
        progress: status === 'success' ? 100 : status === 'planned' ? 0 : g.progress,
        bucket: status === 'success' ? 'done' : g.bucket === 'done' ? 'present' : g.bucket,
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the goal')
    }
  }

  /** one click from the repeat bar: create a daily goal right away */
  const quickRecurring = async (title: string) => {
    if (!user) return
    try {
      await createGoal(user.id, {
        title,
        horizon: 'today',
        bucket: 'present',
        status: 'planned',
        priority: 'medium',
        progress: 0,
        due_date: todayStr(),
        repeat: 'daily',
      })
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the goal')
    }
  }

  const openNew = (horizon: Horizon, bucket: 'future' | 'present', repeat: Repeat | null = null) => {
    setPresetHorizon(horizon)
    setPresetBucket(bucket)
    setPresetRepeat(repeat)
    setOpen(true)
  }



  const totalDecided = goals.filter((g) => g.status === 'success' || g.status === 'failed').length
  const successCount = goals.filter((g) => g.status === 'success').length
  const rate = totalDecided ? Math.round((successCount / totalDecided) * 100) : 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Goals"
        subtitle="Plan today, tomorrow and the future — then mark honestly whether it turned out right or wrong."
        actions={
          <button onClick={() => openNew('today', 'present')} className="btn-primary">
            <Plus size={16} /> New goal
          </button>
        }
      />

      {error && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-3.5 py-2 text-left text-xs font-medium transition ${
              tab === t.key
                ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-200'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span className="block text-sm">{t.label}</span>
            <span className="hidden text-[10px] font-normal opacity-70 sm:block">{t.hint}</span>
          </button>
        ))}
      </div>

      {tab === 'daily' && (
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-slate-300/80 bg-slate-50/60 px-3 py-2 dark:border-slate-700 dark:bg-slate-900/40">
          <RepeatIcon size={14} className="shrink-0 text-slate-400" />
          <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">Repeat every day:</span>
          <div className="flex flex-wrap gap-1.5">
            {['Wake up early', 'Workout', 'Read 20 pages', 'No phone after 10pm', 'Plan tomorrow'].map((title) => (
              <button
                key={title}
                onClick={() => quickRecurring(title)}
                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-brand-600 dark:hover:bg-brand-950/40"
                title={`Create “${title}” as a daily recurring goal`}
              >
                + {title}
              </button>
            ))}
          </div>
        </section>
      )}

      {tab === 'daily' && (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {daily.map(({ horizon, items }) => (
            <section key={horizon} className="card p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{HORIZON_LABEL[horizon]}</h2>
                  <p className="text-[11px] text-slate-500">
                    {horizon === 'today'
                      ? format(new Date(), 'd MMM')
                      : horizon === 'tomorrow'
                        ? format(addDays(new Date(), 1), 'd MMM')
                        : format(addDays(new Date(), 2), 'd MMM')}
                  </p>
                </div>
                <button onClick={() => openNew(horizon, 'present')} className="btn-icon" title="Add">
                  <Plus size={16} />
                </button>
              </div>
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 rounded-lg border border-dashed border-slate-200 px-3 py-5 text-center dark:border-slate-700">
                  <p className="text-xs text-slate-400">Nothing planned yet.</p>
                  <button
                    onClick={() => openNew(horizon, 'present')}
                    className="text-[11px] font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300 dark:hover:text-brand-200"
                  >
                    + Add a goal
                  </button>
                </div>
              ) : (
                <GoalRows goals={items} onStatus={setStatus} />
              )}
            </section>
          ))}
        </div>
      )}

      {tab === 'present' && (
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Rocket size={16} className="text-violet-500" /> Present goals
            </h2>
            <button onClick={() => openNew('week', 'present')} className="btn-ghost text-xs">
              <Plus size={14} /> Add present goal
            </button>
          </div>
          {present.length === 0 ? (
            <EmptyState
              icon={<Rocket size={22} />}
              title="No active present goals"
              hint="What are you working on this week, month or year? Add it and track progress."
            />
          ) : (
            <div className="space-y-3">
              {present.map((g) => (
                <GoalCard key={g.id} goal={g} onStatus={setStatus} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'future' && (
        <section className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-semibold text-slate-900">
              <Flag size={16} className="text-fuchsia-500" /> Future goals
            </h2>
            <button onClick={() => openNew('long_term', 'future')} className="btn-ghost text-xs">
              <Plus size={14} /> Add future goal
            </button>
          </div>
          {future.length === 0 ? (
            <EmptyState
              icon={<Flag size={22} />}
              title="No future goals"
              hint="Where do you want to be in 1, 3 or 5 years? Write it down — vague dreams never get done."
            />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {future.map((g) => (
                <GoalCard key={g.id} goal={g} onStatus={setStatus} />
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'results' && (
        <div className="space-y-5">
          <section className="grid gap-4 sm:grid-cols-3">
            <div className="card p-4">
              <p className="text-xs text-slate-500">Success rate</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{rate}%</p>
              <div className="mt-2">
                <Progress value={rate} tone="emerald" />
              </div>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Marked successful</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">{successCount}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-500">Marked failed</p>
              <p className="mt-1 text-2xl font-bold text-rose-600">{results.length - successCount}</p>
            </div>
          </section>

          {results.length === 0 ? (
            <section className="card p-5">
              <EmptyState icon={<CheckCircle2 size={22} />} title="No results yet" hint="Mark goals as success or failed to build your analysis." />
            </section>
          ) : (
            <section className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px]">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="th">Goal</th>
                      <th className="th">Horizon</th>
                      <th className="th">Result</th>
                      <th className="th">Note</th>
                      <th className="th w-10" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {results.map((g) => (
                      <tr key={g.id}>
                        <td className="td">{g.title}</td>
                        <td className="td text-slate-500">{HORIZON_LABEL[g.horizon]}</td>
                        <td className="td">
                          <span
                            className={`chip ${g.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                          >
                            {g.status === 'success' ? 'success' : 'failed'}
                          </span>
                        </td>
                        <td className="td max-w-[240px] truncate text-slate-500">{g.result_note || '—'}</td>
                        <td className="td">
                          <button onClick={() => setStatus(g, 'planned')} className="btn-icon" title="Reset">
                            <CircleDashed size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Add a goal">
        <GoalForm
          defaultHorizon={presetHorizon}
          defaultBucket={presetBucket}
          defaultRepeat={presetRepeat}
          onSubmit={async (payload) => {
            await createGoal(user!.id, payload)
            await refresh()
            setOpen(false)
          }}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  )
}

function GoalRows({
  goals,
  onStatus,
}: {
  goals: Goal[]
  onStatus: (g: Goal, s: GoalStatus) => void
}) {
  return (
    <ul className="space-y-1">
      {goals.map((g) => {
        const done = g.status === 'success'
        const failed = g.status === 'failed'
        return (
          <li
            key={g.id}
            className={`group flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-slate-50 ${
              done ? 'opacity-70' : ''
            }`}
          >
            <span
              className={`min-w-0 flex-1 truncate text-sm ${
                done
                  ? 'text-slate-400 line-through'
                  : failed
                    ? 'text-slate-400 line-through decoration-rose-300'
                    : 'text-slate-700'
              }`}
              title={g.description ?? g.title}
            >
              {g.title}
            </span>

            {repeatLabel(g) && (
              <span
                className="chip shrink-0 bg-brand-50 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300"
                title={`Recurring · ${repeatLabel(g)}`}
              >
                <RepeatIcon size={10} />
              </span>
            )}

            {/* Pass / Fail marking — this is what feeds the success ratio */}
            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => onStatus(g, done ? 'planned' : 'success')}
                aria-pressed={done}
                aria-label={done ? `Unmark pass for "${g.title}"` : `Mark "${g.title}" as pass`}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
                title={done ? 'Marked pass — click to clear' : 'Mark as pass'}
              >
                <Check size={12} strokeWidth={3} />
                <span className="hidden sm:inline">Pass</span>
              </button>
              <button
                onClick={() => onStatus(g, failed ? 'planned' : 'failed')}
                aria-pressed={failed}
                aria-label={failed ? `Unmark fail for "${g.title}"` : `Mark "${g.title}" as fail`}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-semibold transition ${
                  failed
                    ? 'bg-rose-500 text-white'
                    : 'text-slate-400 hover:bg-rose-50 hover:text-rose-700'
                }`}
                title={failed ? 'Marked fail — click to clear' : 'Mark as fail'}
              >
                <X size={12} strokeWidth={3} />
                <span className="hidden sm:inline">Fail</span>
              </button>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function GoalCard({
  goal,
  onStatus,
}: {
  goal: Goal
  onStatus: (g: Goal, s: GoalStatus) => void
}) {
  const tone = goal.status === 'success' ? 'emerald' : goal.status === 'failed' ? 'rose' : 'violet'
  const done = goal.status === 'success'
  const failed = goal.status === 'failed'
  return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`truncate font-medium ${done || failed ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
              {goal.title}
            </p>
            {goal.description && <p className="mt-1 line-clamp-2 text-xs text-slate-500">{goal.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {(done || failed) && (
              <span
                className={`chip ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}
              >
                {done ? 'Done' : 'Failed'}
              </span>
            )}
            <span className="chip bg-slate-100 text-slate-600">{HORIZON_LABEL[goal.horizon]}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <Progress value={goal.progress} tone={tone} />
          <span className="w-9 text-right text-[11px] font-medium text-slate-500">{goal.progress}%</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {goal.due_date && <span className="chip bg-slate-100 text-slate-500">due {goal.due_date}</span>}
          <span
            className={`chip capitalize ${goal.priority === 'high'
                ? 'bg-rose-50 text-rose-700'
                : goal.priority === 'low'
                  ? 'bg-sky-50 text-sky-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
          >
            {goal.priority}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onStatus(goal, done ? 'planned' : 'success')}
              aria-pressed={done}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                done
                  ? 'border-emerald-500 bg-emerald-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <CheckCircle2 size={13} /> {done ? 'Completed' : 'Mark done'}
            </button>
            <button
              onClick={() => onStatus(goal, failed ? 'planned' : 'failed')}
              aria-pressed={failed}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                failed
                  ? 'border-rose-500 bg-rose-500 text-white'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700'
              }`}
            >
              <XCircle size={13} /> {failed ? 'Marked failed' : 'Failed'}
            </button>
          </div>
        </div>
      </div>
  )
}

function GoalForm({
  defaultHorizon,
  defaultBucket,
  defaultRepeat = null,
  onSubmit,
  onCancel,
}: {
  defaultHorizon: Horizon
  defaultBucket: 'future' | 'present'
  defaultRepeat?: Repeat | null
  onSubmit: (payload: {
    title: string
    description: string | null
    horizon: Horizon
    bucket: 'future' | 'present'
    priority: Priority
    due_date: string | null
    progress: number
    status: GoalStatus
    repeat: Repeat | null
  }) => Promise<void>
  onCancel: () => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [horizon, setHorizon] = useState<Horizon>(defaultHorizon)
  const [bucket, setBucket] = useState<'future' | 'present'>(defaultBucket)
  const [priority, setPriority] = useState<Priority>('medium')
  const [dueDate, setDueDate] = useState(HORIZON_DEFAULT_DATE[defaultHorizon]?.() ?? '')
  const [progress, setProgress] = useState(0)
  const [repeat, setRepeat] = useState<Repeat | null>(defaultRepeat)
  const [busy, setBusy] = useState(false)

  const changeHorizon = (h: Horizon) => {
    setHorizon(h)
    const auto = HORIZON_DEFAULT_DATE[h]?.()
    if (auto) setDueDate(auto)
    if (h === 'long_term') setBucket('future')
    if (h === 'today' || h === 'tomorrow' || h === 'day_after') setBucket('present')
  }

  const submit = async () => {
    if (!title.trim()) return
    setBusy(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || null,
        horizon,
        bucket,
        priority,
        due_date: dueDate || null,
        progress,
        status: progress > 0 ? 'in_progress' : 'planned',
        repeat,
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Goal</label>
        <input
          className="input"
          autoFocus
          placeholder="e.g. Finish the login page"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>

      <div>
        <label className="label">Details (optional)</label>
        <textarea
          className="input min-h-[70px] resize-y"
          placeholder="Why does this matter? What does 'done' look like?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">When</label>
          <select className="input" value={horizon} onChange={(e) => changeHorizon(e.target.value as Horizon)}>
            {HORIZON_ORDER.map((h) => (
              <option key={h} value={h}>
                {HORIZON_LABEL[h]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Bucket</label>
          <select className="input" value={bucket} onChange={(e) => setBucket(e.target.value as 'future' | 'present')}>
            <option value="present">Present</option>
            <option value="future">Future</option>
          </select>
        </div>
        <div>
          <label className="label">Due date</label>
          <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>

      <div>
        <label className="label">Repeat</label>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setRepeat(null)}
            aria-pressed={repeat === null}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
              repeat === null
                ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            One-off
          </button>
          {REPEAT_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setRepeat(o.value)}
              aria-pressed={repeat === o.value}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                repeat === o.value
                  ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-600 dark:bg-brand-900/40 dark:text-brand-200'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {repeat && (
          <p className="mt-1.5 text-[11px] text-slate-500">
            A fresh copy appears automatically when it’s due — mark each one success or failed.
          </p>
        )}
      </div>

      <div>
        <label className="label">Progress: {progress}%</label>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={progress}
          onChange={(e) => setProgress(Number(e.target.value))}
          className="w-full accent-violet-500"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button onClick={submit} disabled={busy || !title.trim()} className="btn-primary">
          {busy ? 'Saving…' : 'Save goal'}
        </button>
      </div>
    </div>
  )
}
