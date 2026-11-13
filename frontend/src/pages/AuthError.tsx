import { Link, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ExternalLink, RefreshCw } from 'lucide-react'

/**
 * Shown when Supabase Auth fails *before* it can redirect back into the app
 * (bad Google client secret, unlisted redirect URI, provider disabled, ...).
 *
 * In those cases Supabase itself serves its own "500 That's an error" page and
 * our SPA never loads, so the primary fix is documented rather than coded.
 * This page is for the cases that DO come back with ?error=... in the URL.
 */
export default function AuthError() {
  const [params] = useSearchParams()
  const code = params.get('error_code') || params.get('error')
  const desc = params.get('error_description')

  // Build the dashboard link from the configured project instead of hardcoding
  // a project ref into the source, so the repo stays generic.
  const projectRef = import.meta.env.VITE_SUPABASE_URL?.match(/\/\/([^.]+)\.supabase\.co/)?.[1]
  const settingsUrl = projectRef
    ? `https://supabase.com/dashboard/project/${projectRef}/auth/providers`
    : 'https://supabase.com/dashboard/projects'

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-5 py-10">
      <div className="w-full max-w-lg">
        <Link to="/" className="mb-8 inline-flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <span className="text-sm font-bold text-white">S</span>
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">SoulMate</span>
        </Link>

        <div className="card p-6">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600 ring-1 ring-inset ring-rose-100">
            <AlertTriangle size={20} />
          </span>
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-slate-900">Sign-in could not be completed</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">
            Google sent us back without a valid session. This is almost always a configuration issue on the
            Supabase / Google side — not something wrong with your account.
          </p>

          {(code || desc) && (
            <pre className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 font-mono text-[11px] leading-relaxed text-slate-600">
              {code ? `error: ${code}\n` : ''}
              {desc ?? ''}
            </pre>
          )}

          <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Most likely causes</p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-slate-600">
              <li>
                · The Google <strong>client secret</strong> in Supabase is wrong or expired
                (Authentication → Providers → Google).
              </li>
              <li>
                · <code className="font-mono text-[11px]">…/auth/v1/callback</code> is not listed as an Authorized
                redirect URI in Google Cloud Console.
              </li>
              <li>
                · The app URL is not in Supabase → Authentication → URL Configuration → Redirect URLs.
              </li>
            </ul>
            <a
              href={settingsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-700 hover:underline"
            >
              Open Supabase auth settings <ExternalLink size={12} />
            </a>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Link to="/signin" className="btn-primary w-full gap-2 sm:w-auto">
              <RefreshCw size={15} /> Try again
            </Link>
            <Link to="/" className="btn-ghost w-full gap-2 sm:w-auto">
              <ArrowLeft size={15} /> Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
