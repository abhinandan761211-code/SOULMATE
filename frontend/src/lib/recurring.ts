import { addDays, addMonths, format, isAfter, parseISO, startOfDay } from 'date-fns'
import { supabase } from './supabase'
import { isPreviewMode } from './api'
import type { Horizon, Goal } from './types'

export type Repeat = 'daily' | 'weekdays' | 'weekly' | 'monthly'

export const REPEAT_OPTIONS: { value: Repeat; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekdays', label: 'Weekdays (Mon–Fri)' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
]

/** Next occurrence strictly after `from`, following the repeat rule. */
export function nextOccurrence(from: string, repeat: Repeat): string {
  let d = parseISO(from)
  do {
    if (repeat === 'daily' || repeat === 'weekdays') d = addDays(d, 1)
    else if (repeat === 'weekly') d = addDays(d, 7)
    else d = addMonths(d, 1)
  } while (repeat === 'weekdays' && (d.getDay() === 0 || d.getDay() === 6))
  return format(d, 'yyyy-MM-dd')
}

function horizonFor(date: string): Horizon {
  const today = startOfDay(new Date())
  const d = parseISO(date)
  if (format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) return 'today'
  if (format(d, 'yyyy-MM-dd') === format(addDays(today, 1), 'yyyy-MM-dd')) return 'tomorrow'
  return 'day_after'
}

/**
 * Called on workspace load: for every active recurring template whose next
 * occurrence has arrived, create the real goal. Templates are the goals with
 * `repeat` set; each generated copy carries `series_id` so we never double up.
 * Returns how many goals were created (useful for a toast).
 */
export async function createDueRecurringGoals(userId: string, goals: Goal[]): Promise<number> {
  if (isPreviewMode()) return 0

  const templates = goals.filter((g) => g.repeat && g.series_id && (g.status === 'planned' || g.status === 'in_progress'))
  let created = 0

  for (const t of templates) {
    const base = t.due_date ?? t.created_at?.slice(0, 10) ?? format(new Date(), 'yyyy-MM-dd')
    const next = nextOccurrence(base, t.repeat as Repeat)
    // only roll forward when the next date is today or in the past
    if (isAfter(parseISO(next), startOfDay(new Date()))) continue

    const exists = goals.some((g) => g.series_id === t.series_id && g.due_date === next && g.id !== t.id)
    if (exists) continue

    const { error } = await supabase.from('goals').insert({
      user_id: userId,
      title: t.title,
      description: t.description,
      horizon: horizonFor(next),
      bucket: 'present',
      status: 'planned',
      due_date: next,
      priority: t.priority,
      progress: 0,
      repeat: t.repeat,
      series_id: t.series_id,
    })
    if (error) throw new Error(error.message)
    created += 1
  }

  return created
}

/** Short human label, e.g. "Every day". */
export function repeatLabel(g: Goal): string | null {
  if (!g.repeat) return null
  const opt = REPEAT_OPTIONS.find((o) => o.value === g.repeat)
  return opt?.label ?? null
}
