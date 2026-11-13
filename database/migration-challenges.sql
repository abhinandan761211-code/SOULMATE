-- ============================================================
-- SoulMate — add the Challenges feature to an existing database
-- Run this ONCE in Supabase Dashboard > SQL Editor.
--
-- Adds two tables:
--   challenges     — a run of N days (30 / 50 / 90 / custom)
--   challenge_logs — one pass/fail row per challenge per day
--
-- Multiple challenges can run at the same time; nothing here limits
-- how many a user creates.
--
-- Safe to re-run: uses `if not exists` for tables/indexes and drops
-- each policy before recreating it.
-- ============================================================

-- ---------- tables ----------
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

-- ---------- RLS (must target `authenticated`, not `anon`) ----------
alter table public.challenges     enable row level security;
alter table public.challenge_logs enable row level security;

do $$
declare t text;
begin
  foreach t in array array['challenges','challenge_logs']
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

-- ---------- verify ----------
-- Expect 2 rows: challenges + challenge_logs, role {authenticated}.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('challenges', 'challenge_logs')
order by tablename;
