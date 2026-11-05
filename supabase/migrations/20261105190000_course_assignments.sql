-- Assignments posted by course reps, students' own done marks, and phone reminders.
-- Browsers have no direct access: everything goes through server actions with the service role.

create table if not exists public.course_assignments (
  id uuid primary key default gen_random_uuid(),
  department_id text not null,
  study_year int not null check (study_year between 1 and 6),
  course_id text not null,
  course_title text not null,
  body text not null default '',
  file_id text,
  file_kind text check (file_kind in ('image', 'pdf')),
  file_name text,
  urgent boolean not null default false,
  posted_by text,
  rep_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_assignments_scope_idx on public.course_assignments (department_id, study_year, created_at desc);
alter table public.course_assignments enable row level security;

-- owner is "u:<user id>" when signed in, otherwise "d:<random device id>".
create table if not exists public.assignment_progress (
  owner text not null,
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  done boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (owner, assignment_id)
);
alter table public.assignment_progress enable row level security;

create table if not exists public.assignment_reminders (
  id uuid primary key default gen_random_uuid(),
  owner text not null,
  assignment_id uuid not null references public.course_assignments(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  every_minutes int not null check (every_minutes between 15 and 10080),
  next_at timestamptz not null,
  ends_at timestamptz not null,
  failed_attempts int not null default 0,
  created_at timestamptz not null default now(),
  unique (owner, assignment_id)
);
create index if not exists assignment_reminders_due_idx on public.assignment_reminders (next_at);
alter table public.assignment_reminders enable row level security;
