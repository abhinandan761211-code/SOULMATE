import { useEffect, useMemo, useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import { BookOpen, Check, ImageIcon, Minus, Plus, Save, Trash2, X } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { createHabit, deleteHabit, deleteJournal, markHabit, saveJournal, today as todayStr } from '../lib/api'
import { MOODS, type HabitMark, type Mood } from '../lib/types'
import { moodBadge } from '../lib/stats'
import { uploadJournalPhotos } from '../lib/storage'
import { EmptyState, PageHeader } from '../components/ui'
import { PhotoPicker } from '../components/QuickCapture'

export default function Journal() {
  const { user, data, refresh } = useApp()
  const [date, setDate] = useState(todayStr())
  const [title, setTitle] = useState('')
  const [mood, setMood] = useState<Mood | null>(null)
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [newHabit, setNewHabit] = useState('')
  // photos already stored on the entry + newly picked files for this save
  const [photos, setPhotos] = useState<string[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])

  const existing = useMemo(() => data.journal.find((j) => j.entry_date === date), [data.journal, date])

  useEffect(() => {
    setTitle(existing?.title ?? '')
    setMood((existing?.mood as Mood | null) ?? null)
    setContent(existing?.content ?? '')
    setPhotos(existing?.photos ?? [])
    setNewFiles([])
    setSavedAt(null)
  }, [existing, date])

  const handleSave = async () => {
    if (!user) return
    setSaving(true)
    try {
      const uploaded = newFiles.length ? await uploadJournalPhotos(user.id, newFiles) : []
      const all = [...photos, ...uploaded]
      await saveJournal(user.id, { entry_date: date, title, mood, content, photos: all })
      setPhotos(all)
      setNewFiles([])
      await refresh()
      setSavedAt(format(new Date(), 'HH:mm'))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!existing) return
    await deleteJournal(existing.id)
    await refresh()
  }

  const addHabit = async () => {
    if (!user || !newHabit.trim()) return
    await createHabit(user.id, newHabit.trim())
    setNewHabit('')
    await refresh()
  }

  const removeHabit = async (id: string) => {
    await deleteHabit(id)
    await refresh()
  }

  const setMark = async (habitId: string, mark: HabitMark) => {
    if (!user) return
    await markHabit(user.id, habitId, date, mark)
    await refresh()
  }

  const last14 = Array.from({ length: 14 }, (_, i) => format(subDays(new Date(), 13 - i), 'yyyy-MM-dd'))
  const logsForDate = data.habitLogs.filter((l) => l.log_date === date)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Daily Journal"
        subtitle="Write about your day, mark what went right and wrong, and keep a habit streak."
        actions={
          <>
            <input
              type="date"
              aria-label="Journal date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="input w-auto"
            />
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              <Save size={16} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="card flex flex-col p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">
              {format(parseISO(date), 'EEEE, d MMMM yyyy')}
              {existing && <span className="ml-2 chip bg-emerald-50 text-emerald-700">saved</span>}
            </p>
            {existing && (
              <button onClick={handleDelete} className="btn-icon hover:bg-rose-50 hover:text-rose-600" title="Delete entry">
                <Trash2 size={16} />
              </button>
            )}
          </div>

          <label className="label">Title</label>
          <input
            className="input mb-4"
            placeholder="How was your day in one line?"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="label">Mood</label>
          <div className="mb-4 flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.value}
                onClick={() => setMood(mood === m.value ? null : m.value)}
                aria-pressed={mood === m.value}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-[background-color,border-color,color,box-shadow] duration-150 ${mood === m.value
                    ? 'border-brand-300 bg-brand-50 font-medium text-brand-700 shadow-xs'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
              >
                <span>{m.emoji}</span> {m.label}
              </button>
            ))}
          </div>

          <label className="label">What happened today?</label>
          <textarea
            className="input min-h-[260px] flex-1 resize-y leading-relaxed"
            placeholder="What did you do? What went well? What went wrong? What will you do differently tomorrow?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* photos: stored URLs + files picked for the next save */}
          <div className="mt-3 space-y-2">
            <span className="label mb-0 flex items-center gap-1.5">
              <ImageIcon size={12} /> Photos
            </span>
            {(photos.length > 0 || newFiles.length > 0) && (
              <div className="flex flex-wrap gap-2">
                {photos.map((url) => (
                  <span key={url} className="group relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-700">
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <button
                      onClick={() => setPhotos(photos.filter((p) => p !== url))}
                      className="absolute inset-0 hidden items-center justify-center bg-slate-900/60 text-white group-hover:flex"
                      aria-label="Remove photo"
                      type="button"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <PhotoPicker files={newFiles} setFiles={setNewFiles} />
            {newFiles.length > 0 && (
              <p className="text-[11px] text-slate-500">
                {newFiles.length} photo{newFiles.length > 1 ? 's' : ''} will upload when you press Save.
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{content.trim() ? `${content.trim().split(/\s+/).length} words` : 'Start writing…'}</span>
            {savedAt && (
              <span className="flex items-center gap-1 font-medium text-emerald-600">
                <Check size={12} /> Saved at {savedAt}
              </span>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">Habits · right / wrong</h2>
            <div className="mb-3 flex gap-2">
              <input
                className="input"
                placeholder="e.g. Woke up at 6"
                value={newHabit}
                onChange={(e) => setNewHabit(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHabit()}
              />
              <button onClick={addHabit} className="btn-ghost px-3" title="Add habit">
                <Plus size={16} />
              </button>
            </div>

            {data.habits.length === 0 ? (
              <EmptyState icon={<Check size={20} />} title="No habits yet" hint="Add 3–5 habits you want to do daily." />
            ) : (
              <ul className="space-y-2">
                {data.habits.map((h) => {
                  const log = logsForDate.find((l) => l.habit_id === h.id)
                  return (
                    <li key={h.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-slate-50">
                      <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{h.name}</span>
                      <button
                        onClick={() => setMark(h.id, 'yes')}
                        aria-pressed={log?.mark === 'yes'}
                        aria-label={`${h.name}: did it right`}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${log?.mark === 'yes'
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-emerald-950 dark:hover:text-emerald-400'
                          }`}
                        title="Right / done"
                      >
                        <Check size={14} strokeWidth={3} />
                      </button>
                      {/* a cross, not a bin — this marks the habit wrong, it does not delete it */}
                      <button
                        onClick={() => setMark(h.id, 'no')}
                        aria-pressed={log?.mark === 'no'}
                        aria-label={`${h.name}: missed`}
                        className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${log?.mark === 'no'
                            ? 'bg-rose-500 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:bg-slate-800 dark:text-slate-500 dark:hover:bg-rose-950 dark:hover:text-rose-400'
                          }`}
                        title="Wrong / missed"
                      >
                        <Minus size={14} strokeWidth={3} />
                      </button>
                      <button
                        onClick={() => removeHabit(h.id)}
                        className="btn-icon opacity-0 group-hover:opacity-100"
                        title="Delete habit"
                      >
                        <Trash2 size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-slate-900">Last 14 days</h2>
            <div className="space-y-2">
              {data.habits.map((h) => (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 truncate text-[11px] text-slate-400">{h.name}</span>
                  <div className="flex flex-1 gap-1">
                    {last14.map((day) => {
                      const log = data.habitLogs.find((l) => l.habit_id === h.id && l.log_date === day)
                      const cls =
                        log?.mark === 'yes'
                          ? 'bg-emerald-500'
                          : log?.mark === 'no'
                            ? 'bg-rose-500'
                            : 'bg-slate-100'
                      return <span key={day} className={`h-4 flex-1 rounded-sm ${cls}`} title={day} />
                    })}
                  </div>
                </div>
              ))}
              {data.habits.length === 0 && <p className="text-xs text-slate-500">Add habits to see the grid.</p>}
            </div>
          </section>
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-tight text-slate-900">
          <BookOpen size={16} className="text-brand-500" /> Past entries
        </h2>
        {data.journal.length === 0 ? (
          <EmptyState icon={<BookOpen size={22} />} title="No entries yet" hint="Your first entry is the hardest — write 3 lines." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.journal.slice(0, 12).map((j) => {
              const m = moodBadge(j.mood)
              return (
                <button
                  key={j.id}
                  onClick={() => setDate(j.entry_date)}
                  className={`rounded-xl border p-3 text-left transition-[background-color,border-color] duration-150 hover:border-slate-300 hover:bg-slate-50 ${j.entry_date === date ? 'border-brand-300 bg-brand-50/60' : 'border-slate-200 bg-white'
                    }`}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{format(parseISO(j.entry_date), 'd MMM yyyy')}</span>
                    <span className={`chip ${m.cls}`}>
                      {m.emoji} {m.text}
                    </span>
                  </div>
                  <p className="truncate text-sm font-medium text-slate-800">{j.title || 'Untitled'}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{j.content}</p>
                  {(j.photos?.length ?? 0) > 0 && (
                    <div className="mt-2 flex gap-1">
                      {j.photos!.slice(0, 3).map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt=""
                          loading="lazy"
                          className="h-8 w-8 rounded object-cover ring-1 ring-slate-200 dark:ring-slate-700"
                        />
                      ))}
                      {j.photos!.length > 3 && (
                        <span className="flex h-8 w-8 items-center justify-center rounded bg-slate-100 text-[10px] font-medium text-slate-500 dark:bg-slate-800">
                          +{j.photos!.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
