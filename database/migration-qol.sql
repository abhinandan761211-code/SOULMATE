-- ============================================================
-- SoulMate — Quality-of-life migration
-- Adds: recurring goals, journal photos, storage bucket + policies.
-- Safe to re-run. Run once in Supabase Dashboard > SQL Editor.
-- ============================================================

-- ---------- recurring goals ----------
-- repeat  : daily | weekdays | weekly | monthly  (null = one-off goal)
-- series_id: shared by every copy generated from the same recurring goal
alter table public.goals add column if not exists repeat    text;
alter table public.goals add column if not exists series_id text;

create index if not exists idx_goals_series on public.goals (series_id);

-- guard the allowed values without breaking existing rows
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'goals_repeat_check'
  ) then
    alter table public.goals
      add constraint goals_repeat_check
      check (repeat is null or repeat in ('daily', 'weekdays', 'weekly', 'monthly'));
  end if;
end $$;

-- ---------- journal photos ----------
-- public URLs of photos attached to an entry (files live in Storage)
alter table public.journal_entries add column if not exists photos text[] default '{}';

-- ---------- storage bucket for journal photos ----------
-- Public read URLs keep the app simple; writes are scoped to the owner's
-- folder: <user_id>/<uuid>.jpg — enforced by the policies below.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'journal-photos',
  'journal-photos',
  true,
  8388608, -- 8 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists journal_photos_read on storage.objects;
create policy journal_photos_read on storage.objects
  for select
  to authenticated
  using (bucket_id = 'journal-photos');

drop policy if exists journal_photos_insert on storage.objects;
create policy journal_photos_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists journal_photos_update on storage.objects;
create policy journal_photos_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists journal_photos_delete on storage.objects;
create policy journal_photos_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'journal-photos'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );
