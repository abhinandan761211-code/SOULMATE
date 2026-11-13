import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Brush,
  Briefcase,
  Building2,
  Check,
  GraduationCap,
  Loader2,
  Rocket,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import { saveOnboarding, signInWithGoogle, type OnboardingPayload } from '../lib/auth'
import { isSupabaseConfigured } from '../lib/supabase'
import { useApp } from '../context/AppContext'
import { ROLE_OPTIONS, type UserRole } from '../lib/types'
import { GoogleMark } from './Landing'

const ROLE_ICON: Record<UserRole, typeof GraduationCap> = {
  student: GraduationCap,
  professional: Briefcase,
  freelancer: Brush,
  founder: Rocket,
  personal: Building2,
}

const COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'France',
  'Netherlands',
  'Singapore',
  'United Arab Emirates',
  'Japan',
  'Brazil',
  'South Africa',
  'Other',
]

type Step = 1 | 2 | 3

export default function SignUp() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { user, onboarded, loading, refresh } = useApp()

  // /signin only changes the words, the flow is identical
  const isSignIn = params.get('mode') === 'signin'

  const [step, setStep] = useState<Step>(1)
  const [role, setRole] = useState<UserRole | null>(null)
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState('')
  const [country, setCountry] = useState('India')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(params.get('error'))
  const [touched, setTouched] = useState<{ name?: boolean; age?: boolean }>({})

  // Dev-only: ?step=2 lets us look at the role/details screens without a real
  // Google round-trip. Never active in a production build.
  const debugStep = import.meta.env.DEV ? Number(params.get('step')) : 0

  // Once Google has finished, a signed-in user who is not onboarded lands on
  // step 2 with their name prefilled from the Google account.
  useEffect(() => {
    if (debugStep === 2 || debugStep === 3) {
      setStep(debugStep as Step)
      setFullName((prev) => prev || 'Aarav Sharma')
      return
    }
    if (!user) return
    if (onboarded) {
      navigate('/app', { replace: true })
      return
    }
    setFullName((prev) => prev || user.name || '')
    setStep(2)
  }, [user, onboarded, navigate, debugStep])

  const ageNum = age.trim() === '' ? null : Number(age)
  const ageError =
    age.trim() !== '' && (!Number.isFinite(ageNum) || (ageNum as number) < 10 || (ageNum as number) > 120)
      ? 'Enter an age between 10 and 120.'
      : null
  const nameError = touched.name && !fullName.trim() ? 'Please enter your full name.' : null
  const canFinish = Boolean(role) && fullName.trim().length >= 2 && !ageError

  const handleGoogle = async () => {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
      // browser is redirecting to Google — keep the spinner
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed')
      setBusy(false)
    }
  }

  const finish = async () => {
    if (!role || !canFinish) return
    setBusy(true)
    setError(null)
    try {
      const payload: OnboardingPayload = {
        role,
        full_name: fullName,
        age: ageNum,
        country,
      }
      await saveOnboarding(payload)
      await refresh()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details')
      setBusy(false)
    }
  }

  const progress = useMemo(() => (user ? (step - 1) * 50 : 0), [user, step])

  if (!debugStep && !loading && user && !onboarded && step === 1) {
    // avoid a flash of step 1 for an already-redirected user
    return (
      <Shell>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-600" size={20} />
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* progress: only meaningful once signed in */}
      {user && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-slate-500">
            <span className={step >= 2 ? 'text-slate-900' : ''}>1 · Your role</span>
            <span className={step >= 3 ? 'text-slate-900' : ''}>2 · Your details</span>
          </div>
          <div className="flex gap-1.5">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span className="block h-full w-full rounded-full bg-brand-500" />
            </span>
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-100">
              <span
                className="block h-full rounded-full bg-brand-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-[13px] text-rose-700">
          <TriangleAlert size={15} className="mt-0.5 shrink-0" />
          <span className="min-w-0 flex-1">{error}</span>
        </div>
      )}

      {/* ------------------------------------------------------- step 1 */}
      {step === 1 && (
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">
            {isSignIn ? 'Welcome back' : 'Create your SoulMate account'}
          </h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            {isSignIn
              ? 'Sign in with Google to continue where you left off.'
              : 'One click with Google. No password to remember.'}
          </p>

          <button
            onClick={handleGoogle}
            disabled={busy || !isSupabaseConfigured}
            className="btn-ghost mt-6 w-full gap-3 py-3 text-[14px] font-semibold"
          >
            {busy ? <Loader2 size={17} className="animate-spin" /> : <GoogleMark size={18} />}
            {busy ? 'Opening Google…' : isSignIn ? 'Sign in with Google' : 'Sign up with Google'}
          </button>

          {!isSupabaseConfigured && (
            <p className="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-700 ring-1 ring-amber-200">
              Supabase keys are missing. Add <code className="font-mono">VITE_SUPABASE_URL</code> and{' '}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to <code className="font-mono">frontend/.env</code>.
            </p>
          )}

          <ul className="mt-6 space-y-2.5 border-t border-slate-100 pt-5">
            {[
              'We only ask for your name and email from Google',
              'You choose your role and details in the next step',
              'Your entries stay in your own database',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2 text-[12px] text-slate-500">
                <ShieldCheck size={14} className="mt-px shrink-0 text-emerald-600" />
                {t}
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-[13px] text-slate-500">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <Link
              to={isSignIn ? '/signup' : '/signin'}
              className="font-semibold text-brand-700 hover:underline"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </Link>
          </p>
        </div>
      )}

      {/* ------------------------------------------------------- step 2 */}
      {step === 2 && (
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">What describes you best?</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            This shapes the home view and the goals we suggest. You can change it anytime.
          </p>

          <div className="mt-5 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Your role">
            {ROLE_OPTIONS.map((opt) => {
              const Icon = ROLE_ICON[opt.value]
              const selected = role === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(opt.value)}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-[background-color,border-color,box-shadow] duration-150 ${selected
                    ? 'border-brand-400 bg-brand-50/80 shadow-xs ring-1 ring-brand-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                  >
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-900">
                      {opt.label}
                      {selected && <Check size={13} className="text-brand-600" strokeWidth={3} />}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">{opt.hint}</span>
                  </span>
                </button>
              )
            })}
          </div>

          <div className="mt-6 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="btn-ghost gap-1.5 px-3 py-2 text-[13px]">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!role}
              className="btn-primary gap-1.5 px-4 py-2 text-[13px]"
            >
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------- step 3 */}
      {step === 3 && (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            finish()
          }}
        >
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-slate-900">A little about you</h1>
          <p className="mt-1.5 text-[13px] leading-relaxed text-slate-500">
            Used for your greeting and future age-aware insights. Nothing is shared.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label htmlFor="fullName" className="label">
                Full name <span className="text-rose-500">*</span>
              </label>
              <input
                id="fullName"
                className={`input ${nameError ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/15' : ''}`}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                placeholder="Aarav Sharma"
                autoComplete="name"
                aria-invalid={Boolean(nameError)}
              />
              {nameError && <p className="mt-1.5 text-[12px] text-rose-600">{nameError}</p>}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="age" className="label">
                  Age <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
                </label>
                <input
                  id="age"
                  type="number"
                  inputMode="numeric"
                  min={10}
                  max={120}
                  className={`input tabular-nums ${ageError ? 'border-rose-400 focus:border-rose-400 focus:ring-rose-500/15' : ''}`}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="24"
                  aria-invalid={Boolean(ageError)}
                />
                {ageError && <p className="mt-1.5 text-[12px] text-rose-600">{ageError}</p>}
              </div>

              <div>
                <label htmlFor="country" className="label">
                  Country
                </label>
                <select
                  id="country"
                  className="input"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white text-brand-600 ring-1 ring-slate-200">
                {role ? (() => {
                  const Icon = ROLE_ICON[role]
                  return <Icon size={13} />
                })() : <Sparkles size={13} />}
              </span>
              <p className="min-w-0 flex-1 truncate text-[12px] text-slate-600">
                Role:{' '}
                <span className="font-semibold text-slate-900">
                  {ROLE_OPTIONS.find((r) => r.value === role)?.label ?? '—'}
                </span>
              </p>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="shrink-0 text-[12px] font-semibold text-brand-700 hover:underline"
              >
                Change
              </button>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="btn-ghost gap-1.5 px-3 py-2 text-[13px]"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button type="submit" disabled={!canFinish || busy} className="btn-primary gap-1.5 px-4 py-2 text-[13px]">
              {busy ? <Loader2 size={14} className="animate-spin" /> : null}
              {busy ? 'Saving…' : 'Finish and enter'}
              {!busy && <ArrowRight size={14} />}
            </button>
          </div>
        </form>
      )}
    </Shell>
  )
}

/** Split layout: form on the left, product proof on the right. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[1fr_minmax(0,520px)]">
      {/* left: form */}
      <div className="flex min-h-screen flex-col px-5 py-6 sm:px-8 sm:py-8">
        <Link to="/" className="mb-8 inline-flex w-fit items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles size={15} className="text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">SoulMate</span>
        </Link>

        <div className="flex flex-1 items-center">
          <div className="mx-auto w-full max-w-[400px] py-4">{children}</div>
        </div>

        <p className="mt-8 text-center text-[11px] leading-relaxed text-slate-400">
          By continuing you agree that your entries are stored in your own database and are never shared.
        </p>
      </div>

      {/* right: quiet panel with reasons to stay */}
      <aside className="relative hidden overflow-hidden border-l border-slate-200 bg-slate-50/80 lg:flex lg:flex-col lg:justify-center">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(226 232 240 / 0.7) 1px, transparent 1px), linear-gradient(to bottom, rgb(226 232 240 / 0.7) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%, black 30%, transparent 100%)',
          }}
        />
        <div className="relative px-10 py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Why people stay</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-slate-900">
            Most apps track. SoulMate makes you decide.
          </h2>

          <ul className="mt-8 space-y-4">
            {[
              { icon: Check, title: 'Nothing stays pending', text: 'Every goal ends as success or failed — no quiet forgetting.' },
              { icon: Sparkles, title: 'One entry a day', text: 'Short writing beats a perfect system you never open.' },
              { icon: ShieldCheck, title: 'Private by default', text: 'Your rows are scoped to your account by row-level security.' },
            ].map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-brand-600 shadow-xs">
                  <Icon size={14} strokeWidth={2.5} />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-slate-900">{title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-slate-500">{text}</p>
                </div>
              </li>
            ))}
          </ul>

          <blockquote className="mt-10 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-[13px] leading-relaxed text-slate-700">
              “The value wasn&apos;t the journal. It was marking a goal failed and having to read it again the next
              week.”
            </p>
            <footer className="mt-3 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-[10px] font-semibold text-white">
                A
              </span>
              <span className="text-[11px] text-slate-500">Aarav · 47-day streak</span>
            </footer>
          </blockquote>
        </div>
      </aside>
    </div>
  )
}
