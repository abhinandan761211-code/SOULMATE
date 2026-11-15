import { format } from 'date-fns'
import type { Horizon, Priority } from './types'
import type { Repeat } from './recurring'

/**
 * Starter packs — one click to seed habits, a challenge and the first goals
 * so a brand-new workspace is not an empty page. Users can delete anything.
 */

export interface TemplateGoal {
  title: string
  description?: string
  horizon: Horizon
  priority?: Priority
  repeat?: Repeat | null
}

export interface Template {
  id: string
  name: string
  tagline: string
  emoji: string
  /** tailwind classes for the accent */
  accent: string
  habits: string[]
  challenge?: { title: string; description: string; duration: number }
  goals: TemplateGoal[]
}

export const TEMPLATES: Template[] = [
  {
    id: 'student',
    name: 'Student week',
    tagline: 'Study blocks, revision and exam discipline',
    emoji: '🎓',
    accent: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900',
    habits: ['Wake up by 7', '2 hours deep study', 'Revise yesterday', 'No phone during study', 'Sleep by 11'],
    challenge: { title: '30 days of focused study', description: 'At least one deep, distraction-free study block every day.', duration: 30 },
    goals: [
      { title: 'Plan tomorrow before sleeping', horizon: 'today', repeat: 'daily', priority: 'high' as Priority },
      { title: 'Finish one chapter end-to-end', horizon: 'today', priority: 'high' as Priority },
      { title: 'Clear this week’s assignments', horizon: 'week', priority: 'medium' as Priority },
      { title: 'Score above 80% in the next test', horizon: 'month', priority: 'high' as Priority },
      { title: 'Graduate with a strong portfolio', horizon: 'long_term', priority: 'medium' as Priority },
    ],
  },
  {
    id: 'founder',
    name: 'Founder sprint',
    tagline: 'Ship small, review weekly, never drift',
    emoji: '🚀',
    accent: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900',
    habits: ['Talk to one user', 'Ship one thing', 'Deep work block', 'Write daily standup'],
    challenge: { title: '90 days of building', description: 'Move the product forward every single day.', duration: 90 },
    goals: [
      { title: 'Move the needle today', horizon: 'today', repeat: 'daily', priority: 'high' as Priority },
      { title: 'Close this week’s biggest blocker', horizon: 'week', priority: 'high' as Priority },
      { title: 'Talk to 10 users this month', horizon: 'month', priority: 'high' as Priority },
      { title: 'Reach first ₹1L revenue', horizon: 'year', priority: 'medium' as Priority },
    ],
  },
  {
    id: 'fitness',
    name: 'Fitness reset',
    tagline: 'Move daily, eat clean, sleep on time',
    emoji: '💪',
    accent: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900',
    habits: ['30 min workout', '8k steps', 'No sugar', '3L water', 'Sleep 7h+'],
    challenge: { title: '30 days of movement', description: 'Train or walk every day — no zero days.', duration: 30 },
    goals: [
      { title: 'Train for 30 minutes', horizon: 'today', repeat: 'daily', priority: 'high' as Priority },
      { title: 'Complete 4 workouts this week', horizon: 'week', priority: 'high' as Priority },
      { title: 'Lose 2 kg this month', horizon: 'month', priority: 'medium' as Priority },
      { title: 'Run a 10k comfortably', horizon: 'long_term', priority: 'medium' as Priority },
    ],
  },
  {
    id: 'mindful',
    name: 'Mindful start',
    tagline: 'Journal, read, breathe, reflect',
    emoji: '🧘',
    accent: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900',
    habits: ['Write journal', '10 min meditation', 'Read 20 pages', 'Gratitude — 3 lines'],
    challenge: { title: '21 days of journaling', description: 'Write something honest every day.', duration: 30 },
    goals: [
      { title: 'Write tonight’s reflection', horizon: 'today', repeat: 'daily', priority: 'medium' as Priority },
      { title: 'Finish one book this month', horizon: 'month', priority: 'medium' as Priority },
      { title: 'Build a calmer, more honest routine', horizon: 'long_term', priority: 'low' as Priority },
    ],
  },
]

export function templateSummary(t: Template) {
  const habits = `${t.habits.length} habits`
  const goals = `${t.goals.length} goals`
  const challenge = t.challenge ? ` · ${t.challenge.duration}-day challenge` : ''
  return `${habits} · ${goals}${challenge}`
}

export function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}
