import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { isPreviewMode } from './lib/api'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import Landing from './pages/Landing'
import SignUp from './pages/SignUp'
import AuthCallback from './pages/AuthCallback'
import AuthError from './pages/AuthError'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import Goals from './pages/Goals'
import Projects from './pages/Projects'
import Challenges from './pages/Challenges'
import Analysis from './pages/Analysis'

/**
 * Signed-in + onboarded only. A user who signed up but has not answered the
 * role / details questions is sent back to finish them, so the workspace never
 * opens with a half-filled profile.
 */
function Protected({ children }: { children: React.ReactNode }) {
  const { user, onboarded, loading } = useApp()
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ink-950">
        <Spinner label="Loading SoulMate…" />
      </div>
    )
  }
  // dev preview (?preview=1) has its own fake user and needs no Google login
  if (!user && !isPreviewMode()) return <Navigate to="/signin" replace />
  if (!onboarded) return <Navigate to="/signup" replace />
  return <Layout>{children}</Layout>
}

/** The landing page is public; a signed-in user gets a shortcut into the app. */
function Public({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Public><Landing /></Public>} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/signin" element={<SignUp />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/auth/error" element={<AuthError />} />

      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/journal" element={<Protected><Journal /></Protected>} />
      <Route path="/app/goals" element={<Protected><Goals /></Protected>} />
      <Route path="/app/projects" element={<Protected><Projects /></Protected>} />
      <Route path="/app/challenges" element={<Protected><Challenges /></Protected>} />
      <Route path="/app/analysis" element={<Protected><Analysis /></Protected>} />

      {/* old top-level routes still work */}
      <Route path="/journal" element={<Navigate to="/app/journal" replace />} />
      <Route path="/goals" element={<Navigate to="/app/goals" replace />} />
      <Route path="/projects" element={<Navigate to="/app/projects" replace />} />
      <Route path="/challenges" element={<Navigate to="/app/challenges" replace />} />
      <Route path="/analysis" element={<Navigate to="/app/analysis" replace />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
