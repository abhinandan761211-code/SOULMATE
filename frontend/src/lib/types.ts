export type Horizon =
  | 'today'
  | 'tomorrow'
  | 'day_after'
  | 'week'
  | 'month'
  | 'year'
  | 'long_term'

export type GoalBucket = 'future' | 'present' | 'done'
export type GoalStatus = 'planned' | 'in_progress' | 'success' | 'failed'
export type Priority = 'low' | 'medium' | 'high'
export type HabitMark = 'yes' | 'no' | 'skip'
export type ProjectStatus = 'active' | 'success' | 'failed' | 'paused'
export type TaskStatus = 'todo' | 'doing' | 'done' | 'failed'
export type Mood = 'great' | 'good' | 'okay' | 'low' | 'bad'

export type UserRole = 'student' | 'professional' | 'freelancer' | 'founder' | 'personal'

/** What you use SoulMate for — asked once after sign-up. */
export const ROLE_OPTIONS: { value: UserRole; label: string; hint: string }[] = [
  { value: 'student', label: 'Student', hint: 'Study plans, exams and daily discipline' },
  { value: 'professional', label: 'Professional', hint: 'Work goals, projects and career growth' },
  { value: 'freelancer', label: 'Freelancer', hint: 'Clients, deadlines and your own routine' },
  { value: 'founder', label: 'Founder', hint: 'Build something, track every bet' },
  { value: 'personal', label: 'Personal growth', hint: 'Habits, journaling and self-improvement' },
]

export interface Profile {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  timezone: string | null
  role: UserRole | null
  full_name: string | null
  age: number | null
  country: string | null
  onboarded_at: string | null
  created_at?: string
}

export interface JournalEntry {
  id: string
  user_id: string
  entry_date: string
  title: string | null
  mood: Mood | null
  content: string | null
  /** public URLs of photos attached to the entry (Supabase Storage) */
  photos?: string[] | null
  created_at?: string
  updated_at?: string
}

export type GoalRepeat = 'daily' | 'weekdays' | 'weekly' | 'monthly'

export interface Goal {
  id: string
  user_id: string
  title: string
  description: string | null
  horizon: Horizon
  bucket: GoalBucket
  status: GoalStatus
  due_date: string | null
  priority: Priority
  progress: number
  result_note: string | null
  completed_at: string | null
  /** recurring goal: how often a fresh copy should be created */
  repeat?: GoalRepeat | null
  /** ties every generated copy of a recurring goal together */
  series_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string | null
  active: boolean
  created_at?: string
}

export interface HabitLog {
  id: string
  user_id: string
  habit_id: string
  log_date: string
  mark: HabitMark
  created_at?: string
}

export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  status: ProjectStatus
  started_at: string | null
  ended_at: string | null
  created_at?: string
}

export interface ProjectTask {
  id: string
  user_id: string
  project_id: string
  task: string
  owner: string | null
  due_date: string | null
  status: TaskStatus
  notes: string | null
  weight: number
  sort_order: number
  /** user-defined column values, keyed by column id */
  custom: Record<string, string>
  created_at?: string
}

export type ProjectColumnType = 'text' | 'longtext' | 'number' | 'date' | 'status'

/** A user-defined column on a project's task table. */
export interface ProjectColumn {
  id: string
  user_id: string
  project_id: string
  name: string
  type: ProjectColumnType
  sort_order: number
  created_at?: string
}

export const COLUMN_TYPE_LABEL: Record<ProjectColumnType, string> = {
  text: 'Short text',
  longtext: 'Long text',
  number: 'Number',
  date: 'Date',
  status: 'Status',
}

export interface AnalysisEntry {
  id: string
  user_id: string
  period_start: string
  wins: string | null
  failures: string | null
  lessons: string | null
  next_actions: string | null
  score: number
  created_at?: string
}

/* ------------------------------ challenges ------------------------------ */

export type ChallengeStatus = 'active' | 'completed' | 'abandoned'
export type ChallengeResult = 'pass' | 'fail'

export interface Challenge {
  id: string
  user_id: string
  title: string
  description: string | null
  icon: string | null
  duration: number
  start_date: string
  status: ChallengeStatus
  created_at?: string
}

export interface ChallengeLog {
  id: string
  user_id: string
  challenge_id: string
  log_date: string
  result: ChallengeResult
  note: string | null
  created_at?: string
}

/** Preset lengths offered when creating a challenge. */
export const CHALLENGE_PRESETS: { days: number; label: string; hint: string }[] = [
  { days: 30, label: '30 days', hint: 'Build the habit' },
  { days: 50, label: '50 days', hint: 'Make it stick' },
  { days: 90, label: '90 days', hint: 'Change your life' },
]

export const HORIZON_LABEL: Record<Horizon, string> = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  day_after: 'Day after',
  week: 'This week',
  month: 'This month',
  year: 'This year',
  long_term: 'Long term',
}

export const HORIZON_ORDER: Horizon[] = [
  'today',
  'tomorrow',
  'day_after',
  'week',
  'month',
  'year',
  'long_term',
]

export const MOODS: { value: Mood; label: string; emoji: string }[] = [
  { value: 'great', label: 'Great', emoji: '🤩' },
  { value: 'good', label: 'Good', emoji: '🙂' },
  { value: 'okay', label: 'Okay', emoji: '😐' },
  { value: 'low', label: 'Low', emoji: '😔' },
  { value: 'bad', label: 'Bad', emoji: '😣' },
]
