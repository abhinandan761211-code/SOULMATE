# SoulMate

A personal life companion: write your daily life, set goals for today / tomorrow / the future,
mark what you did right or wrong, and analyse your successes and failures.

- **Frontend:** React 19 + TypeScript + Tailwind CSS v4 (Vite)
- **Auth:** Supabase Auth with **Google sign-in** (OAuth)
- **Database:** Supabase (PostgreSQL)

> Firebase is **not** used. Google sign-in is handled by Supabase Auth, which talks to the
> Google OAuth client configured in your Google Cloud project.

---

## Features

| Page | What it does |
|---|---|
| **Dashboard** | Today's goals with one-tap done/failed, tomorrow's plan, today's journal preview, habit check-in, KPIs (progress, success rate, journal streak, projects) |
| **Daily Journal** | One entry per day (title, mood, free text), habit list with right/wrong marking, 14-day habit grid, past entries |
| **Goals** | Tabs for **Daily plan** (today / tomorrow / day after), **Present goals** (week / month / year), **Future goals** (long term), and **Success & failure** results table. Mark any goal success or failed, set priority, due date and progress |
| **Projects** | Create projects, then add goals as **table rows** (task, owner, due date, status, notes). Mark each row done/failed; project progress is computed from the rows |
| **Analysis** | Success rate, habit discipline, journal streak, weekly success-vs-failure bar chart, mood trend, lists of wins and failures, and a weekly review form (wins / failures / lessons / next actions / score) |

---

## Setup

### 1. Install

```bash
cd frontend
npm install
```

### 2. Environment

Copy the template and fill in your own project values:

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

`backend/.env` holds the server-side secrets (Google client secret, Supabase keys). The client
secret must **never** be shipped to the browser — it is only used when configuring the Google
provider inside Supabase.

> `.env` files are gitignored. Only `.env.example` templates are committed, so secrets never
> reach GitHub.

### 3. Database

The schema lives in [`database/schema.sql`](../database/schema.sql). Run it once in
**Supabase Dashboard → SQL Editor**. It creates:

`profiles`, `journal_entries`, `goals`, `habits`, `habit_logs`, `projects`, `project_tasks`,
`analysis_entries` — plus indexes, an `updated_at` trigger and RLS policies.

> **Already created the tables before moving to Supabase Auth?** Re-run only
> [`database/migration-rls-supabase-auth.sql`](../database/migration-rls-supabase-auth.sql) — it converts the
> old `to anon` policies into `to authenticated` ones scoped by `auth.uid()`.
> Without that, signed-in writes fail with
> `new row violates row-level security policy for table "profiles"` (HTTP 403).

### 4. Google sign-in (Supabase Auth)

1. **Google Cloud Console → APIs & Services → Credentials** → your OAuth 2.0 Web client.
   Add an **Authorized redirect URI** (use your own project ref):
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
2. **Supabase Dashboard → Authentication → Providers → Google** → enable it and paste the
   Client ID and Client Secret from `backend/.env`.
3. **Supabase Dashboard → Authentication → URL Configuration**:
   - Site URL: `http://localhost:5199`
   - Redirect URLs: `http://localhost:5199/auth/callback`

### 5. Run

```bash
cd frontend
npm run dev
```

Open http://localhost:5199 and click **Continue with Google**.

> The dev server is pinned to port **5199** (`strictPort: true` in `vite.config.ts`), so it will
> fail loudly instead of silently moving to another port if 5199 is already taken.

---

## UI preview without signing in

In dev mode you can browse the whole app with sample data (nothing is written to the database):

```
http://localhost:5199/?preview=1
```

This only works with `npm run dev`; it is disabled in production builds.

---

## Project structure

```
SoulMate/
├── backend/.env              # server-side secrets (Google client secret, Supabase keys)
├── database/schema.sql       # Supabase schema — run once in the SQL editor
└── frontend/
    ├── .env                  # VITE_* public config
    └── src/
        ├── lib/
        │   ├── supabase.ts   # Supabase client
        │   ├── auth.ts       # Google sign-in, profile upsert
        │   ├── api.ts        # all data access (goals, journal, habits, projects, analysis)
        │   ├── stats.ts      # derived metrics (success rate, streaks, weekly chart)
        │   ├── types.ts      # shared types + labels
        │   └── previewData.ts# sample data for ?preview=1
        ├── context/AppContext.tsx  # session + data provider
        ├── components/       # Layout, Modal, Progress, EmptyState
        └── pages/            # Login, AuthCallback, Dashboard, Journal, Goals, Projects, Analysis
```

## Data model notes

- Every row is scoped by `user_id` = the Supabase auth user id.
- `goals.horizon` — `today | tomorrow | day_after | week | month | year | long_term`
- `goals.bucket` — `future | present | done`
- `goals.status` — `planned | in_progress | success | failed`
- `habit_logs.mark` — `yes` (right) | `no` (wrong) | `skip`
- `project_tasks.status` — `todo | doing | done | failed`

## Scripts

```bash
npm run dev      # dev server
npm run build    # typecheck + production build
npm run preview  # preview the production build
```
