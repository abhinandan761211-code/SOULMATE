-- ============================================================
-- SoulMate — Supabase / PostgreSQL schema
-- Run this in Supabase Dashboard > SQL Editor > New query
-- Auth: managed by Supabase Auth (Google sign-in). The user id used
-- everywhere below is auth.uid(), stored as text. RLS is enforced per
-- user: every row is scoped by user_id (profiles by id).
-- ============================================================

-- ---------- profiles ----------
-- One row per signed-in user (id = auth.uid()).
-- role / full_name / age / country are collected once after sign-up.
create table if not exists public.profiles (
  id           text primary key,               -- auth.uid()
  email        text,
  name         text,
  avatar_url   text,
  timezone     text default 'Asia/Kolkata',
  -- onboarding: who you are and what you use SoulMate for
  role         text default 'personal',        -- student | professional | freelancer | founder | personal
  full_name    text,
  age          int  check (age is null or (age >= 10 and age <= 120)),
  country      text,
  onboarded_at timestamptz,                    -- null until details are saved
  created_at   timestamptz default now()
);

-- Existing databases created before onboarding was added:
-- run database/migration-profile-onboarding.sql instead of re-creating the table.

-- ---------- journal entries (daily life writing) ----------
create table if not exists public.journal_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  entry_date  date not null,
  title       text,
  mood        text,                            -- great | good | okay | low | bad
  content     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique (user_id, entry_date)
);

-- ---------- goals ----------
-- horizon: today | tomorrow | day_after | week | month | year | long_term
-- bucket : future | present | done
-- status : planned | in_progress | success | failed
create table if not exists public.goals (
  id            uuid primary key default gen_random_uuid(),
  user_id       text not null,
  title         text not null,
  description   text,
  horizon       text not null default 'today',
  bucket        text not null default 'present',
  status        text not null default 'planned',
  due_date      date,
  priority      text default 'medium',         -- low | medium | high
  progress      int  default 0 check (progress between 0 and 100),
  result_note   text,
  completed_at  timestamptz,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- ---------- habits / daily check-ins (right/wrong marking) ----------
create table if not exists public.habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  name        text not null,
  icon        text default 'sparkles',
  active      boolean default true,
  created_at  timestamptz default now()
);

-- mark: yes (did it right) | no (missed / wrong) | skip
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    text not null,
  habit_id   uuid references public.habits(id) on delete cascade,
  log_date   date not null,
  mark       text not null default 'yes' check (mark in ('yes', 'no', 'skip')),
  created_at timestamptz default now(),
  unique (habit_id, log_date)
);

-- ---------- projects (work / project tracking) ----------
create table if not exists public.projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  name        text not null,
  description text,
  status      text default 'active',           -- active | success | failed | paused
  started_at  date default current_date,
  ended_at    date,
  created_at  timestamptz default now()
);

-- project task table (table-wise goal entry inside a project)
create table if not exists public.project_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  project_id  uuid references public.projects(id) on delete cascade,
  task        text not null,
  owner       text,
  due_date    date,
  status      text default 'todo',             -- todo | doing | done | failed
  notes       text,
  weight      int default 1,
  sort_order  int default 0,
  -- user-defined column values, keyed by project_columns.id
  -- e.g. {"<column-uuid>": "Write the spec", "<another-uuid>": "Ask the client first"}
  custom      jsonb not null default '{}'::jsonb,
  created_at  timestamptz default now()
);

-- ---------- project columns (user-defined table columns) ----------
-- Lets a project describe what to do AND how to do it, in its own words.
create table if not exists public.project_columns (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  project_id  uuid references public.projects(id) on delete cascade,
  name        text not null,
  type        text not null default 'text',    -- text | longtext | number | date | status
  sort_order  int default 0,
  created_at  timestamptz default now()
);

-- ---------- analysis snapshots over time ----------
create table if not exists public.analysis_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  period_start date not null,                  -- usually week start
  wins         text,
  failures     text,
  lessons      text,
  next_actions text,
  score        int default 0,
  created_at   timestamptz default now()
);

-- ---------- challenges (30 / 50 / 90 day or custom, multiple in parallel) ----------
-- start_date .. end_date defines the run; a daily pass/fail is logged per day.
create table if not exists public.challenges (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  title       text not null,
  description text,
  icon        text default 'flame',
  duration    int  not null check (duration > 0),   -- 30 | 50 | 90 | custom
  start_date  date not null default current_date,
  status      text not null default 'active',       -- active | completed | abandoned
  created_at  timestamptz default now()
);

-- pass = did it today, fail = missed. one row per challenge per day.
create table if not exists public.challenge_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      text not null,
  challenge_id uuid references public.challenges(id) on delete cascade,
  log_date     date not null,
  result       text not null check (result in ('pass', 'fail')),
  note         text,
  created_at   timestamptz default now(),
  unique (challenge_id, log_date)
);

-- ---------- indexes ----------
create index if not exists idx_challenges_user on public.challenges (user_id, status);
create index if not exists idx_challenge_logs_challenge on public.challenge_logs (challenge_id, log_date desc);
create index if not exists idx_journal_user_date on public.journal_entries (user_id, entry_date desc);
create index if not exists idx_goals_user on public.goals (user_id, horizon, status);
create index if not exists idx_habit_logs_user_date on public.habit_logs (user_id, log_date desc);
create index if not exists idx_projects_user on public.projects (user_id);
create index if not exists idx_project_tasks_project on public.project_tasks (project_id, sort_order);
create index if not exists idx_project_columns_project on public.project_columns (project_id, sort_order);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_goals_touch on public.goals;
create trigger trg_goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_journal_touch on public.journal_entries;
create trigger trg_journal_touch before update on public.journal_entries
  for each row execute function public.touch_updated_at();

-- ============================================================
-- RLS: a signed-in browser sends `Authorization: Bearer <user JWT>`,
-- so PostgREST resolves the role to `authenticated` (NOT `anon`).
-- Policies must therefore target `authenticated` and compare against
-- auth.uid(). A policy `to anon` makes every write fail with
-- "new row violates row-level security policy" (HTTP 403).
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.journal_entries  enable row level security;
alter table public.goals            enable row level security;
alter table public.habits           enable row level security;
alter table public.habit_logs       enable row level security;
alter table public.projects         enable row level security;
alter table public.project_tasks    enable row level security;
alter table public.project_columns  enable row level security;
alter table public.analysis_entries enable row level security;
alter table public.challenges       enable row level security;
alter table public.challenge_logs   enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'journal_entries','goals','habits','habit_logs',
    'projects','project_tasks','project_columns','analysis_entries','challenges','challenge_logs'
  ]
  loop
    execute format('drop policy if exists anon_all on public.%I', t);
    execute format('drop policy if exists own_rows on public.%I', t);
    execute format($f$
      create policy own_rows on public.%I
        for all
        to authenticated
        using (user_id = (select auth.uid()::text))
        with check (user_id = (select auth.uid()::text))
    $f$, t);
  end loop;
end $$;

-- profiles is keyed by the user id itself (no user_id column), so it must
-- NOT go through the user_id loop above — that fails with
-- ERROR 42703: column "user_id" does not exist.
drop policy if exists anon_all on public.profiles;
drop policy if exists own_rows on public.profiles;
create policy own_rows on public.profiles
  for all
  to authenticated
  using (id = (select auth.uid()::text))
  with check (id = (select auth.uid()::text));
