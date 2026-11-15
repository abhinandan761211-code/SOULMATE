import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3,
  BookOpen,
  Command,
  Flame,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  PencilLine,
  Search,
  Sparkles,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext'
import { CommandPalette } from './CommandPalette'
import { ExportMenu } from './ExportMenu'
import { OfflineBanner } from './OfflineBanner'
import { QuickCapture } from './QuickCapture'
import { ThemeToggle } from './ThemeToggle'
import { isCmdKey, openQuickCapture, toggleCommandPalette } from '../lib/quickCapture'

const NAV = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/journal', label: 'Daily Journal', icon: BookOpen },
  { to: '/app/goals', label: 'Goals', icon: Target },
  { to: '/app/challenges', label: 'Challenges', icon: Flame },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/analysis', label: 'Analysis', icon: BarChart3 },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  // Global keyboard shortcuts (available on every workspace page):
  //   ⌘K / Ctrl+K        command palette
  //   ⌘J / Ctrl+J        quick journal capture
  //   ⌘⇧K / Ctrl+Shift+K quick goal capture
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isCmdKey(e, { key: 'j' })) {
        e.preventDefault()
        openQuickCapture('journal')
      } else if (isCmdKey(e, { key: 'k', shift: true })) {
        e.preventDefault()
        openQuickCapture('goal')
      } else if (isCmdKey(e, { key: 'k' })) {
        e.preventDefault()
        toggleCommandPalette()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // close the mobile drawer on Escape / when resizing up to desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const onResize = () => window.innerWidth >= 768 && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  // lock background scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleSignOut = async () => {
    await signOut()
    navigate('/signin')
  }

  return (
    <div className="min-h-screen bg-ink-950 dark:bg-slate-950">
      <OfflineBanner />

      {/* mobile / tablet top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-3 backdrop-blur-md md:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <Brand compact />
        <div className="flex items-center gap-0.5">
          <button
            className="btn-icon"
            onClick={() => openQuickCapture('journal')}
            aria-label="Quick journal"
            title="Quick journal (⌘J)"
          >
            <PencilLine size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={() => toggleCommandPalette(true)}
            aria-label="Search / commands"
            title="Commands (⌘K)"
          >
            <Command size={18} />
          </button>
          <button
            className="btn-icon"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* md:items-start keeps the sticky sidebar from stretching to content height,
          which would push its own footer (theme / export / profile) off-screen. */}
      <div className="flex md:items-start">
        {/* backdrop for the mobile drawer */}
        <div
          className={`fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm transition-opacity md:hidden ${
            open ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          onClick={() => setOpen(false)}
          aria-hidden
        />

        {/* sidebar: drawer on mobile, icon rail on tablet, full on desktop */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col overflow-hidden border-r border-slate-200 bg-white transition-transform duration-200 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
            open ? 'translate-x-0' : '-translate-x-full'
          } md:w-[76px] xl:w-[248px]`}
        >
          {/* brand row */}
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 px-4 md:justify-center md:px-0 xl:justify-between xl:px-4 dark:border-slate-800">
            <div className="md:hidden xl:block">
              <Brand />
            </div>
            <div className="hidden md:block xl:hidden">
              <BrandMark />
            </div>
            <button
              className="btn-icon md:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* quick actions: a real search field, then journal / goal side by side */}
          <div className="shrink-0 space-y-1.5 border-b border-slate-200/80 px-3 py-3 md:space-y-2 md:px-2.5 xl:px-3 dark:border-slate-800">
            <button
              onClick={() => toggleCommandPalette(true)}
              className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[12px] font-medium text-slate-500 transition hover:border-slate-300 hover:bg-white hover:text-slate-700 md:justify-center md:border-0 md:bg-transparent md:px-0 md:hover:bg-slate-100 xl:justify-start xl:border xl:bg-slate-50 xl:px-2.5 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Command palette (⌘K)"
              aria-label="Open command palette"
            >
              <Search size={14} className="shrink-0" />
              <span className="flex-1 truncate text-left md:hidden xl:inline">Search…</span>
              <kbd className="hidden shrink-0 rounded border border-slate-200 bg-white px-1.5 font-mono text-[10px] leading-[16px] text-slate-400 xl:inline-block dark:border-slate-600 dark:bg-slate-900">
                ⌘K
              </kbd>
            </button>

            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-1 md:gap-2 xl:grid-cols-2">
              <button
                onClick={() => openQuickCapture('journal')}
                className="btn-primary items-center gap-1.5 px-2 py-2 text-[12px] md:px-0 xl:px-2"
                title="Quick journal (⌘J)"
              >
                <PencilLine size={14} className="shrink-0" />
                <span className="truncate md:hidden xl:inline">Journal</span>
              </button>
              <button
                onClick={() => openQuickCapture('goal')}
                className="btn-ghost items-center gap-1.5 px-2 py-2 text-[12px] md:px-0 xl:px-2"
                title="Quick goal (⌘⇧K)"
              >
                <Target size={14} className="shrink-0" />
                <span className="truncate md:hidden xl:inline">Goal</span>
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4 md:px-2.5 xl:px-3">
            <p className="mb-2 hidden px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 xl:block">
              Workspace
            </p>
            {NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={() => setOpen(false)}
                title={label}
                className={({ isActive }) =>
                  `nav-item group ${isActive ? 'nav-item-active' : ''} md:justify-center md:px-0 xl:justify-start xl:px-3`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`absolute left-0 top-1/2 hidden h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand-400 transition-opacity md:block ${
                        isActive ? 'opacity-100' : 'opacity-0'
                      }`}
                    />
                    <Icon
                      size={18}
                      className={`shrink-0 transition-colors ${
                        isActive ? 'text-brand-600' : 'text-slate-500 group-hover:text-slate-400'
                      }`}
                    />
                    <span className="truncate md:hidden xl:inline">{label}</span>
                    {/* tooltip on the tablet icon rail */}
                    <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-md border border-slate-200 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 md:block xl:hidden">
                      {label}
                    </span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="shrink-0 border-t border-slate-200/80 p-3 dark:border-slate-800">
            {/*
              Theme + export.
              · < md  : drawer (272px)  → full-width controls
              · md–xl : icon rail (76px) → single icon buttons
              · ≥ xl  : sidebar (248px)  → segmented control + labelled export
            */}
            <div className="mb-2 space-y-1.5">
              {/* segmented control on mobile + desktop, cycling icon on the rail */}
              <div className="md:hidden xl:block">
                <ThemeToggle compact />
              </div>
              <div className="hidden md:flex xl:hidden">
                <ThemeToggle iconOnly />
              </div>

              {/* labelled on mobile + desktop, icon-only on the rail */}
              <div className="md:hidden xl:block">
                <ExportMenu full />
              </div>
              <div className="hidden md:flex xl:hidden">
                <ExportMenu iconOnly />
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-slate-50 md:flex-col md:justify-center md:gap-1 xl:flex-row xl:justify-start xl:gap-3 dark:hover:bg-slate-800/70">
              <Avatar name={user?.name} url={user?.avatarUrl} />
              <div className="min-w-0 flex-1 md:hidden xl:block">
                <p className="truncate text-sm font-medium text-slate-900">{user?.name}</p>
                <p className="truncate text-[11px] text-slate-500">{user?.email}</p>
              </div>
              <button
                className="btn-icon shrink-0 md:hidden xl:inline-flex"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
            {/* sign-out stays reachable on the tablet rail */}
            <button
              className="btn-icon mt-1 hidden w-full md:inline-flex xl:hidden"
              onClick={handleSignOut}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8 xl:px-10">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>
      </div>

      {/* global overlays: palette, quick capture sheet */}
      <CommandPalette />
      <QuickCapture />
    </div>
  )
}

function Avatar({ name, url }: { name?: string; url?: string | null }) {
  if (url) {
    return <img src={url} alt="" className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200" />
  }
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white ring-1 ring-slate-200">
      {name?.[0]?.toUpperCase() ?? 'S'}
    </div>
  )
}

function BrandMark() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-sm shadow-brand-900/50">
      <Sparkles size={17} className="text-slate-900" />
    </div>
  )
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <NavLink to="/app" className="flex items-center gap-2.5" title="Dashboard">
      <BrandMark />
      <div className={compact ? '' : 'min-w-0'}>
        <p className="text-[15px] font-semibold leading-none tracking-tight text-slate-900">SoulMate</p>
        <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500">
          Life · Goals · Growth
        </p>
      </div>
    </NavLink>
  )
}
