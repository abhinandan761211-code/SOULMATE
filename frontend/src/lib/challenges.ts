import { addDays, differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'
import type { Challenge, ChallengeLog } from './types'

export const todayStr = () => format(new Date(), 'yyyy-MM-dd')

/** Last calendar day of a challenge run (inclusive). */
export function endDate(c: Challenge): string {
  return format(addDays(parseISO(c.start_date), Math.max(c.duration - 1, 0)), 'yyyy-MM-dd')
}

/** Day number of the run for a given date: 1-based, 0 = before start. */
export function dayNumber(c: Challenge, date = todayStr()): number {
  return differenceInCalendarDays(parseISO(date), parseISO(c.start_date)) + 1
}

/** Days elapsed of the run, clamped to [0, duration]. */
export function daysElapsed(c: Challenge, date = todayStr()): number {
  return Math.min(Math.max(dayNumber(c, date), 0), c.duration)
}

export function isFinished(c: Challenge, date = todayStr()): boolean {
  return dayNumber(c, date) > c.duration
}

export function isRunning(c: Challenge, date = todayStr()): boolean {
  const n = dayNumber(c, date)
  return n >= 1 && n <= c.duration
}

export interface ChallengeStats {
  /** days that have passed so far (0..duration) */
  elapsed: number
  /** passed days */
  pass: number
  /** failed days */
  fail: number
  /** days with no mark yet, up to and including today */
  unmarked: number
  /** pass rate over marked days only, 0-100 */
  rate: number
  /** pass rate over elapsed days (a missed day counts against you), 0-100 */
  discipline: number
  /** consecutive passes ending today (or yesterday if today is unmarked) */
  streak: number
  /** longest run of consecutive passes in the whole challenge */
  bestStreak: number
  /** overall completion 0-100 */
  progress: number
  finished: boolean
  endDate: string
  /** the 30 most recent days, newest last — used for the mini grid */
  grid: { date: string; result: 'pass' | 'fail' | null; day: number }[]
}

export function challengeStats(c: Challenge, logs: ChallengeLog[], date = todayStr()): ChallengeStats {
  const mine = logs.filter((l) => l.challenge_id === c.id)
  const byDate = new Map(mine.map((l) => [l.log_date, l.result]))

  const elapsed = daysElapsed(c, date)
  const finished = isFinished(c, date)

  let pass = 0
  let fail = 0
  let bestStreak = 0
  let run = 0

  // walk the whole run so best streak covers future-free history correctly
  for (let i = 0; i < c.duration; i += 1) {
    const d = format(addDays(parseISO(c.start_date), i), 'yyyy-MM-dd')
    if (d > date) break
    const r = byDate.get(d)
    if (r === 'pass') {
      pass += 1
      run += 1
      bestStreak = Math.max(bestStreak, run)
    } else if (r === 'fail') {
      fail += 1
      run = 0
    } else {
      run = 0
    }
  }

  const unmarked = Math.max(elapsed - pass - fail, 0)

  // current streak: count backwards from today (or yesterday when today is blank)
  let streak = 0
  let cursor = byDate.has(date) ? parseISO(date) : subDays(parseISO(date), 1)
  for (let i = 0; i < c.duration; i += 1) {
    const d = format(cursor, 'yyyy-MM-dd')
    if (d < c.start_date) break
    if (byDate.get(d) === 'pass') {
      streak += 1
      cursor = subDays(cursor, 1)
    } else {
      break
    }
  }

  const marked = pass + fail
  const rate = marked ? Math.round((pass / marked) * 100) : 0
  const discipline = elapsed ? Math.round((pass / elapsed) * 100) : 0
  const progress = Math.round((Math.min(marked + unmarked, c.duration) / c.duration) * 100)

  // last 30 days of the run (or the whole run if shorter)
  const shown = Math.min(c.duration, 30)
  const grid: ChallengeStats['grid'] = []
  for (let i = 0; i < shown; i += 1) {
    const d = format(addDays(parseISO(c.start_date), i), 'yyyy-MM-dd')
    grid.push({ date: d, result: (byDate.get(d) ?? null) as 'pass' | 'fail' | null, day: i + 1 })
  }

  return {
    elapsed,
    pass,
    fail,
    unmarked,
    rate,
    discipline,
    streak,
    bestStreak,
    progress,
    finished,
    endDate: endDate(c),
    grid,
  }
}

/* ------------------------- success / failure ratio ------------------------ */

export interface ChallengeRatio {
  pass: number
  fail: number
  /** days elapsed but not marked — neither pass nor fail */
  unmarked: number
  /** days marked in total (pass + fail) */
  marked: number
  /** pass ÷ marked, 0-100 — the headline ratio */
  rate: number
  /** pass ÷ elapsed — a missed day counts against you */
  discipline: number
  /** points each marked day is worth: 100 ÷ marked, e.g. 3 marked -> 33.3 */
  perDay: number
  /** ratio of days marked at all: marked ÷ elapsed, 0-100 */
  coverage: number
}

/**
 * Success/failure ratio for one challenge, using the same rule as the goals
 * page: only **marked** days (pass or fail) share the 100%.
 *   2 marked -> 50% each, 3 marked -> 33.3% each.
 * Unmarked days are reported separately and never inflate the rate.
 */
export function challengeRatio(c: Challenge, logs: ChallengeLog[], date = todayStr()): ChallengeRatio {
  const s = challengeStats(c, logs, date)
  const marked = s.pass + s.fail
  return {
    pass: s.pass,
    fail: s.fail,
    unmarked: s.unmarked,
    marked,
    rate: s.rate,
    discipline: s.discipline,
    perDay: marked ? 100 / marked : 0,
    coverage: s.elapsed ? Math.round((marked / s.elapsed) * 100) : 0,
  }
}

export interface ChallengeRollup {
  active: number
  total: number
  pass: number
  fail: number
  unmarked: number
  marked: number
  rate: number
  discipline: number
  /** per-challenge ratio, for the breakdown table */
  rows: { challenge: Challenge; ratio: ChallengeRatio }[]
}

/** Combine every **running** challenge into one overall ratio. */
export function challengeRollup(
  challenges: Challenge[],
  logs: ChallengeLog[],
  date = todayStr(),
): ChallengeRollup {
  const running = challenges.filter((c) => isRunning(c, date))
  const rows = running.map((challenge) => ({
    challenge,
    ratio: challengeRatio(challenge, logs, date),
  }))

  const pass = rows.reduce((s, r) => s + r.ratio.pass, 0)
  const fail = rows.reduce((s, r) => s + r.ratio.fail, 0)
  const unmarked = rows.reduce((s, r) => s + r.ratio.unmarked, 0)
  const elapsed = rows.reduce((s, r) => s + r.ratio.pass + r.ratio.fail + r.ratio.unmarked, 0)
  const marked = pass + fail

  return {
    active: running.length,
    total: challenges.length,
    pass,
    fail,
    unmarked,
    marked,
    rate: marked ? Math.round((pass / marked) * 100) : 0,
    discipline: elapsed ? Math.round((pass / elapsed) * 100) : 0,
    rows,
  }
}
