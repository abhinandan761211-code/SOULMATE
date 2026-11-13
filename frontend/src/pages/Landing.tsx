import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarCheck,
  Check,
  ChevronRight,
  Flame,
  FolderKanban,
  Lock,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react'
import { useApp } from '../context/AppContext'

/* ------------------------------------------------------------------ */
/*  Content — mirrors what the product actually does, not marketing    */
/* ------------------------------------------------------------------ */

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Daily journal',
    text: 'One honest entry per day — mood, what happened, what you would change. A streak that keeps you showing up.',
    points: ['Mood + free writing', '14-day habit grid', 'Saved automatically'],
  },
  {
    icon: Target,
    title: 'Goals that get decided',
    text: 'Plan today, tomorrow and the day after, then mark each goal success or failed. Nothing stays vague forever.',
    points: ['Today / tomorrow / future', 'Priority + progress', 'Success or failure'],
  },
  {
    icon: FolderKanban,
    title: 'Projects with real tables',
    text: 'Break a project into rows and shape the columns yourself — what to do, how to do it, effort, owner.',
    points: ['Custom columns', 'Inline editing', 'Auto progress'],
  },
  {
    icon: Flame,
    title: 'Challenges',
    text: 'Run 30, 50 or 90-day challenges side by side and mark each day pass or fail.',
    points: ['Multiple in parallel', 'Daily pass / fail', 'Best streak'],
  },
  {
    icon: BarChart3,
    title: 'Success & failure analysis',
    text: 'The part most apps avoid: your failures, counted and reviewed, so patterns stop repeating.',
    points: ['Success rate', 'Weekly wins vs failures', 'Weekly review form'],
  },
  {
    icon: CalendarCheck,
    title: 'Built on discipline',
    text: 'Habits marked right or wrong, streaks that mean something, and a score that does not flatter you.',
    points: ['Right / wrong marking', 'Consistency score', 'Journal streak'],
  },
]

const STEPS = [
  {
    n: '01',
    title: 'Sign in with Google',
    text: 'One click. No new password to remember, no email to verify.',
  },
  {
    n: '02',
    title: 'Tell us about you',
    text: 'Pick your role — student, professional, freelancer, founder or personal growth — and add a few details.',
  },
  {
    n: '03',
    title: 'Start your first entry',
    text: 'Write today, set tomorrow, and mark it honestly. The analysis builds itself.',
  },
]

const STATS = [
  { value: '1', label: 'honest entry a day' },
  { value: '7', label: 'goal horizons' },
  { value: '30 / 50 / 90', label: 'day challenges' },
  { value: '100%', label: 'your own data' },
]

export default function Landing() {
  const { user } = useApp()
  const ctaTo = user ? '/app' : '/signup'
  const ctaLabel = user ? 'Open your workspace' : 'Sign up with Google'

  return (
    <div className="min-h-screen bg-white">
      <Header ctaTo={ctaTo} ctaLabel={user ? 'Open app' : 'Sign up'} signedIn={Boolean(user)} />

      {/* ---------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        {/* restrained background: a soft grid + one warm glow, no rainbow blobs */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.55]"
          style={{
            backgroundImage:
              'linear-gradient(to right, rgb(241 245 249) 1px, transparent 1px), linear-gradient(to bottom, rgb(241 245 249) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black 40%, transparent 100%)',
          }}
        />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-brand-500/10 blur-[110px]" />

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pb-20 sm:pt-20 lg:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs backdrop-blur">
              <Sparkles size={13} className="text-brand-600" />
              Your personal life companion
            </div>

            <h1 className="mt-6 text-[34px] font-semibold leading-[1.08] tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-[56px]">
              Write your day.{' '}
              <span className="relative whitespace-nowrap">
                <span className="relative z-10">Judge it honestly.</span>
                {/* highlight sits BEHIND the text, low enough not to touch descenders */}
                <span
                  className="absolute inset-x-0 bottom-[0.06em] z-0 h-[0.34em] rounded-sm bg-brand-200/70"
                  aria-hidden
                />
              </span>{' '}
              Grow.
            </h1>

            <p className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-slate-600 sm:text-base">
              SoulMate is one place for your daily writing, your goals for today and the future, your projects and
              challenges — and an honest record of what worked and what did not.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to={ctaTo} className="btn-primary w-full gap-2.5 px-6 py-3 text-[15px] sm:w-auto">
                <GoogleMark />
                <span>{ctaLabel}</span>
                <ArrowRight size={16} />
              </Link>
              <a href="#features" className="btn-ghost w-full px-6 py-3 text-[15px] sm:w-auto">
                See what it does
              </a>
            </div>

            <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <Check size={13} className="text-emerald-600" /> Free to start
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Lock size={13} className="text-slate-400" /> Your data stays yours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap size={13} className="text-amber-500" /> No credit card
              </span>
            </p>
          </div>

          {/* product preview — real layout, not a screenshot */}
          <ProductPreview />
        </div>
      </section>

      {/* -------------------------------------------------------- stats */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-5 sm:px-8 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="px-2 py-7 text-center">
              <dt className="sr-only">{s.label}</dt>
              <dd>
                <span className="block text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {s.value}
                </span>
                <span className="mt-1 block text-xs text-slate-500">{s.label}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ----------------------------------------------------- features */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Everything in one place</p>
          <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
            Six tools that keep each other honest
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
            Journaling without goals is a diary. Goals without analysis is a wish list. SoulMate connects them, so
            every day feeds the next decision.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, points }) => (
            <article
              key={title}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-100 transition-colors group-hover:bg-brand-600 group-hover:text-white group-hover:ring-brand-600">
                <Icon size={18} />
              </span>
              <h3 className="mt-4 text-[15px] font-semibold tracking-tight text-slate-900">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{text}</p>
              <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
                {points.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-[12px] text-slate-500">
                    <Check size={12} className="shrink-0 text-emerald-600" strokeWidth={3} />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="border-y border-slate-200 bg-slate-50/70">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">Getting started</p>
            <h2 className="mt-3 text-[26px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 sm:text-4xl">
              Live in under a minute
            </h2>
          </div>
          <ol className="mt-10 grid gap-6 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="relative">
                {/* connector line between steps on wide screens */}
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute left-[calc(100%+0.5rem)] top-5 hidden h-px w-[calc(100%-1rem)] bg-gradient-to-r from-slate-300 to-transparent sm:block"
                    aria-hidden
                  />
                )}
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold tabular-nums text-brand-700 shadow-xs">
                  {s.n}
                </span>
                <h3 className="mt-4 text-[15px] font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* --------------------------------------------------------- CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative">
            <TrendingUp className="mx-auto text-brand-400" size={26} />
            <h2 className="mx-auto mt-4 max-w-xl text-[26px] font-semibold leading-tight tracking-[-0.02em] text-white sm:text-4xl">
              Your future is built from what you write today
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-300">
              Start with one entry. In a month you will have something most people never have: an honest record of
              yourself.
            </p>
            <Link
              to={ctaTo}
              className="btn mt-8 w-full gap-2.5 bg-white px-6 py-3 text-[15px] font-semibold text-slate-900 shadow-sm hover:bg-slate-100 sm:w-auto"
            >
              <GoogleMark />
              <span>{ctaLabel}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------ footer */}
      <footer className="border-t border-slate-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 text-xs text-slate-500 sm:flex-row sm:px-8">
          <p className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-600">
              <Sparkles size={12} className="text-white" />
            </span>
            <span className="font-semibold text-slate-700">SoulMate</span>
            <span className="text-slate-300">·</span>
            Life · Goals · Growth
          </p>
          <nav className="flex items-center gap-5">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <Link to="/signin" className="transition-colors hover:text-slate-900">
              Sign in
            </Link>
            <Link to="/signup" className="transition-colors hover:text-slate-900">
              Sign up
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Header({
  ctaTo,
  ctaLabel,
  signedIn,
}: {
  ctaTo: string
  ctaLabel: string
  signedIn: boolean
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 shadow-sm">
            <Sparkles size={16} className="text-white" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">SoulMate</span>
        </Link>

        <nav className="hidden items-center gap-7 text-[13px] font-medium text-slate-600 md:flex">
          <a href="#features" className="transition-colors hover:text-slate-900">
            Features
          </a>
          <a href="#features" className="transition-colors hover:text-slate-900">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-2">
          {!signedIn && (
            <Link to="/signin" className="btn-ghost hidden px-3.5 py-2 text-[13px] sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link to={ctaTo} className="btn-primary gap-1.5 px-3.5 py-2 text-[13px]">
            <span>{ctaLabel}</span>
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>
    </header>
  )
}

/** A faithful mini version of the dashboard — built from the same classes. */
function ProductPreview() {
  const goals = [
    { title: 'Finish the login page', status: 'success' },
    { title: 'Write 500 words', status: 'planned' },
    { title: '30 min workout', status: 'failed' },
  ]
  const tone: Record<string, string> = {
    success: 'bg-emerald-50 text-emerald-700',
    planned: 'bg-slate-100 text-slate-600',
    failed: 'bg-rose-50 text-rose-700',
  }

  return (
    <div className="relative mx-auto mt-14 max-w-4xl sm:mt-16">
      <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-[0_2px_8px_rgb(16_24_40/0.06),0_24px_48px_-12px_rgb(16_24_40/0.12)]">
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="ml-2 hidden rounded bg-slate-50 px-2 py-0.5 text-[10px] text-slate-400 sm:block">
            soulmate · dashboard
          </span>
        </div>

        <div className="grid gap-2 rounded-lg bg-slate-50/80 p-2 sm:grid-cols-3">
          {/* KPI strip */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Today</p>
                <p className="text-sm font-semibold text-slate-900">Good morning, Aarav</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] text-slate-500">
                <span>
                  <span className="font-semibold text-slate-900">67%</span> progress
                </span>
                <span>
                  <span className="font-semibold text-emerald-600">80%</span> success
                </span>
                <span className="hidden sm:inline">
                  <span className="font-semibold text-slate-900">6</span> day streak
                </span>
              </div>
            </div>
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 rounded-full bg-brand-500" />
            </div>
          </div>

          {/* goals */}
          <div className="rounded-lg border border-slate-200 bg-white p-3 sm:col-span-2">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Today&apos;s goals</p>
            <ul className="space-y-1.5">
              {goals.map((g, i) => (
                <li key={g.title} className="flex items-center gap-2">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${g.status === 'success'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : g.status === 'failed'
                          ? 'border-rose-300 bg-rose-50 text-rose-500'
                          : 'border-slate-300 text-transparent'
                      }`}
                  >
                    <Check size={9} strokeWidth={4} />
                  </span>
                  <span
                    className={`flex-1 truncate text-[11px] ${g.status === 'failed' ? 'text-slate-400 line-through' : 'text-slate-700'
                      }`}
                  >
                    {g.title}
                  </span>
                  <span className={`chip ${tone[g.status]}`}>{g.status}</span>
                  <span className="hidden text-[10px] tabular-nums text-slate-300 sm:inline">0{i + 1}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* habit grid */}
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Last 14 days</p>
            <div className="space-y-1.5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex gap-1">
                  {Array.from({ length: 14 }, (_, i) => {
                    const seed = (row * 7 + i * 3) % 11
                    const color =
                      seed < 5 ? 'bg-emerald-500' : seed < 8 ? 'bg-rose-400' : 'bg-slate-100'
                    return <span key={i} className={`h-2.5 flex-1 rounded-sm ${color}`} />
                  })}
                </div>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
              <Flame size={10} className="text-amber-500" /> right / wrong, honestly
            </p>
          </div>
        </div>
      </div>

      {/* floating accent cards */}
      <div className="absolute -right-3 -top-5 hidden rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop lg:block">
        <p className="text-[10px] text-slate-400">This week</p>
        <p className="text-sm font-semibold text-emerald-600">+12% success</p>
      </div>
      <div className="absolute -bottom-5 -left-4 hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-pop lg:flex">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-50">
          <Flame size={12} className="text-amber-500" />
        </span>
        <div>
          <p className="text-[10px] leading-none text-slate-400">Challenge</p>
          <p className="text-[11px] font-semibold text-slate-800">Day 12 of 30</p>
        </div>
      </div>
    </div>
  )
}

/** Google's official 4-colour "G". */
export function GoogleMark({ size = 17 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.6l6.2 5.2C41 35.4 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  )
}
