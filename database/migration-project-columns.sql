-- ============================================================
-- SoulMate — custom columns for project rows
-- Run this ONCE in Supabase Dashboard > SQL Editor.
--
-- Adds:
--   project_columns     — user-defined columns for a project
--                         (e.g. "What to do", "How to do it")
--   project_tasks.custom — jsonb bag holding each row's cell values,
--                          keyed by project_columns.id
--
-- Existing tasks keep working: `custom` defaults to '{}'.
-- Safe to re-run.
-- ============================================================

-- ---------- 1. column values on every existing task row ----------
alter table public.project_tasks
  add column if not exists custom jsonb not null default '{}'::jsonb;

-- ---------- 2. the user-defined columns table ----------
create table if not exists public.project_columns (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,
  project_id  uuid references public.projects(id) on delete cascade,
  name        text not null,
  type        text not null default 'text',    -- text | longtext | number | date | status
  sort_order  int default 0,
  created_at  timestamptz default now()
);

create index if not exists idx_project_columns_project on public.project_columns (project_id, sort_order);

-- ---------- 3. seed the two columns you asked for ----------
-- For every project that has no custom columns yet, create
-- "What to do" and "How to do it" once, then copy the old `notes`
-- into "How to do it" so nothing looks empty after the upgrade.
insert into public.project_columns (user_id, project_id, name, type, sort_order)
select p.user_id,
       p.id,
       c.name,
       c.type,
       c.sort_order
from public.projects p
cross join (values
  ('What to do',   'longtext', 0),
  ('How to do it', 'longtext', 1)
) as c(name, type, sort_order)
where not exists (
  select 1 from public.project_columns pc where pc.project_id = p.id
);

-- copy existing notes into the "How to do it" cell
update public.project_tasks t
set custom = jsonb_build_object(pc.id::text, t.notes)
from public.project_columns pc
where pc.project_id = t.project_id
  and pc.name = 'How to do it'
  and t.notes is not null
  and t.custom = '{}'::jsonb;

-- ---------- 4. RLS ----------
alter table public.project_columns enable row level security;

drop policy if exists anon_all on public.project_columns;
drop policy if exists own_rows on public.project_columns;
create policy own_rows on public.project_columns
  for all
  to authenticated
  using (user_id = (select auth.uid()::text))
  with check (user_id = (select auth.uid()::text));

-- ---------- 5. verify ----------
select tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public' and tablename = 'project_columns';

select p.name as project, pc.name as column_name, pc.type
from public.project_columns pc
join public.projects p on p.id = pc.project_id
order by p.name, pc.sort_order;
