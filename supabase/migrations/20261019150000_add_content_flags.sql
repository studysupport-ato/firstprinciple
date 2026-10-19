-- Students flag a problem with a lesson step, question, video or playlist; admins work through them.
create table public.content_flags (
  id text primary key default gen_random_uuid()::text,
  target_type text not null,
  target_key text not null,
  course_id text,
  title text not null,
  location text not null,
  link text,
  reason text not null,
  note text,
  user_id text,
  reporter_name text,
  reporter_hash text,
  status text not null default 'open',
  resolution text,
  notify boolean not null default true,
  resolved_at timestamptz,
  student_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_flags_target_type_check check (target_type in ('lesson', 'question', 'video', 'playlist')),
  constraint content_flags_status_check check (status in ('open', 'in_progress', 'fixed', 'dismissed')),
  constraint content_flags_target_key_length check (char_length(target_key) between 1 and 400),
  constraint content_flags_title_length check (char_length(title) between 1 and 300),
  constraint content_flags_location_length check (char_length(location) between 1 and 400),
  constraint content_flags_reason_length check (char_length(reason) between 1 and 80),
  constraint content_flags_note_length check (note is null or char_length(note) <= 1000),
  constraint content_flags_resolution_length check (resolution is null or char_length(resolution) <= 1000)
);

create index content_flags_status_created_idx on public.content_flags (status, created_at desc);
create index content_flags_target_key_idx on public.content_flags (target_key);
create index content_flags_user_idx on public.content_flags (user_id) where user_id is not null;
create index content_flags_reporter_hash_idx on public.content_flags (reporter_hash, created_at desc);

alter table public.content_flags enable row level security;

-- Writes and admin reads go through the server with the service role.
-- A signed-in student may read their own flags and mark a "fixed" notice as seen.
revoke all on public.content_flags from anon, authenticated;
grant select on public.content_flags to authenticated;
grant update (student_seen_at) on public.content_flags to authenticated;
grant all on public.content_flags to service_role;

create policy "content_flags_select_own" on public.content_flags
  for select to authenticated
  using (user_id = auth.uid()::text);

create policy "content_flags_update_own_seen" on public.content_flags
  for update to authenticated
  using (user_id = auth.uid()::text)
  with check (user_id = auth.uid()::text);
