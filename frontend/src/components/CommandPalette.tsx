import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Download,
  Flame,
  FolderKanban,
  Home,
  Keyboard,
  LayoutDashboard,
  Moon,
  PencilLine,
  Plus,
  Sparkles,
  Sun,
  Target,
} from 'lucide-react'
import { openQuickCapture, toggleCommandPalette, useCommandPalette, type CaptureMode } from '../lib/quickCapture'
import { useTheme } from '../lib/useTheme'
import { useApp } from '../context/AppContext'

interface Command {
  id: string
  label: string
  hint?: string
  icon: React.ComponentType<{ size?: number | string; className?: string }>
  group: 'Go to' | 'Create' | 'Data' | 'Settings'
  keys?: string[]
  run: () => void
}

/**
 * ⌘K / Ctrl+K palette: jump anywhere, create anything, change the theme.
 * Arrow keys + Enter; Escape closes.
 */
export function CommandPalette() {
  const { open, setOpen } = useCommandPalette()
  const navigate = useNavigate()
  const { theme, setTheme } = useTheme()
  const { data } = useApp()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  // global shortcut: ⌘K / Ctrl+K (handled once, in Layout — nothing to bind here)

  const go = (path: string) => () => {
    setOpen(false)
    navigate(path)
  }

  const capture = (mode: Exclude<CaptureMode, null>) => () => {
    setOpen(false)
    openQuickCapture(mode)
  }

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      { id: 'nav-dash', label: 'Dashboard', icon: LayoutDashboard, group: 'Go to', run: go('/app') },
      { id: 'nav-journal', label: 'Daily journal', icon: BookOpen, group: 'Go to', run: go('/app/journal') },
      { id: 'nav-goals', label: 'Goals', icon: Target, group: 'Go to', run: go('/app/goals') },
      { id: 'nav-projects', label: 'Projects', icon: FolderKanban, group: 'Go to', run: go('/app/projects') },
      { id: 'nav-challenges', label: 'Challenges', icon: Flame, group: 'Go to', run: go('/app/challenges') },
      { id: 'nav-analysis', label: 'Analysis', icon: BarChart3, group: 'Go to', run: go('/app/analysis') },
      { id: 'nav-home', label: 'Landing page', icon: Home, group: 'Go to', run: go('/') },

      { id: 'new-journal', label: 'Write today’s journal', hint: 'Quick capture', icon: PencilLine, group: 'Create', keys: ['⌘', 'J'], run: capture('journal') },
      { id: 'new-goal', label: 'Add a quick goal', hint: 'Quick capture', icon: Plus, group: 'Create', keys: ['⌘', '⇧', 'K'], run: capture('goal') },

      {
        id: 'theme',
        label: theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
        hint: `Currently ${theme}`,
        icon: theme === 'dark' ? Sun : Moon,
        group: 'Settings',
        run: () => {
          setTheme(theme === 'dark' ? 'light' : 'dark')
          setOpen(false)
        },
      },
      {
        id: 'export',
        label: 'Export my data',
        hint: `${data.journal.length} entries · ${data.goals.length} goals`,
        icon: Download,
        group: 'Data',
        run: () => {
          setOpen(false)
          window.dispatchEvent(new CustomEvent('soulmate:export'))
        },
      },
    ]
    return list
  }, [theme, data.journal.length, data.goals.length, setTheme, setOpen])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commands
    return commands.filter((c) => `${c.label} ${c.group} ${c.hint ?? ''}`.toLowerCase().includes(q))
  }, [commands, query])

  const groups = useMemo(() => {
    const order: Command['group'][] = ['Create', 'Go to', 'Data', 'Settings']
    return order
      .map((g) => ({ group: g, items: filtered.filter((c) => c.group === g) }))
      .filter((g) => g.items.length > 0)
  }, [filtered])

  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups])

  useEffect(() => setActive(0), [query, open])

  // keep the highlighted row in view
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  useEffect(() => {
    if (!open) return
    setQuery('')
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((i) => (flat.length ? (i + 1) % flat.length : 0))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0))
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        flat[active]?.run()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, flat, active, setOpen])

  if (!open) return null

  let cursor = -1
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/45 px-4 pt-[12vh] backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && toggleCommandPalette(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-modal animate-[fadeIn_.12s_ease-out] dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-3.5 dark:border-slate-700">
          <Sparkles size={16} className="shrink-0 text-brand-500" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, create something, change settings…"
            aria-label="Command"
            className="h-12 w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-400 sm:block dark:border-slate-700">
            esc
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {flat.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-slate-500">No command matches “{query}”.</p>
          )}
          {groups.map(({ group, items }) => (
            <div key={group}>
              <p className="px-3.5 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {group}
              </p>
              {items.map((c) => {
                cursor += 1
                const idx = cursor
                const Icon = c.icon
                const isActive = idx === active
                return (
                  <button
                    key={c.id}
                    data-idx={idx}
                    onMouseEnter={() => setActive(idx)}
                    onClick={c.run}
                    className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left text-sm transition ${isActive
                        ? 'bg-brand-50 text-brand-800 dark:bg-slate-800 dark:text-brand-200'
                        : 'text-slate-700 dark:text-slate-300'
                      }`}
                  >
                    <Icon size={16} className={isActive ? 'text-brand-600 dark:text-brand-300' : 'text-slate-400'} />
                    <span className="min-w-0 flex-1 truncate">{c.label}</span>
                    {c.hint && <span className="hidden truncate text-[11px] text-slate-400 sm:block">{c.hint}</span>}
                    {c.keys && (
                      <span className="flex shrink-0 gap-0.5">
                        {c.keys.map((k) => (
                          <kbd
                            key={k}
                            className="rounded border border-slate-200 px-1 text-[10px] text-slate-400 dark:border-slate-700"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    )}
                    {isActive && <ArrowRight size={14} className="shrink-0 text-brand-500" />}
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-slate-200 px-3.5 py-2 text-[10px] text-slate-400 dark:border-slate-700">
          <span className="flex items-center gap-1">
            <Keyboard size={11} /> ↑↓ move · ↵ open · esc close
          </span>
        </div>
      </div>
    </div>
  )
}
