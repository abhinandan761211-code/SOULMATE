import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import { HORIZON_LABEL, HORIZON_ORDER, type AnalysisEntry, type Goal, type HabitLog, type Horizon, type JournalEntry } from './types'

export interface Stats {
  todayGoals: Goal[]
  tomorrowGoals: Goal[]
  futureGoals: Goal[]
  presentGoals: Goal[]
  successGoals: Goal[]
  failedGoals: Goal[]
  successRate: number
  todayDone: number
  todayTotal: number
  streak: number
  habitsToday: { yes: number; no: number; pending: number }
  consistency: number
  projectStats: { total: number; active: number; success: number; failed: number; paused: number }
  moodTrend: { date: string; mood: string }[]
  journalCount: number
  weekly: { label: string; success: number; failed: number }[]
  /** success / failure split per horizon, each goal worth 100/n% of its group */
  horizonStats: HorizonStat[]
}

export interface HorizonStat {
  horizon: Horizon
  label: string
  total: number      // every goal in this horizon
  decided: number    // success + failed
  pending: number    // planned + in_progress
  success: number
  failed: number
  /** weight of a single decided goal, e.g. 3 decided -> 33.3 (0 when none decided) */
  perGoal: number
  /** success weight out of 100, e.g. 2 pass of 3 decided -> 66.7 */
  score: number
  /** success rate among decided goals only */
  rate: number
}

const MOOD_SCORE: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, bad: 1 }

export function computeStats(
  goals: Goal[],
  journal: JournalEntry[],
  habitLogs: HabitLog[],
  habitCount: number,
  projects: { status: string }[],
  analysis: AnalysisEntry | null,
): Stats {
  const d = format(new Date(), 'yyyy-MM-dd')
  const tmr = format(subDays(new Date(), -1), 'yyyy-MM-dd')

  const todayGoals = goals.filter((g) => g.horizon === 'today' && (g.due_date === d || !g.due_date || g.due_date === null))
  const todayAll = goals.filter((g) => g.due_date === d || (g.horizon === 'today' && !g.due_date))
  const todayDone = todayAll.filter((g) => g.status === 'success').length
  const tomorrowGoals = goals.filter((g) => g.horizon === 'tomorrow' || g.due_date === tmr)
  const futureGoals = goals.filter((g) => g.bucket === 'future')
  const presentGoals = goals.filter((g) => g.bucket === 'present')
  const successGoals = goals.filter((g) => g.status === 'success')
  const failedGoals = goals.filter((g) => g.status === 'failed')
  const decided = successGoals.length + failedGoals.length
  const successRate = decided ? Math.round((successGoals.length / decided) * 100) : 0

  // journal streak: consecutive days with an entry ending today (or yesterday)
  const dates = new Set(journal.map((j) => j.entry_date))
  let streak = 0
  let cursor = dates.has(d) ? new Date() : subDays(new Date(), 1)
  while (dates.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1
    cursor = subDays(cursor, 1)
  }

  const todayLogs = habitLogs.filter((l) => l.log_date === d)
  const yes = todayLogs.filter((l) => l.mark === 'yes').length
  const no = todayLogs.filter((l) => l.mark === 'no').length
  const habitsToday = {
    yes,
    no,
    pending: Math.max(habitCount - yes - no, 0),
  }
  const last14 = habitLogs.filter((l) => l.log_date >= format(subDays(new Date(), 13), 'yyyy-MM-dd'))
  const consistency = last14.length ? Math.round((last14.filter((l) => l.mark === 'yes').length / last14.length) * 100) : 0

  const projectStats = {
    total: projects.length,
    active: projects.filter((p) => p.status === 'active').length,
    success: projects.filter((p) => p.status === 'success').length,
    failed: projects.filter((p) => p.status === 'failed').length,
    paused: projects.filter((p) => p.status === 'paused').length,
  }

  const moodTrend = journal
    .filter((j) => j.mood && MOOD_SCORE[j.mood])
    .slice(0, 30)
    .reverse()
    .map((j) => ({ date: j.entry_date, mood: j.mood as string }))

  const weekly = [3, 2, 1, 0].map((weeksAgo) => {
    const start = subDays(new Date(), weeksAgo * 7 + 6)
    const end = subDays(new Date(), weeksAgo * 7)
    const inRange = (iso: string | null) => {
      if (!iso) return false
      const dt = parseISO(iso)
      return differenceInCalendarDays(dt, start) >= 0 && differenceInCalendarDays(end, dt) >= 0
    }
    return {
      label: weeksAgo === 0 ? 'This wk' : `-${weeksAgo}w`,
      success: goals.filter((g) => g.status === 'success' && inRange(g.completed_at ?? g.due_date ?? g.created_at ?? null)).length,
      failed: goals.filter((g) => g.status === 'failed' && inRange(g.updated_at ?? g.due_date ?? g.created_at ?? null)).length,
    }
  })

  // Per-horizon scoring: only DECIDED goals (pass or fail) share the 100%.
  //  1 decided -> 100%        (pass = 100, fail = 0)
  //  2 decided -> 50 / 50     (1 pass = 50)
  //  3 decided -> 33.3 each   (2 pass = 66.7)
  // Goals still planned/in_progress are "pending": they are ignored by the
  // score but still shown, so you can see what is left to decide.
  const horizonStats: HorizonStat[] = HORIZON_ORDER.map((horizon) => {
    const inGroup = goals.filter((g) => g.horizon === horizon)
    const total = inGroup.length
    const success = inGroup.filter((g) => g.status === 'success').length
    const failed = inGroup.filter((g) => g.status === 'failed').length
    const decided = success + failed
    // divide 100% across decided goals only
    const perGoal = decided ? 100 / decided : 0
    return {
      horizon,
      label: HORIZON_LABEL[horizon],
      total,
      decided,
      pending: total - decided,
      success,
      failed,
      perGoal,
      score: Math.round(perGoal * success * 10) / 10,
      rate: decided ? Math.round((success / decided) * 100) : 0,
    }
  }).filter((h) => h.total > 0)

  return {
    todayGoals,
    tomorrowGoals,
    futureGoals,
    presentGoals,
    successGoals,
    failedGoals,
    successRate,
    todayDone,
    todayTotal: todayAll.length,
    streak,
    habitsToday,
    consistency: analysis?.score ? Math.round((consistency + analysis.score) / 2) : consistency,
    projectStats,
    moodTrend,
    journalCount: journal.length,
    weekly,
    horizonStats,
  }
}

export function moodBadge(mood: string | null) {
  switch (mood) {
    case 'great':
      return { emoji: '🤩', text: 'Great', cls: 'bg-emerald-50 text-emerald-700' }
    case 'good':
      return { emoji: '🙂', text: 'Good', cls: 'bg-lime-50 text-lime-700' }
    case 'okay':
      return { emoji: '😐', text: 'Okay', cls: 'bg-amber-50 text-amber-700' }
    case 'low':
      return { emoji: '😔', text: 'Low', cls: 'bg-orange-50 text-orange-700' }
    case 'bad':
      return { emoji: '😣', text: 'Bad', cls: 'bg-rose-50 text-rose-700' }
    default:
      return { emoji: '🫥', text: '—', cls: 'bg-slate-100 text-slate-500' }
  }
}
