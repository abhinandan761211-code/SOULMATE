<div align="center">

# SoulMate

**Write your day. Judge it honestly. Grow.**

A personal life companion that connects daily journaling, goals, projects and challenges —
and holds you to an honest record of what worked and what didn't.

[![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-Auth_%2B_Postgres-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-22c55e)](LICENSE)

</div>

---

## Why

Most productivity apps track. SoulMate makes you **decide**.

Every goal ends as *success* or *failed* — nothing stays pending and quietly forgotten. Journaling
without goals is a diary; goals without analysis is a wish list. SoulMate connects the three so each
day feeds the next decision.

---

## Features

| | Feature | What it does |
|---|---|---|
| 📓 | **Daily journal** | One entry per day — title, mood and free writing. Habit list with right/wrong marking, a 14-day grid and past entries. |
| 🎯 | **Goals** | Tabs for the daily plan (today / tomorrow / day after), present goals (week / month / year) and long-term. Each goal ends as success or failed. |
| 📊 | **Projects** | Break a project into table rows and define your own columns — “What to do”, “How to do it”, effort, owner. Inline editing, automatic progress. |
| 🔥 | **Challenges** | Run 30 / 50 / 90-day (or custom) challenges side by side, marking each day pass or fail. |
| 📈 | **Analysis** | Success rate, habit discipline, journal streak, weekly success-vs-failure chart, mood trend and a weekly review form. |
| 🏠 | **Dashboard** | Today at a glance: goals, journal preview, habit check-in and headline KPIs. |

---

## Tech stack

| Layer | Choice |
|---|---|
| UI | React 19, TypeScript, Tailwind CSS v4 |
| Build | Vite 8 (dev server pinned to port **5199**) |
| Routing | React Router 7 |
| Icons / dates | lucide-react, date-fns |
| Auth | Supabase Auth — **Google OAuth (PKCE flow)** |
| Database | Supabase Postgres with **row-level security** |

---

## Getting started

### Prerequisites

- Node.js **20+**
- A [Supabase](https://supabase.com) project
- A Google OAuth 2.0 client ([Google Cloud Console](https://console.cloud.google.com/apis/credentials))

### 1 · Install

```bash
git clone https://github.com/abhinandan761211-code/SOULMATE.git
cd SOULMATE/frontend
npm install
```

### 2 · Environment

```bash
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

`frontend/.env` — public values, shipped to the browser:

```dotenv
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

`backend/.env` — **secrets, never commit these**:

```dotenv
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

> `.env` files are gitignored. Only the `*.env.example` templates are tracked.

### 3 · Database

Run [`database/schema.sql`](database/schema.sql) once in **Supabase → SQL Editor**. It creates every
table, index, trigger and RLS policy.

**Already have a database from an earlier version?** Run only the migrations you need, in this order:

| Migration | Purpose |
|---|---|
| [`migration-rls-supabase-auth.sql`](database/migration-rls-supabase-auth.sql) | Converts old `to anon` policies into `to authenticated` scoped by `auth.uid()` |
| [`migration-challenges.sql`](database/migration-challenges.sql) | Adds `challenges` and `challenge_logs` |
| [`migration-project-columns.sql`](database/migration-project-columns.sql) | Adds `project_columns` and `project_tasks.custom` |
| [`migration-profile-onboarding.sql`](database/migration-profile-onboarding.sql) | Adds `role`, `full_name`, `age`, `country`, `onboarded_at` to `profiles` |

All migrations are **safe to re-run**.

### 4 · Google sign-in

1. **Google Cloud Console → Credentials →** your OAuth 2.0 Web client → add an **Authorized redirect URI**:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
2. **Supabase → Authentication → Providers → Google** → enable, then paste the Client ID and Client Secret.
3. **Supabase → Authentication → URL Configuration**:
   - Site URL: `http://localhost:5199`
   - Redirect URLs: `http://localhost:5199/auth/callback`

### 5 · Run

```bash
cd frontend
npm run dev
```

Open **http://localhost:5199**.

---

## Routes

| Path | Access | Screen |
|---|---|---|
| `/` | Public | Landing page |
| `/signup` · `/signin` | Public | Google sign-in → role selection → personal details |
| `/auth/callback` | — | OAuth code exchange |
| `/auth/error` | Public | Sign-in failure with actionable causes |
| `/app` | Protected | Dashboard |
| `/app/journal` · `/app/goals` · `/app/projects` · `/app/challenges` · `/app/analysis` | Protected | Feature pages |

Protected routes redirect to `/signin` when signed out, and to `/signup` when role/details are
still missing — the workspace never opens with a half-filled profile.

---

## UI preview (no sign-in)

Browse the whole app with sample data. Nothing is written to the database:

```
http://localhost:5199/?preview=1
```

Dev builds only; disabled in production.

---

## Project structure

```
SOULMATE/
├── database/
│   ├── schema.sql                     # full schema + RLS — run once
│   └── migration-*.sql                # incremental upgrades, safe to re-run
├── frontend/
│   ├── .env.example                   # public VITE_* template
│   └── src/
│       ├── lib/
│       │   ├── supabase.ts            # Supabase client (PKCE)
│       │   ├── auth.ts                # Google sign-in, profile + onboarding
│       │   ├── api.ts                 # all data access
│       │   ├── stats.ts               # derived metrics (rates, streaks)
│       │   ├── types.ts               # shared types + labels
│       │   └── previewData.ts         # sample data for ?preview=1
│       ├── context/AppContext.tsx     # session + dashboard data provider
│       ├── components/                # Layout, Modal, PageHeader, Progress…
│       └── pages/                     # Landing, SignUp, Auth*, Dashboard, …
└── backend/.env.example               # server-side secret template
```

---

## Data model

Every row is scoped to `user_id` = the Supabase auth user id. `profiles` is keyed by `id` directly.

| Table | Notes |
|---|---|
| `profiles` | Keyed by auth id. `role`, `full_name`, `age`, `country`, `onboarded_at` come from sign-up |
| `journal_entries` | One per user per day (`unique (user_id, entry_date)`) |
| `goals` | `horizon`: `today · tomorrow · day_after · week · month · year · long_term`<br>`bucket`: `future · present · done`<br>`status`: `planned · in_progress · success · failed` |
| `habits` / `habit_logs` | `mark`: `yes` (right) · `no` (wrong) · `skip` |
| `projects` / `project_tasks` | `status`: `todo · doing · done · failed` |
| `project_columns` | User-defined columns; cell values live in `project_tasks.custom` (jsonb, keyed by column id) |
| `challenges` / `challenge_logs` | `result`: `pass · fail`, one row per challenge per day |
| `analysis_entries` | Weekly review: wins, failures, lessons, next actions, score |

### Security

Row-level security is enabled on every table. Each policy targets the `authenticated` role and
compares against `auth.uid()` — a signed-in browser therefore only ever sees its own rows.

---

## Scripts

Run from `frontend/`:

```bash
npm run dev       # dev server on :5199
npm run build     # typecheck + production build
npm run preview   # serve the production build
npm run lint      # oxlint
```

---

## Troubleshooting

| Symptom | Cause & fix |
|---|---|
| `500 That's an error` on Google sign-in | Supabase cannot exchange the code. Usually a wrong **client secret** — re-paste it in Supabase → Providers → Google. Check **Supabase → Logs → Auth**. |
| `redirect_uri_mismatch` from Google | `https://<ref>.supabase.co/auth/v1/callback` is missing from the Google client's Authorized redirect URIs. |
| `new row violates row-level security policy` (403) | Old `to anon` policies. Run `migration-rls-supabase-auth.sql`. |
| Port 5199 already in use | `strictPort: true` — stop the other process instead of letting Vite switch ports, or the OAuth redirect will point elsewhere. |
| Signed in but bounced to `/signup` | The profile has no `onboarded_at`. Finish the role + details step, or run `migration-profile-onboarding.sql`. |

---

## Contributing

1. Fork and create a branch: `git checkout -b feat/your-feature`
2. Keep changes focused and run `npm run build` before committing
3. Open a pull request describing what changed and why

Never commit `.env` files or credentials.

---

<div align="center">
<sub>MIT licensed · Built with React, Supabase and a stubborn belief that honest tracking beats motivation.</sub>
</div>
