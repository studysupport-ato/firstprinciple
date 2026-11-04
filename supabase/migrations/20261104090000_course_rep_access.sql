-- Course rep access
--
-- Anyone signed in can apply to be the course rep for one programme and year.
-- An admin approves or declines. An approved rep can add, edit and remove
-- course materials for that programme and year only, through server actions
-- that check the approval on every write (lib/courseReps/repService.ts).
--
-- Browsers never write these tables directly: there are no insert, update or
-- delete policies for anon or authenticated users, so the only way in is the
-- server, which uses the service role after checking the rep's approval.

create table if not exists public.course_rep_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 120),
  department_id text not null references public.departments (id) on delete restrict,
  study_year smallint not null check (study_year between 1 and 4),
  phone text not null check (phone ~ '^\+[1-9][0-9]{7,14}$'),
  email text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists course_rep_applications_status_idx on public.course_rep_applications (status, created_at desc);
create index if not exists course_rep_applications_scope_idx on public.course_rep_applications (department_id, study_year) where status = 'approved';

alter table public.course_rep_applications enable row level security;

-- A student can read their own application (to see "pending" / "approved").
drop policy if exists course_rep_applications_select_own on public.course_rep_applications;
create policy course_rep_applications_select_own on public.course_rep_applications
  for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.course_rep_applications from anon, authenticated;

-- Who added a material (null = added by Back2Basics).
alter table public.course_materials add column if not exists created_by_rep uuid references public.course_rep_applications (id) on delete set null;
create index if not exists course_materials_created_by_rep_idx on public.course_materials (created_by_rep) where created_by_rep is not null;
