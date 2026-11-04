-- Course reps: uploads to the Back2Basics Google Drive, and hiding imported files.

-- Files inside a linked Drive folder that students should not see (Drive file ids).
alter table public.course_materials add column if not exists hidden_files text[] not null default '{}';
-- For a course: the folder the site created in the Back2Basics Drive for uploads.
alter table public.course_materials add column if not exists drive_folder_id text;

-- The one connected Google Drive (kept server-side only; no browser access at all).
create table if not exists public.drive_connection (
  id smallint primary key default 1 check (id = 1),
  account_email text,
  refresh_token text not null,
  root_folder_id text,
  connected_at timestamptz not null default now()
);
alter table public.drive_connection enable row level security;
revoke all on public.drive_connection from anon, authenticated;
