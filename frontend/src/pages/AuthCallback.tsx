import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ensureProfile } from '../lib/auth'
import { Spinner } from '../components/ui'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    let cancelled = false

    const finish = async () => {
      // PKCE flow: exchange the ?code= for a session
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      const errCode = params.get('error_code') ?? params.get('error')
      const errDesc = params.get('error_description')

      // Supabase reports provider failures here rather than redirecting into
      // the app, e.g. "server_error", "access_denied", "invalid_client".
      if (errCode || errDesc) {
        const q = new URLSearchParams()
        if (errCode) q.set('error_code', errCode)
        if (errDesc) q.set('error_description', errDesc)
        navigate(`/auth/error?${q.toString()}`, { replace: true })
        return
      }

      // Some failures come back in the hash for the implicit flow.
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      if (hash.get('error') || hash.get('error_description')) {
        const q = new URLSearchParams()
        if (hash.get('error')) q.set('error_code', hash.get('error') as string)
        if (hash.get('error_description')) q.set('error_description', hash.get('error_description') as string)
        navigate(`/auth/error?${q.toString()}`, { replace: true })
        return
      }

      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
        if (exchangeError) {
          const q = new URLSearchParams({
            error_code: exchangeError.name || 'exchange_failed',
            error_description: exchangeError.message,
          })
          navigate(`/auth/error?${q.toString()}`, { replace: true })
          return
        }
      }

      const { data } = await supabase.auth.getSession()
      if (cancelled) return
      if (!data.session) {
        navigate('/auth/error?error_code=no_session', { replace: true })
        return
      }

      // New users still need to pick a role and fill their details, so send
      // them to /signup; it forwards straight to /app once that is done.
      const profile = await ensureProfile()
      if (cancelled) return
      navigate(profile?.onboarded_at ? '/app' : '/signup', { replace: true })
    }

    finish()
    return () => {
      cancelled = true
    }
  }, [navigate])

  // Every outcome navigates somewhere, so there is no error state to render.
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <Spinner label="Signing you in…" />
    </div>
  )
}
