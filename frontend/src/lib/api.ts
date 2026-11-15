import { format, startOfWeek, subDays } from 'date-fns'
import { supabase } from './supabase'
import { PREVIEW_COLUMNS, PREVIEW_TASKS } from './previewData'
import type {
  AnalysisEntry,
  Challenge,
  ChallengeLog,
  ChallengeResult,
  ChallengeStatus,
  Goal,
  Habit,
  HabitLog,
  HabitMark,
  JournalEntry,
  Project,
  ProjectColumn,
  ProjectColumnType,
  ProjectTask,
} from './types'

export const today = () => format(new Date(), 'yyyy-MM-dd')
export const weekStart = () => format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
export const daysAgo = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd')

/**
 * Dev-only UI preview (`?preview=1`) uses fake ids like `p1`, so writing them
 * to the real database always fails. Mutations no-op there and the page keeps
 * its in-memory state. Never true in a production build.
 *
 * The flag is latched for the session: in-app links use plain paths
 * (`/projects`), which drop the query string, and re-reading `location.search`
 * would silently switch back to live mode and fire requests with fake ids.
 */
let previewLatched = false

export const isPreviewMode = () => {
  if (!import.meta.env.DEV) return false
  if (!previewLatched && new URLSearchParams(window.location.search).has('preview')) {
    previewLatched = true
  }
  return previewLatched
}

/** Return a plausible row for preview mode so the UI can update locally. */
function previewRow<T>(row: Record<string, unknown>): T {
  return { id: `preview-${Date.now()}`, ...row } as T
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

/* ------------------------------ dashboard ------------------------------ */

export interface DashboardData {
  goals: Goal[]
  journal: JournalEntry[]
  habits: Habit[]
  habitLogs: HabitLog[]
  projects: Project[]
  analysis: AnalysisEntry | null
  challenges: Challenge[]
  challengeLogs: ChallengeLog[]
}

export async function loadDashboard(userId: string): Promise<DashboardData> {
  const [goals, journal, habits, logs, projects, analysis, challenges, challengeLogs] = await Promise.all([
    supabase.from('goals').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', daysAgo(89))
      .order('entry_date', { ascending: false }),
    supabase.from('habits').select('*').eq('user_id', userId).eq('active', true).order('created_at'),
    supabase
      .from('habit_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', daysAgo(59)),
    supabase.from('projects').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase
      .from('analysis_entries')
      .select('*')
      .eq('user_id', userId)
      .order('period_start', { ascending: false })
      .limit(1),
    supabase.from('challenges').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase
      .from('challenge_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', daysAgo(364)),
  ])

  return {
    goals: unwrap(goals),
    journal: unwrap(journal),
    habits: unwrap(habits),
    habitLogs: unwrap(logs),
    projects: unwrap(projects),
    analysis: (unwrap(analysis) as AnalysisEntry[])[0] ?? null,
    challenges: unwrap(challenges),
    challengeLogs: unwrap(challengeLogs),
  }
}

/* ------------------------------- journal ------------------------------- */

export async function saveJournal(
  userId: string,
  entry: { entry_date: string; title: string; mood: string | null; content: string; photos?: string[] },
) {
  const { data, error } = await supabase
    .from('journal_entries')
    .upsert({ user_id: userId, ...entry }, { onConflict: 'user_id,entry_date' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as JournalEntry
}

export async function deleteJournal(id: string) {
  const { error } = await supabase.from('journal_entries').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* -------------------------------- goals -------------------------------- */

export type GoalInsert = Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'completed_at'>

export async function createGoal(userId: string, goal: Partial<GoalInsert> & { title: string }) {
  // recurring goals get a shared series id so generated copies can be traced
  const payload = goal.repeat && !goal.series_id ? { ...goal, series_id: crypto.randomUUID() } : goal
  const { data, error } = await supabase
    .from('goals')
    .insert({ user_id: userId, ...payload })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Goal
}

export async function updateGoal(id: string, patch: Partial<Goal>) {
  const { data, error } = await supabase.from('goals').update(patch).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Goal
}

export async function deleteGoal(id: string) {
  const { error } = await supabase.from('goals').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* -------------------------------- habits ------------------------------- */

export async function createHabit(userId: string, name: string) {
  const { data, error } = await supabase
    .from('habits')
    .insert({ user_id: userId, name })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Habit
}

export async function deleteHabit(id: string) {
  const { error } = await supabase.from('habits').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function markHabit(userId: string, habitId: string, date: string, mark: HabitMark) {
  const { data, error } = await supabase
    .from('habit_logs')
    .upsert({ user_id: userId, habit_id: habitId, log_date: date, mark }, { onConflict: 'habit_id,log_date' })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as HabitLog
}

/* ------------------------------- projects ------------------------------ */

export async function createProject(userId: string, project: { name: string; description?: string }) {
  const { data, error } = await supabase
    .from('projects')
    .insert({ user_id: userId, ...project })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Project
}

export async function updateProject(id: string, patch: Partial<Project>) {
  if (isPreviewMode()) return { id, ...patch } as Project
  const { data, error } = await supabase.from('projects').update(patch).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Project
}

export async function deleteProject(id: string) {
  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function loadProjectTasks(projectId: string) {
  if (isPreviewMode()) return PREVIEW_TASKS[projectId] ?? []
  const { data, error } = await supabase
    .from('project_tasks')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data as ProjectTask[]
}

export async function createProjectTask(
  userId: string,
  task: {
    project_id: string
    task: string
    owner?: string | null
    due_date?: string | null
    notes?: string | null
    custom?: Record<string, string>
    sort_order?: number
  },
) {
  const payload = {
    user_id: userId,
    status: 'todo' as const,
    sort_order: Date.now() % 100000,
    custom: {},
    owner: null,
    due_date: null,
    notes: null,
    ...task,
  }
  if (isPreviewMode()) return previewRow<ProjectTask>(payload)
  const { data, error } = await supabase.from('project_tasks').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as ProjectTask
}

export async function updateProjectTask(id: string, patch: Partial<ProjectTask>) {
  if (isPreviewMode()) return { id, ...patch } as ProjectTask
  const { data, error } = await supabase
    .from('project_tasks')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectTask
}

export async function deleteProjectTask(id: string) {
  if (isPreviewMode()) return
  const { error } = await supabase.from('project_tasks').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* --------------------------- project columns --------------------------- */

export async function loadProjectColumns(projectId: string) {
  if (isPreviewMode()) return PREVIEW_COLUMNS[projectId] ?? []
  const { data, error } = await supabase
    .from('project_columns')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })
  if (error) throw new Error(error.message)
  return data as ProjectColumn[]
}

export async function createProjectColumn(
  userId: string,
  column: { project_id: string; name: string; type?: ProjectColumnType },
) {
  // put the new column at the end of the table
  const { count } = await supabase
    .from('project_columns')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', column.project_id)

  const payload = { user_id: userId, type: 'text' as const, sort_order: count ?? 0, ...column }
  if (isPreviewMode()) return previewRow<ProjectColumn>(payload)
  const { data, error } = await supabase.from('project_columns').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data as ProjectColumn
}

export async function updateProjectColumn(id: string, patch: Partial<ProjectColumn>) {
  if (isPreviewMode()) return { id, ...patch } as ProjectColumn
  const { data, error } = await supabase
    .from('project_columns')
    .update(patch)
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ProjectColumn
}

export async function deleteProjectColumn(id: string) {
  if (isPreviewMode()) return
  const { error } = await supabase.from('project_columns').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/* ------------------------------ challenges ----------------------------- */

export async function createChallenge(
  userId: string,
  challenge: { title: string; description?: string | null; duration: number; start_date: string },
) {
  const { data, error } = await supabase
    .from('challenges')
    .insert({ user_id: userId, status: 'active', ...challenge })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Challenge
}

export async function updateChallenge(id: string, patch: Partial<Challenge>) {
  const { data, error } = await supabase.from('challenges').update(patch).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  return data as Challenge
}

export async function deleteChallenge(id: string) {
  const { error } = await supabase.from('challenges').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Record pass/fail for a challenge on a given day (one row per day). */
export async function markChallengeDay(
  userId: string,
  challengeId: string,
  date: string,
  result: ChallengeResult,
) {
  const { data, error } = await supabase
    .from('challenge_logs')
    .upsert(
      { user_id: userId, challenge_id: challengeId, log_date: date, result },
      { onConflict: 'challenge_id,log_date' },
    )
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as ChallengeLog
}

/** Remove a day's mark (undo pass/fail). */
export async function clearChallengeDay(challengeId: string, date: string) {
  const { error } = await supabase
    .from('challenge_logs')
    .delete()
    .eq('challenge_id', challengeId)
    .eq('log_date', date)
  if (error) throw new Error(error.message)
}

export { type ChallengeStatus }

/* ------------------------------- analysis ------------------------------ */

export async function saveAnalysis(
  userId: string,
  entry: { period_start: string; wins: string; failures: string; lessons: string; next_actions: string; score: number },
) {
  const { data, error } = await supabase
    .from('analysis_entries')
    .insert({ user_id: userId, ...entry })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as AnalysisEntry
}
