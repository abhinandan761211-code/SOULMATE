-- ============================================================
-- SoulMate — profile role + personal details (onboarding)
-- Run this ONCE in Supabase Dashboard > SQL Editor.
--
-- WHY: sign-up now asks two things after Google sign-in:
--   1. role  — what you use SoulMate for
--   2. personal details — full name, age, country
--
-- Adds columns to public.profiles. `onboarded_at` stays NULL until
-- the user finishes that step, which is what the app checks before
-- letting them into the workspace.
--
-- Safe to re-run: every column uses `add column if not exists`.
-- ============================================================

alter table public.profiles
  add column if not exists role         text default 'personal',
  add column if not exists full_name    text,
  add column if not exists age          int,
  add column if not exists country      text,
  add column if not exists onboarded_at timestamptz;

-- keep age sane (added separately so a re-run does not try to duplicate it)
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_age_check'
  ) then
    alter table public.profiles
      add constraint profiles_age_check check (age is null or (age >= 10 and age <= 120));
  end if;
end $$;

-- role must be one of the options the UI offers
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_role_check'
  ) then
    alter table public.profiles
      add constraint profiles_role_check
      check (role is null or role in ('student', 'professional', 'freelancer', 'founder', 'personal'));
  end if;
end $$;

-- Existing users already using the app should not be pushed through
-- onboarding — mark them done so only new sign-ups see the form.
update public.profiles
set onboarded_at = coalesce(onboarded_at, created_at, now())
where onboarded_at is null;

-- ---------- verify ----------
select id, email, role, full_name, age, country, onboarded_at
from public.profiles
order by created_at desc
limit 10;
