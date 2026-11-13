import { format, subDays } from 'date-fns'
import type { DashboardData } from '../lib/api'
import type { ProjectColumn, ProjectTask } from './types'

const d = (n: number) => format(subDays(new Date(), n), 'yyyy-MM-dd')
const iso = (n: number) => new Date(subDays(new Date(), n)).toISOString()

const uid = 'preview'

/** Sample data used only by the dev preview (?preview=1). */
export const PREVIEW_COLUMNS: Record<string, ProjectColumn[]> = {
  p1: [
    { id: 'col-what', user_id: uid, project_id: 'p1', name: 'What to do', type: 'longtext', sort_order: 0 },
    { id: 'col-how', user_id: uid, project_id: 'p1', name: 'How to do it', type: 'longtext', sort_order: 1 },
    { id: 'col-effort', user_id: uid, project_id: 'p1', name: 'Effort (h)', type: 'number', sort_order: 2 },
  ],
}

export const PREVIEW_TASKS: Record<string, ProjectTask[]> = {
  p1: [
    { id: 't1', user_id: uid, project_id: 'p1', task: 'Design journal page', owner: 'Me', due_date: d(12), status: 'done', notes: 'Approved', weight: 1, sort_order: 1, custom: { 'col-what': 'Layout the daily entry form', 'col-how': 'Figma first, then mirror the tokens in Tailwind', 'col-effort': '6' } },
    { id: 't2', user_id: uid, project_id: 'p1', task: 'Google sign-in', owner: 'Me', due_date: d(5), status: 'done', notes: 'Supabase OAuth', weight: 1, sort_order: 2, custom: { 'col-what': 'Users sign in with Google', 'col-how': 'Supabase Auth OAuth provider, redirect to /auth/callback', 'col-effort': '3' } },
    { id: 't3', user_id: uid, project_id: 'p1', task: 'Goals + analysis pages', owner: 'Me', due_date: d(1), status: 'doing', notes: 'In review', weight: 1, sort_order: 3, custom: { 'col-what': 'Pass/fail goals and a weekly analysis view', 'col-how': 'Shared computeStats so every page agrees', 'col-effort': '10' } },
    { id: 't4', user_id: uid, project_id: 'p1', task: 'Mobile polish', owner: 'Me', due_date: d(-3), status: 'todo', notes: null, weight: 1, sort_order: 4, custom: { 'col-what': 'Works at 390px', 'col-how': 'Cards instead of tables, buttons always visible', 'col-effort': '4' } },
    { id: 't5', user_id: uid, project_id: 'p1', task: 'Beta invite emails', owner: 'Friend', due_date: d(-5), status: 'failed', notes: 'Blocked on domain', weight: 1, sort_order: 5, custom: { 'col-what': 'Invite first 20 users', 'col-how': 'Blocked — no domain yet', 'col-effort': '2' } },
  ],
}

export const PREVIEW_DATA: DashboardData = {
  goals: [
    { id: 'g1', user_id: uid, title: 'Finish the login page', description: 'Google sign-in + redirect handling', horizon: 'today', bucket: 'present', status: 'success', due_date: d(0), priority: 'high', progress: 100, result_note: 'Shipped before lunch', completed_at: iso(0), created_at: iso(1) },
    { id: 'g2', user_id: uid, title: 'Write 500 words in journal', description: null, horizon: 'today', bucket: 'present', status: 'planned', due_date: d(0), priority: 'medium', progress: 0, result_note: null, completed_at: null, created_at: iso(1) },
    { id: 'g3', user_id: uid, title: '30 min workout', description: null, horizon: 'today', bucket: 'present', status: 'failed', due_date: d(0), priority: 'medium', progress: 0, result_note: 'Slept late', completed_at: null, created_at: iso(1) },
    { id: 'g4', user_id: uid, title: 'Prepare client proposal', description: 'Send by 11am', horizon: 'tomorrow', bucket: 'present', status: 'planned', due_date: d(-1), priority: 'high', progress: 0, result_note: null, completed_at: null, created_at: iso(0) },
    { id: 'g5', user_id: uid, title: 'Call mom', description: null, horizon: 'tomorrow', bucket: 'present', status: 'planned', due_date: d(-1), priority: 'low', progress: 0, result_note: null, completed_at: null, created_at: iso(0) },
    { id: 'g6', user_id: uid, title: 'Review week + plan next', description: null, horizon: 'day_after', bucket: 'present', status: 'planned', due_date: d(-2), priority: 'medium', progress: 0, result_note: null, completed_at: null, created_at: iso(0) },
    { id: 'g7', user_id: uid, title: 'Launch SoulMate beta', description: 'Ship to 20 users and collect feedback', horizon: 'month', bucket: 'present', status: 'in_progress', due_date: d(-20), priority: 'high', progress: 60, result_note: null, completed_at: null, created_at: iso(12) },
    { id: 'g8', user_id: uid, title: 'Read 2 books', description: 'Atomic Habits + Deep Work', horizon: 'month', bucket: 'present', status: 'in_progress', due_date: d(-25), priority: 'medium', progress: 35, result_note: null, completed_at: null, created_at: iso(20) },
    { id: 'g9', user_id: uid, title: 'Run 5km without stopping', description: null, horizon: 'week', bucket: 'present', status: 'success', due_date: d(3), priority: 'medium', progress: 100, result_note: 'Did it on Sunday', completed_at: iso(3), created_at: iso(10) },
    { id: 'g10', user_id: uid, title: 'Build a product people pay for', description: 'Long-term: 100 paying customers', horizon: 'long_term', bucket: 'future', status: 'in_progress', due_date: null, priority: 'high', progress: 15, result_note: null, completed_at: null, created_at: iso(40) },
    { id: 'g11', user_id: uid, title: 'Financial freedom by 30', description: '6 months runway saved', horizon: 'long_term', bucket: 'future', status: 'planned', due_date: null, priority: 'medium', progress: 5, result_note: null, completed_at: null, created_at: iso(40) },
    { id: 'g12', user_id: uid, title: 'Learn system design', description: null, horizon: 'year', bucket: 'future', status: 'planned', due_date: null, priority: 'low', progress: 0, result_note: null, completed_at: null, created_at: iso(30) },
  ],
  journal: [
    { id: 'j1', user_id: uid, entry_date: d(0), title: 'A focused day', mood: 'good', content: 'Woke up at 6:30, shipped the login page, and had a good call with the client. Skipped the workout though — need to fix my evening routine.' },
    { id: 'j2', user_id: uid, entry_date: d(1), title: 'Slow start', mood: 'okay', content: 'Slept late, felt groggy. Still got the dashboard done. Lesson: sleep is not optional.' },
    { id: 'j3', user_id: uid, entry_date: d(2), title: 'Great run', mood: 'great', content: 'Ran 5km without stopping for the first time. Felt unstoppable.' },
    { id: 'j4', user_id: uid, entry_date: d(3), title: 'Overwhelmed', mood: 'low', content: 'Too many tasks, no clear priority. Need to pick 3 things max tomorrow.' },
    { id: 'j5', user_id: uid, entry_date: d(4), title: 'Steady', mood: 'good', content: 'Deep work block in the morning worked well.' },
    { id: 'j6', user_id: uid, entry_date: d(5), title: 'Rest day', mood: 'okay', content: 'Took the day off. Guilt crept in but rest matters.' },
  ],
  habits: [
    { id: 'h1', user_id: uid, name: 'Wake up before 7', icon: null, active: true },
    { id: 'h2', user_id: uid, name: 'Workout 30 min', icon: null, active: true },
    { id: 'h3', user_id: uid, name: 'No phone after 10pm', icon: null, active: true },
    { id: 'h4', user_id: uid, name: 'Read 10 pages', icon: null, active: true },
  ],
  habitLogs: [
    { id: 'l1', user_id: uid, habit_id: 'h1', log_date: d(0), mark: 'yes' },
    { id: 'l2', user_id: uid, habit_id: 'h2', log_date: d(0), mark: 'no' },
    { id: 'l3', user_id: uid, habit_id: 'h3', log_date: d(0), mark: 'yes' },
    { id: 'l4', user_id: uid, habit_id: 'h1', log_date: d(1), mark: 'no' },
    { id: 'l5', user_id: uid, habit_id: 'h2', log_date: d(1), mark: 'yes' },
    { id: 'l6', user_id: uid, habit_id: 'h4', log_date: d(1), mark: 'yes' },
    { id: 'l7', user_id: uid, habit_id: 'h1', log_date: d(2), mark: 'yes' },
    { id: 'l8', user_id: uid, habit_id: 'h2', log_date: d(2), mark: 'yes' },
    { id: 'l9', user_id: uid, habit_id: 'h3', log_date: d(2), mark: 'no' },
    { id: 'l10', user_id: uid, habit_id: 'h4', log_date: d(3), mark: 'yes' },
    { id: 'l11', user_id: uid, habit_id: 'h1', log_date: d(4), mark: 'yes' },
    { id: 'l12', user_id: uid, habit_id: 'h2', log_date: d(4), mark: 'no' },
  ],
  projects: [
    { id: 'p1', user_id: uid, name: 'SoulMate app launch', description: 'Ship the journal + goals app to first 20 users', status: 'active', started_at: d(20), ended_at: null },
    { id: 'p2', user_id: uid, name: 'Portfolio website', description: 'Personal site with case studies', status: 'success', started_at: d(60), ended_at: d(10) },
    { id: 'p3', user_id: uid, name: 'Client dashboard', description: 'Analytics dashboard for client', status: 'failed', started_at: d(90), ended_at: d(30) },
  ],
  challenges: [
    { id: 'c1', user_id: uid, title: 'No sugar', description: 'Cut refined sugar for 30 days', icon: 'flame', duration: 30, start_date: d(9), status: 'active', created_at: iso(9) },
    { id: 'c2', user_id: uid, title: 'Workout 30 min', description: 'Move every single day', icon: 'flame', duration: 90, start_date: d(13), status: 'active', created_at: iso(13) },
    { id: 'c3', user_id: uid, title: 'Read 10 pages', description: 'Finish two books', icon: 'flame', duration: 50, start_date: d(4), status: 'active', created_at: iso(4) },
  ],
  challengeLogs: [
    // c1 — 10 days in, mostly passing, with a couple of misses
    ...[0, 1, 2, 4, 5, 6, 7, 8, 9].map((n, i) => ({
      id: `cl1-${i}`, user_id: uid, challenge_id: 'c1', log_date: d(n), result: 'pass' as const, note: null,
    })),
    { id: 'cl1-f', user_id: uid, challenge_id: 'c1', log_date: d(3), result: 'fail' as const, note: 'Birthday cake' },
    // c2 — longer run, a few failures
    ...[0, 1, 3, 4, 6, 8, 11].map((n, i) => ({
      id: `cl2-${i}`, user_id: uid, challenge_id: 'c2', log_date: d(n), result: 'pass' as const, note: null,
    })),
    ...[2, 5, 7].map((n, i) => ({
      id: `cl2-f${i}`, user_id: uid, challenge_id: 'c2', log_date: d(n), result: 'fail' as const, note: null,
    })),
    // c3 — just started
    { id: 'cl3-0', user_id: uid, challenge_id: 'c3', log_date: d(0), result: 'pass' as const, note: null },
    { id: 'cl3-1', user_id: uid, challenge_id: 'c3', log_date: d(1), result: 'pass' as const, note: null },
  ],
  analysis: {
    id: 'a1',
    user_id: uid,
    period_start: d(6),
    wins: '• Shipped login page\n• Ran 5km\n• 5 journal entries',
    failures: '• Skipped workouts twice\n• Slept late 3 nights',
    lessons: 'Sleep drives everything. When I sleep late, the next day is 50% less productive.',
    next_actions: '• Phone out of bedroom\n• Workout at 7am before work',
    score: 72,
  },
}
