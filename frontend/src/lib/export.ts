import { format } from 'date-fns'
import type { DashboardData } from './api'
import { HORIZON_LABEL, MOODS } from './types'
import { challengeStats } from './challenges'

/** Everything the account owns — what the user takes with them. */
export interface BackupPayload extends DashboardData {
  profile?: { name?: string | null; email?: string | null; role?: string | null } | null
  exportedAt: string
}

export type ExportFormat = 'json' | 'markdown' | 'csv'

function stamp() {
  return format(new Date(), 'yyyy-MM-dd-HHmm')
}

export function backup(data: DashboardData, profile?: BackupPayload['profile']): BackupPayload {
  return { ...data, profile: profile ?? null, exportedAt: new Date().toISOString() }
}

/* ---------------------------------- csv ------------------------------------ */

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  let s = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // formula injection guard for spreadsheet apps
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return `"${s.replace(/"/g, '""')}"`
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r))))
  const lines = [headers.join(','), ...rows.map((r) => headers.map((h) => csvCell(r[h])).join(','))]
  return lines.join('\r\n')
}

/* -------------------------------- markdown --------------------------------- */

const esc = (s: string) => s.replace(/\|/g, '\\|')

export function toMarkdown(data: DashboardData, name?: string | null): string {
  const out: string[] = []
  const moodLabel = (m: string | null) => MOODS.find((x) => x.value === m)?.label ?? '—'
  const decided = data.goals.filter((g) => g.status === 'success' || g.status === 'failed')
  const wins = decided.filter((g) => g.status === 'success').length
  const rate = decided.length ? Math.round((wins / decided.length) * 100) : 0

  out.push(`# SoulMate backup${name ? ` — ${name}` : ''}`)
  out.push('')
  out.push(`_Exported ${format(new Date(), 'd MMM yyyy, HH:mm')}_`)
  out.push('')
  out.push('## Summary')
  out.push('')
  out.push('| Metric | Value |')
  out.push('| --- | --- |')
  out.push(`| Journal entries | ${data.journal.length} |`)
  out.push(`| Goals decided | ${decided.length} |`)
  out.push(`| Goals successful | ${wins} |`)
  out.push(`| Success rate | ${rate}% |`)
  out.push(`| Habits | ${data.habits.length} |`)
  out.push(`| Projects | ${data.projects.length} |`)
  out.push(`| Challenges | ${data.challenges.length} |`)
  out.push('')

  out.push('## Journal')
  out.push('')
  const journal = [...data.journal].sort((a, b) => b.entry_date.localeCompare(a.entry_date))
  if (journal.length === 0) out.push('_No entries._')
  for (const j of journal) {
    out.push(`### ${format(new Date(j.entry_date), 'EEEE, d MMMM yyyy')}`)
    if (j.title) out.push(`**${j.title}**`)
    out.push(`Mood: ${moodLabel(j.mood)}`)
    out.push('')
    if (j.content) {
      out.push(j.content.trim())
      out.push('')
    }
  }
  out.push('')

  out.push('## Goals')
  out.push('')
  if (data.goals.length === 0) out.push('_No goals._')
  else {
    out.push('| Goal | When | Status | Priority | Due | Result note |')
    out.push('| --- | --- | --- | --- | --- | --- |')
    for (const g of data.goals) {
      out.push(
        `| ${esc(g.title)} | ${HORIZON_LABEL[g.horizon]} | ${g.status} | ${g.priority} | ${g.due_date ?? '—'} | ${esc(g.result_note ?? '')} |`,
      )
    }
  }
  out.push('')

  out.push('## Habits')
  out.push('')
  if (data.habits.length === 0) out.push('_No habits._')
  else {
    out.push('| Habit | Right | Wrong | Skipped |')
    out.push('| --- | --- | --- | --- |')
    for (const h of data.habits) {
      const logs = data.habitLogs.filter((l) => l.habit_id === h.id)
      out.push(
        `| ${esc(h.name)} | ${logs.filter((l) => l.mark === 'yes').length} | ${logs.filter((l) => l.mark === 'no').length} | ${logs.filter((l) => l.mark === 'skip').length} |`,
      )
    }
  }
  out.push('')

  out.push('## Projects')
  out.push('')
  if (data.projects.length === 0) out.push('_No projects._')
  for (const p of data.projects) {
    out.push(`### ${p.name} (${p.status})`)
    if (p.description) out.push(p.description)
    out.push('')
  }

  out.push('## Challenges')
  out.push('')
  if (data.challenges.length === 0) out.push('_No challenges._')
  for (const c of data.challenges) {
    const logs = data.challengeLogs.filter((l) => l.challenge_id === c.id)
    const s = challengeStats(c, logs)
    out.push(
      `- **${esc(c.title)}** (${c.duration} days, ${c.status}) — pass ${s.pass}, fail ${s.fail}, ${s.progress}% done`,
    )
  }
  out.push('')

  out.push('## Weekly reviews')
  out.push('')
  if (!data.analysis) out.push('_No reviews yet._')
  else {
    const a = data.analysis
    out.push(`### Week of ${a.period_start} — score ${a.score}`)
    for (const [label, value] of [
      ['Wins', a.wins],
      ['Failures', a.failures],
      ['Lessons', a.lessons],
      ['Next actions', a.next_actions],
    ] as const) {
      if (value) out.push(`**${label}:** ${value}`)
    }
    out.push('')
  }

  out.push('---')
  out.push('_Generated by SoulMate. Your data, your file._')
  return out.join('\n')
}

/* --------------------------------- download -------------------------------- */

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // give Safari a tick before revoking
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Build + download the chosen format. Returns the file name written. */
export function exportAll(data: DashboardData, format: ExportFormat, name?: string | null): string {
  const date = stamp()
  if (format === 'json') {
    const filename = `soulmate-backup-${date}.json`
    download(filename, JSON.stringify(backup(data, name ? { name } : null), null, 2), 'application/json')
    return filename
  }
  if (format === 'markdown') {
    const filename = `soulmate-backup-${date}.md`
    download(filename, toMarkdown(data, name), 'text/markdown')
    return filename
  }
  const filename = `soulmate-goals-${date}.csv`
  download(
    filename,
    '\uFEFF' + toCSV(
      data.goals.map((g) => ({
        title: g.title,
        description: g.description,
        horizon: g.horizon,
        bucket: g.bucket,
        status: g.status,
        priority: g.priority,
        progress: g.progress,
        due_date: g.due_date,
        result_note: g.result_note,
        completed_at: g.completed_at,
        created_at: g.created_at,
      })),
    ),
    'text/csv',
  )
  return filename
}


