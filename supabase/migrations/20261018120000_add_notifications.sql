create table public.announcements (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  message text not null,
  sender_id text not null,
  created_at timestamptz not null default now(),
  constraint announcements_title_length_check check (char_length(btrim(title)) between 1 and 120),
  constraint announcements_message_length_check check (char_length(btrim(message)) between 1 and 2000),
  constraint announcements_sender_id_not_empty_check check (char_length(btrim(sender_id)) > 0)
);

create index announcements_created_at_idx on public.announcements (created_at desc);

create table public.student_announcement_reads (
  student_id text not null,
  announcement_id text not null,
  read_at timestamptz not null default now(),
  constraint student_announcement_reads_pkey primary key (student_id, announcement_id),
  constraint student_announcement_reads_student_id_fkey
    foreign key (student_id) references public.students (id) on delete cascade,
  constraint student_announcement_reads_announcement_id_fkey
    foreign key (announcement_id) references public.announcements (id) on delete cascade
);

create index student_announcement_reads_announcement_id_idx
  on public.student_announcement_reads (announcement_id);

alter table public.announcements enable row level security;
alter table public.student_announcement_reads enable row level security;

revoke all on public.announcements from anon, authenticated;
grant select on public.announcements to authenticated;
grant all on public.announcements to service_role;

revoke all on public.student_announcement_reads from anon, authenticated;
grant select, insert, update on public.student_announcement_reads to authenticated;
grant all on public.student_announcement_reads to service_role;

create policy "announcements_select_eligible_students" on public.announcements
  for select to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.auth_user_id = auth.uid()::text
    )
  );

create policy "student_announcement_reads_select_own" on public.student_announcement_reads
  for select to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_announcement_reads.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );

create policy "student_announcement_reads_insert_own" on public.student_announcement_reads
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_announcement_reads.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );

create policy "student_announcement_reads_update_own" on public.student_announcement_reads
  for update to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_announcement_reads.student_id
        and s.auth_user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_announcement_reads.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );
