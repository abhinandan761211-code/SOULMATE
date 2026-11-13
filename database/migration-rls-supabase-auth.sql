-- ============================================================
-- SoulMate — RLS migration: Firebase-era policies -> Supabase Auth
-- Run this ONCE in Supabase Dashboard > SQL Editor.
--
-- WHY: the original schema created `anon_all` policies `to anon`,
-- because auth lived in Firebase and the browser sent only the
-- publishable (anon) key. With Supabase Auth the browser sends
-- `Authorization: Bearer <user JWT>`, so PostgREST sets the role to
-- `authenticated` — which matched no policy, so every INSERT/UPDATE
-- failed the `with check` and returned 403:
--   "new row violates row-level security policy for table profiles"
--
-- This is safe to re-run: every policy is dropped before it is
-- recreated, and no table data is touched.
-- ============================================================

-- ---------- 1. profiles ----------
-- The primary key IS the user id, so scope on it directly.
drop policy if exists anon_all  on public.profiles;
drop policy if exists own_rows  on public.profiles;

create policy own_rows on public.profiles
  for all
  to authenticated
  using (id = (select auth.uid()::text))
  with check (id = (select auth.uid()::text));

-- ---------- 2. every other table, scoped by user_id ----------
-- NOTE: profiles is deliberately absent — it is keyed by `id` and has no
-- user_id column, so including it here fails with
--   42703: column "user_id" does not exist
do $$
declare t text;
begin
  foreach t in array array[
    'journal_entries','goals','habits','habit_logs',
    'projects','project_tasks','project_columns','analysis_entries',
    'challenges','challenge_logs'
  ]
  loop
    -- skip tables that do not exist yet in this project
    if to_regclass(format('public.%I', t)) is null then
      continue;
    end if;
    execute format('alter table public.%I enable row level security', t);
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

-- ---------- 3. verify ----------
-- Expect one `own_rows` per table, role = {authenticated}.
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
order by tablename;
