import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { ensureProfile, toAppUser, type AppUser } from '../lib/auth'
import { isPreviewMode, loadDashboard, type DashboardData } from '../lib/api'
import { PREVIEW_DATA } from '../lib/previewData'

interface AppContextValue {
  user: AppUser | null
  /** true once role + personal details are saved; gates the workspace */
  onboarded: boolean
  loading: boolean
  data: DashboardData
  error: string | null
  refresh: () => Promise<void>
  signOut: () => Promise<void>
}

const EMPTY: DashboardData = {
  goals: [],
  journal: [],
  habits: [],
  habitLogs: [],
  projects: [],
  analysis: null,
  challenges: [],
  challengeLogs: [],
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<DashboardData>(EMPTY)
  const [error, setError] = useState<string | null>(null)

  // Dev-only UI preview: open /?preview=1 to browse the app with sample data
  // (no Google login, nothing is written to the database). Read the latched
  // flag, not the URL — in-app navigation drops the query string.
  const preview = isPreviewMode()

  useEffect(() => {
    if (!preview) return
    setUser({
      id: 'preview',
      email: 'you@example.com',
      name: 'Aarav Sharma',
      avatarUrl: null,
      role: 'professional',
      onboarded: true,
    })
    setData(PREVIEW_DATA)
    setLoading(false)
  }, [preview])

  const loadForSession = useCallback(async (session: Session) => {
    const profile = await ensureProfile()
    setUser(
      toAppUser(profile, {
        email: session.user.email,
        name: session.user.user_metadata?.full_name as string | undefined,
        avatar: session.user.user_metadata?.avatar_url as string | undefined,
      }),
    )
    const next = await loadDashboard(session.user.id)
    setData(next)
  }, [])

  const refresh = useCallback(async () => {
    // Preview mode has no session and fake ids, so re-fetching would wipe the
    // sample data and then fail every write. Pages keep their local state.
    if (preview) return
    const { data: sessionData } = await supabase.auth.getSession()
    if (!sessionData.session) {
      setData(EMPTY)
      return
    }
    try {
      setError(null)
      await loadForSession(sessionData.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load your data')
    }
  }, [loadForSession, preview])

  useEffect(() => {
    if (preview) return
    let alive = true

    supabase.auth.getSession().then(async ({ data: sessionData }) => {
      if (!alive) return
      if (sessionData.session) {
        try {
          await loadForSession(sessionData.session)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load your data')
        }
      }
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!alive) return
      if (session) {
        try {
          setError(null)
          await loadForSession(session)
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to load your data')
        }
      } else {
        setUser(null)
        setData(EMPTY)
      }
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [loadForSession, preview])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setData(EMPTY)
  }, [])

  const value = useMemo(
    () => ({
      user,
      onboarded: user ? user.onboarded : true,
      loading,
      data,
      error,
      refresh,
      signOut,
    }),
    [user, loading, data, error, refresh, signOut],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>')
  return ctx
}
