import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Columns3,
  FolderKanban,
  Loader2,
  Pencil,
  Plus,
  Table2,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import {
  createProject,
  createProjectColumn,
  createProjectTask,
  deleteProject,
  deleteProjectColumn,
  deleteProjectTask,
  loadProjectColumns,
  loadProjectTasks,
  updateProject,
  updateProjectColumn,
  updateProjectTask,
} from '../lib/api'
import {
  COLUMN_TYPE_LABEL,
  type Project,
  type ProjectColumn,
  type ProjectColumnType,
  type ProjectTask,
  type TaskStatus,
} from '../lib/types'

import { EmptyState, Modal, PageHeader, Progress } from '../components/ui'

const STATUS_CHIP: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-400',
  doing: 'bg-sky-50 text-sky-700',
  done: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
}

const PROJECT_CHIP: Record<string, string> = {
  active: 'bg-brand-50 text-brand-700',
  success: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-rose-50 text-rose-700',
  paused: 'bg-amber-50 text-amber-700',
}

export default function Projects() {
  const { user, data, refresh } = useApp()
  const [openProject, setOpenProject] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [activeProject, setActiveProject] = useState<string | null>(null)
  /** local overlay for projects edited in preview mode (refresh is a no-op there) */
  const [localProjects, setLocalProjects] = useState<Project[]>([])
  const [tasks, setTasks] = useState<ProjectTask[]>([])
  const [columns, setColumns] = useState<ProjectColumn[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /** server projects, with any locally-edited copy taking precedence */
  const projects = useMemo(() => {
    if (localProjects.length === 0) return data.projects
    const byId = new Map(localProjects.map((p) => [p.id, p]))
    return data.projects.map((p) => byId.get(p.id) ?? p)
  }, [data.projects, localProjects])

  const active = useMemo(() => projects.find((p) => p.id === activeProject) ?? null, [projects, activeProject])

  // Open the first project automatically, otherwise the add-row / add-column
  // tools stay hidden behind a "select a project" placeholder.
  useEffect(() => {
    if (!activeProject && projects.length > 0) setActiveProject(projects[0].id)
  }, [activeProject, projects])

  useEffect(() => {
    if (!activeProject) {
      setTasks([])
      setColumns([])
      return
    }
    let alive = true
    setLoadingTasks(true)
    // api.ts already returns the sample rows for the active project in preview
    // mode, so this is the same code path as a signed-in user.
    Promise.all([loadProjectTasks(activeProject), loadProjectColumns(activeProject)])
      .then(([rows, cols]) => {
        if (!alive) return
        setTasks(rows)
        setColumns(cols)
      })
      .catch((err) => {
        if (!alive) return
        setTasks([])
        setColumns([])
        setError(err instanceof Error ? err.message : 'Could not load this project')
      })
      .finally(() => alive && setLoadingTasks(false))
    return () => {
      alive = false
    }
  }, [activeProject])

  // wrapper so a failed write shows a message instead of an unhandled rejection
  const guard = async (fn: () => Promise<void>) => {
    setError(null)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  const addTask = async (payload: {
    task: string
    owner: string
    due_date: string
    notes: string
    custom: Record<string, string>
  }) => {
    if (!user || !activeProject) return
    const row = await createProjectTask(user.id, {
      project_id: activeProject,
      task: payload.task,
      owner: payload.owner || null,
      due_date: payload.due_date || null,
      notes: payload.notes || null,
      custom: payload.custom,
      sort_order: (tasks.at(-1)?.sort_order ?? 0) + 1,
    })
    setTasks((prev) => [...prev, row])
  }

  const patchTask = async (id: string, patch: Partial<ProjectTask>) => {
    await guard(async () => {
      const updated = await updateProjectTask(id, patch)
      setTasks((prev) => prev.map((t) => (t.id === id ? updated : t)))
    })
  }

  /** set one custom cell, keeping the rest of the row's columns intact */
  const setCell = async (task: ProjectTask, columnId: string, value: string) => {
    await patchTask(task.id, { custom: { ...task.custom, [columnId]: value } })
  }

  const removeTask = async (id: string) => {
    await deleteProjectTask(id)
    setTasks((prev) => prev.filter((t) => t.id !== id))
  }

  const addColumn = async (name: string, type: ProjectColumnType) => {
    if (!user || !activeProject) return
    await guard(async () => {
      const col = await createProjectColumn(user.id, { project_id: activeProject, name, type })
      setColumns((prev) => [...prev, col])
    })
  }

  const renameColumn = async (id: string, patch: Partial<ProjectColumn>) => {
    await guard(async () => {
      const updated = await updateProjectColumn(id, patch)
      setColumns((prev) => prev.map((c) => (c.id === id ? updated : c)))
    })
  }

  const removeColumn = async (id: string) => {
    await guard(async () => {
      await deleteProjectColumn(id)
      setColumns((prev) => prev.filter((c) => c.id !== id))
    })
  }

  /** keep a renamed/edited project visible without waiting for a refetch */
  const setLocalProject = (next: Project) => {
    setLocalProjects((prev) => {
      const rest = prev.filter((p) => p.id !== next.id)
      return [...rest, next]
    })
  }

  const changeProjectStatus = async (p: Project, status: Project['status']) => {
    const patch = {
      status,
      ended_at: status === 'active' ? null : new Date().toISOString().slice(0, 10),
    }
    await updateProject(p.id, patch)
    setLocalProject({ ...p, ...patch })
    await refresh()
  }

  const removeProject = async (id: string) => {
    await deleteProject(id)
    if (activeProject === id) setActiveProject(null)
    await refresh()
  }

  const projectProgress = (list: ProjectTask[]) => {
    const done = list.filter((t) => t.status === 'done').length
    return list.length ? Math.round((done / list.length) * 100) : 0
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        subtitle="Break real work into a table of tasks — mark each row and see exactly where a project stands."
        actions={
          <button onClick={() => setOpenProject(true)} className="btn-primary">
            <Plus size={16} /> New project
          </button>
        }
      />

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="shrink-0 text-rose-500 hover:text-rose-700" aria-label="Dismiss error">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="space-y-6">
        <section className="panel">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="panel-title">All projects</h2>
            <span className="text-xs font-medium tabular-nums text-slate-400">{projects.length}</span>
          </div>
          {projects.length === 0 ? (
            <EmptyState
              icon={<FolderKanban size={20} />}
              title="No projects yet"
              hint="Create a project like 'Portfolio website' and add its tasks as table rows."
              action={
                <button onClick={() => setOpenProject(true)} className="btn-ghost">
                  <Plus size={15} /> Create your first project
                </button>
              }
            />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {projects.map((p) => (
                <li
                  key={p.id}
                  className={`group relative rounded-xl border transition-[background-color,border-color,box-shadow] duration-150 ${activeProject === p.id
                      ? 'border-brand-300 bg-brand-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                    }`}
                >
                  {activeProject === p.id && (
                    <span className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-500" aria-hidden />
                  )}
                  <div className="flex items-start gap-1 p-3.5 pl-4">
                    <button
                      onClick={() => setActiveProject(p.id)}
                      className="min-w-0 flex-1 text-left"
                      aria-pressed={activeProject === p.id}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium text-slate-900">{p.name}</span>
                        <span className={`chip ${PROJECT_CHIP[p.status] ?? 'bg-slate-100 text-slate-400'}`}>
                          {p.status}
                        </span>
                      </div>
                      {p.description && <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">{p.description}</p>}
                      <p className="mt-1 text-[11px] text-slate-500">
                        started {p.started_at ?? '—'} {p.ended_at ? `· ended ${p.ended_at}` : ''}
                      </p>
                      {/* tells you the card OPENS the table where rows/columns are added */}
                      <span
                        className={`mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium ${activeProject === p.id ? 'text-brand-700' : 'text-slate-400 group-hover:text-brand-700'
                          }`}
                      >
                        <Table2 size={11} />
                        {activeProject === p.id ? 'Table open below' : 'Open table'}
                      </span>
                    </button>
                    <button
                      onClick={() => setEditingProject(p)}
                      className="btn-icon h-7 w-7 shrink-0 text-slate-400 hover:text-slate-700"
                      title={`Edit ${p.name}`}
                      aria-label={`Edit ${p.name}`}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel min-w-0 flex-1">
          {!active ? (
            <EmptyState
              icon={<ChevronDown size={22} />}
              title={projects.length === 0 ? 'No project open' : 'Select a project'}
              hint={
                projects.length === 0
                  ? 'Create a project first — then you can add task rows and custom columns.'
                  : 'Pick a project above to open its table and add rows and columns.'
              }
            />
          ) : (
            <ProjectDetail
              project={active}
              tasks={tasks}
              columns={columns}
              loading={loadingTasks}
              progress={projectProgress(tasks)}
              onAddTask={addTask}
              onPatchTask={patchTask}
              onSetCell={setCell}
              onRemoveTask={removeTask}
              onAddColumn={addColumn}
              onRenameColumn={renameColumn}
              onRemoveColumn={removeColumn}
              onStatus={(s) => changeProjectStatus(active, s)}
              onDelete={() => removeProject(active.id)}
              onEdit={() => setEditingProject(active)}
            />
          )}
        </section>
      </div>

      <Modal open={openProject} onClose={() => setOpenProject(false)} title="New project">
        <ProjectForm
          onSubmit={async (payload) => {
            await createProject(user!.id, payload)
            await refresh()
            setOpenProject(false)
          }}
          onCancel={() => setOpenProject(false)}
        />
      </Modal>

      <Modal open={Boolean(editingProject)} onClose={() => setEditingProject(null)} title="Edit project">
        {editingProject && (
          <ProjectForm
            key={editingProject.id}
            initial={{ name: editingProject.name, description: editingProject.description }}
            onSubmit={async (payload) => {
              await guard(async () => {
                await updateProject(editingProject.id, {
                  name: payload.name,
                  description: payload.description || null,
                })
                // update in place first so the list reflects the change even
                // when refresh is a no-op (preview mode)
                setLocalProject({
                  ...editingProject,
                  name: payload.name,
                  description: payload.description || null,
                })
                await refresh()
                setEditingProject(null)
              })
            }}
            onCancel={() => setEditingProject(null)}
          />
        )}
      </Modal>
    </div>
  )
}

function ProjectDetail({
  project,
  tasks,
  columns,
  loading,
  progress,
  onAddTask,
  onPatchTask,
  onSetCell,
  onRemoveTask,
  onAddColumn,
  onRenameColumn,
  onRemoveColumn,
  onStatus,
  onDelete,
  onEdit,
}: {
  project: Project
  tasks: ProjectTask[]
  columns: ProjectColumn[]
  loading: boolean
  progress: number
  onAddTask: (p: {
    task: string
    owner: string
    due_date: string
    notes: string
    custom: Record<string, string>
  }) => Promise<void>
  onPatchTask: (id: string, patch: Partial<ProjectTask>) => Promise<void>
  onSetCell: (task: ProjectTask, columnId: string, value: string) => Promise<void>
  onRemoveTask: (id: string) => Promise<void>
  onAddColumn: (name: string, type: ProjectColumnType) => Promise<void>
  onRenameColumn: (id: string, patch: Partial<ProjectColumn>) => Promise<void>
  onRemoveColumn: (id: string) => Promise<void>
  onStatus: (s: Project['status']) => Promise<void>
  onDelete: () => Promise<void>
  onEdit: () => void
}) {
  const empty = useMemo(
    () => ({ task: '', owner: '', due_date: '', notes: '', custom: {} as Record<string, string> }),
    [],
  )
  const [row, setRow] = useState(empty)
  const [busy, setBusy] = useState(false)
  const [addingColumn, setAddingColumn] = useState(false)
  const [newColumn, setNewColumn] = useState<{ name: string; type: ProjectColumnType }>({
    name: '',
    type: 'longtext',
  })
  const [editingColumn, setEditingColumn] = useState<string | null>(null)

  const submitRow = async () => {
    if (!row.task.trim()) return
    setBusy(true)
    try {
      await onAddTask(row)
      setRow(empty)
    } finally {
      setBusy(false)
    }
  }

  const submitColumn = async () => {
    const name = newColumn.name.trim()
    if (!name) return
    await onAddColumn(name, newColumn.type)
    setNewColumn({ name: '', type: 'longtext' })
    setAddingColumn(false)
  }

  const done = tasks.filter((t) => t.status === 'done').length
  const failed = tasks.filter((t) => t.status === 'failed').length

  return (
    <div className="space-y-5">
      {/* ---------- project header + progress ---------- */}
      <div className="border-b border-slate-200/80 pb-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-base font-semibold tracking-tight text-slate-900">{project.name}</h2>
              <span className={`chip ${PROJECT_CHIP[project.status] ?? 'bg-slate-100 text-slate-500'}`}>
                {project.status}
              </span>
            </div>
            {project.description && <p className="mt-1 text-[13px] text-slate-500">{project.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <label className="sr-only" htmlFor="project-status">
              Project status
            </label>
            <select
              id="project-status"
              className="input w-auto py-1.5 text-xs"
              value={project.status}
              onChange={(e) => onStatus(e.target.value as Project['status'])}
            >
              <option value="active">Active</option>
              <option value="success">Success</option>
              <option value="failed">Failed</option>
              <option value="paused">Paused</option>
            </select>
            <button
              onClick={onEdit}
              className="btn-ghost px-2.5 py-1.5 text-xs"
              title="Edit project name and description"
            >
              <Pencil size={13} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="btn-icon hover:bg-rose-50 hover:text-rose-600"
              title="Delete project"
              aria-label="Delete project"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Progress value={progress} tone={progress === 100 ? 'emerald' : 'violet'} />
          <span className="shrink-0 text-xs tabular-nums text-slate-500">
            <span className="font-semibold text-slate-800">
              {done}/{tasks.length}
            </span>{' '}
            done{failed > 0 ? ` · ${failed} failed` : ''} · {progress}%
          </span>
        </div>
      </div>

      {/* ---------- column toolbar ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          <Columns3 size={13} /> Columns
        </span>
        {columns.map((c) => (
          <span
            key={c.id}
            className="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-1 pl-2 pr-1 text-[11px] text-slate-600"
          >
            {editingColumn === c.id ? (
              <input
                autoFocus
                defaultValue={c.name}
                className="w-24 bg-white px-1 text-[11px] outline-none ring-1 ring-brand-300"
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== c.name) onRenameColumn(c.id, { name })
                  setEditingColumn(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                  if (e.key === 'Escape') setEditingColumn(null)
                }}
              />
            ) : (
              <span className="max-w-[120px] truncate">{c.name}</span>
            )}
            <button
              onClick={() => setEditingColumn(c.id)}
              className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-slate-700"
              title={`Rename ${c.name}`}
              aria-label={`Rename column ${c.name}`}
            >
              <Pencil size={10} />
            </button>
            <button
              onClick={() => onRemoveColumn(c.id)}
              className="rounded p-0.5 text-slate-400 hover:bg-white hover:text-rose-600"
              title={`Remove ${c.name}`}
              aria-label={`Remove column ${c.name}`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <button
          onClick={() => setAddingColumn((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] font-medium text-slate-500 hover:border-brand-400 hover:text-brand-700"
        >
          <Plus size={11} /> Add column
        </button>
      </div>

      {addingColumn && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
          <div className="min-w-[140px] flex-1">
            <label className="label text-[10px]">Column name</label>
            <input
              autoFocus
              className="input py-1.5 text-sm"
              placeholder="e.g. How to do it"
              value={newColumn.name}
              onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && submitColumn()}
            />
          </div>
          <div>
            <label className="label text-[10px]">Type</label>
            <select
              className="input w-auto py-1.5 text-sm"
              value={newColumn.type}
              onChange={(e) => setNewColumn({ ...newColumn, type: e.target.value as ProjectColumnType })}
            >
              {(Object.keys(COLUMN_TYPE_LABEL) as ProjectColumnType[]).map((t) => (
                <option key={t} value={t}>
                  {COLUMN_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
          <button onClick={submitColumn} disabled={!newColumn.name.trim()} className="btn-primary px-3 py-1.5 text-xs">
            Add
          </button>
          <button onClick={() => setAddingColumn(false)} className="btn-ghost px-2 py-1.5 text-xs">
            Cancel
          </button>
        </div>
      )}

      {/* ---------- add row (includes every custom column) ---------- */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_160px]">
          <input
            className="input col-span-2 sm:col-span-1"
            placeholder="Task / goal"
            value={row.task}
            onChange={(e) => setRow({ ...row, task: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && submitRow()}
          />
          <input
            className="input"
            placeholder="Owner"
            value={row.owner}
            onChange={(e) => setRow({ ...row, owner: e.target.value })}
          />
          <input
            type="date"
            className="input"
            value={row.due_date}
            onChange={(e) => setRow({ ...row, due_date: e.target.value })}
          />
        </div>

        {columns.length > 0 && (
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {columns.map((c) => (
              <div key={c.id}>
                <label className="label text-[10px]">{c.name}</label>
                <input
                  className="input py-1.5 text-sm"
                  placeholder={
                    c.type === 'number' ? '0' : c.type === 'date' ? 'yyyy-mm-dd' : `Add ${c.name.toLowerCase()}`
                  }
                  type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'}
                  value={row.custom[c.id] ?? ''}
                  onChange={(e) =>
                    setRow({ ...row, custom: { ...row.custom, [c.id]: e.target.value } })
                  }
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-2 flex justify-end">
          <button
            onClick={submitRow}
            disabled={busy || !row.task.trim()}
            className="btn-primary w-full gap-1.5 sm:w-auto"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            Add row
          </button>
        </div>
      </div>

      {loading ? (
        <p className="py-6 text-center text-sm text-slate-500">Loading tasks…</p>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={<Plus size={20} />}
          title="No rows yet"
          hint="Add the first task above — each row is one goal of this project."
        />
      ) : (
        <>
          {/* ---------- table (sm and up) ---------- */}
          <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
            {/* each column gets a readable minimum; the wrapper scrolls if they add up to more than the card */}
            <table className="w-full" style={{ minWidth: 520 + columns.length * 160 }}>
              <thead className="bg-slate-100">
                <tr>
                  <th className="th" style={{ minWidth: 180 }}>Task</th>
                  <th className="th" style={{ minWidth: 88 }}>Owner</th>
                  <th className="th" style={{ minWidth: 116 }}>Due</th>
                  <th className="th text-left" style={{ minWidth: 88 }}>Status</th>
                  {columns.map((c) => (
                    <th key={c.id} className="th max-w-[240px] truncate" style={{ minWidth: 160 }} title={c.name}>
                      {c.name}
                    </th>
                  ))}
                  <th className="th" style={{ minWidth: 76 }}>Mark</th>
                  <th className="th" style={{ minWidth: 36 }} />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="td">
                      <CellInput
                        value={t.task}
                        onCommit={(v) => v !== t.task && onPatchTask(t.id, { task: v })}
                        className="font-medium text-slate-900"
                      />
                    </td>
                    <td className="td">
                      <CellInput
                        value={t.owner ?? ''}
                        placeholder="—"
                        onCommit={(v) => v !== (t.owner ?? '') && onPatchTask(t.id, { owner: v || null })}
                      />
                    </td>
                    <td className="td whitespace-nowrap">
                      <input
                        type="date"
                        defaultValue={t.due_date ?? ''}
                        onChange={(e) => onPatchTask(t.id, { due_date: e.target.value || null })}
                        className="w-full bg-transparent text-xs text-slate-500 outline-none"
                      />
                    </td>
                    <td className="td">
                      <select
                        value={t.status}
                        onChange={(e) => onPatchTask(t.id, { status: e.target.value as TaskStatus })}
                        className={`chip cursor-pointer appearance-none border-0 outline-none ${STATUS_CHIP[t.status]}`}
                      >
                        <option value="todo">todo</option>
                        <option value="doing">doing</option>
                        <option value="done">done</option>
                        <option value="failed">failed</option>
                      </select>
                    </td>
                    {columns.map((c) => (
                      <td key={c.id} className="td align-top">
                        <ColumnCell
                          column={c}
                          value={t.custom?.[c.id] ?? ''}
                          onCommit={(v) => v !== (t.custom?.[c.id] ?? '') && onSetCell(t, c.id, v)}
                        />
                      </td>
                    ))}
                    <td className="td">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onPatchTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
                          className={`btn-icon h-7 w-7 ${t.status === 'done' ? 'text-emerald-500' : 'text-slate-400 hover:text-emerald-600'}`}
                          title="Done"
                          aria-pressed={t.status === 'done'}
                        >
                          <CheckCircle2 size={15} />
                        </button>
                        <button
                          onClick={() => onPatchTask(t.id, { status: t.status === 'failed' ? 'todo' : 'failed' })}
                          className={`btn-icon h-7 w-7 ${t.status === 'failed' ? 'text-rose-500' : 'text-slate-400 hover:text-rose-600'}`}
                          title="Failed"
                          aria-pressed={t.status === 'failed'}
                        >
                          <XCircle size={15} />
                        </button>
                      </div>
                    </td>
                    <td className="td px-1">
                      <button onClick={() => onRemoveTask(t.id)} className="btn-icon h-7 w-7" title="Delete row">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ---------- cards (narrow screens) ---------- */}
          <div className="space-y-2 md:hidden">
            {tasks.map((t) => (
              <div key={t.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 flex-1 font-medium text-slate-900">{t.task}</p>
                  <button onClick={() => onRemoveTask(t.id)} className="btn-icon h-6 w-6 shrink-0" title="Delete row">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                  <span className={`chip ${STATUS_CHIP[t.status]}`}>{t.status}</span>
                  {t.owner && <span>{t.owner}</span>}
                  {t.due_date && <span>· {t.due_date}</span>}
                </div>
                {columns.length > 0 && (
                  <dl className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                    {columns.map((c) => (
                      <div key={c.id}>
                        <dt className="text-[10px] uppercase tracking-wide text-slate-400">{c.name}</dt>
                        <dd className="text-xs text-slate-700">
                          <ColumnCell
                            column={{ ...c, type: c.type === 'longtext' ? 'text' : c.type }}
                            value={t.custom?.[c.id] ?? ''}
                            onCommit={(v) => v !== (t.custom?.[c.id] ?? '') && onSetCell(t, c.id, v)}
                            plain
                          />
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => onPatchTask(t.id, { status: t.status === 'done' ? 'todo' : 'done' })}
                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                      t.status === 'done'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <CheckCircle2 size={13} /> Done
                  </button>
                  <button
                    onClick={() => onPatchTask(t.id, { status: t.status === 'failed' ? 'todo' : 'failed' })}
                    className={`inline-flex flex-1 items-center justify-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium ${
                      t.status === 'failed'
                        ? 'border-rose-500 bg-rose-500 text-white'
                        : 'border-slate-200 text-slate-600'
                    }`}
                  >
                    <XCircle size={13} /> Failed
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/** Text field that saves on blur / Enter, so typing is not a request per key. */
function CellInput({
  value,
  onCommit,
  placeholder,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <input
      defaultValue={value}
      placeholder={placeholder}
      onBlur={(e) => {
        const v = e.target.value.trim()
        if (v !== value) onCommit(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
      }}
      className={`w-full truncate bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-300 focus:text-slate-900 ${className}`}
    />
  )
}

/**
 * Textarea that grows to fit its content, so long cell values are never
 * clipped inside a fixed-height row. Saves on blur / Enter.
 */
function AutoTextarea({
  value,
  onCommit,
  placeholder,
  className = '',
}: {
  value: string
  onCommit: (v: string) => void
  placeholder?: string
  className?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  // size on mount and whenever the stored value changes (e.g. after refresh)
  useEffect(() => {
    requestAnimationFrame(resize)
  }, [value])

  return (
    <textarea
      ref={ref}
      defaultValue={value}
      placeholder={placeholder}
      rows={1}
      onChange={resize}
      onBlur={(e) => {
        resize()
        const v = e.target.value.trim()
        if (v !== value) onCommit(v)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          ;(e.target as HTMLTextAreaElement).blur()
        }
      }}
      className={`block resize-none overflow-hidden ${className}`}
    />
  )
}

/** One dynamic cell — respects the column's declared type. */
function ColumnCell({
  column,
  value,
  onCommit,
  plain,
}: {
  column: ProjectColumn
  value: string
  onCommit: (v: string) => void
  plain?: boolean
}) {
  if (column.type === 'longtext' && !plain) {
    return (
      <AutoTextarea
        value={value}
        onCommit={onCommit}
        placeholder="—"
        className="w-full bg-transparent text-sm leading-snug text-slate-700 outline-none placeholder:text-slate-300 focus:text-slate-900"
      />
    )
  }
  if (column.type === 'number' && !plain) {
    return (
      <input
        type="number"
        defaultValue={value}
        placeholder="—"
        onBlur={(e) => e.target.value.trim() !== value && onCommit(e.target.value.trim())}
        className="w-full bg-transparent text-sm tabular-nums text-slate-700 outline-none placeholder:text-slate-300"
      />
    )
  }
  if (column.type === 'date' && !plain) {
    return (
      <input
        type="date"
        defaultValue={value}
        onChange={(e) => e.target.value !== value && onCommit(e.target.value)}
        className="w-full bg-transparent text-xs text-slate-500 outline-none"
      />
    )
  }
  if (column.type === 'status' && !plain) {
    return (
      <select
        defaultValue={value}
        onChange={(e) => e.target.value !== value && onCommit(e.target.value)}
        className="w-full cursor-pointer appearance-none bg-transparent text-xs text-slate-600 outline-none"
      >
        <option value="">—</option>
        <option value="not started">not started</option>
        <option value="in progress">in progress</option>
        <option value="done">done</option>
        <option value="blocked">blocked</option>
      </select>
    )
  }
  return <CellInput value={value} onCommit={onCommit} placeholder="—" />
}

function ProjectForm({
  initial,
  onSubmit,
  onCancel,
}: {
  /** when provided the form edits an existing project instead of creating one */
  initial?: { name: string; description: string | null }
  onSubmit: (p: { name: string; description: string }) => Promise<void>
  onCancel: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [busy, setBusy] = useState(false)
  const editing = Boolean(initial)

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Project name</label>
        <input
          className="input"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. SoulMate app launch"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What is this project about? What does success look like?"
        />
      </div>
      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="btn-ghost">
          Cancel
        </button>
        <button
          disabled={busy || !name.trim()}
          onClick={async () => {
            setBusy(true)
            try {
              await onSubmit({ name: name.trim(), description: description.trim() })
            } finally {
              setBusy(false)
            }
          }}
          className="btn-primary"
        >
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Create project'}
        </button>
      </div>
    </div>
  )
}
