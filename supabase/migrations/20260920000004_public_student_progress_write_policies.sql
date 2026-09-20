-- ---------------------------------------------------------------------------
-- Public student progress write access for the browser student runtime
-- ---------------------------------------------------------------------------
-- This task intentionally scopes the mutation policy to the Day Progress flow used
-- by the real student UI: local-student startDay/completeDay writes in the public
-- browser client, plus the associated activity events.

alter table public.students enable row level security;
alter table public.student_day_progress enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.activity_events enable row level security;

create policy "public_students_select" on public.students
  for select using (true);

create policy "public_students_insert_local_student" on public.students
  for insert with check (id = 'local-student');

create policy "public_students_update_local_student" on public.students
  for update using (id = 'local-student') with check (id = 'local-student');

create policy "public_student_day_progress_select" on public.student_day_progress
  for select using (student_id = 'local-student');

create policy "public_student_day_progress_insert" on public.student_day_progress
  for insert with check (student_id = 'local-student');

create policy "public_student_day_progress_update" on public.student_day_progress
  for update using (student_id = 'local-student') with check (student_id = 'local-student');

create policy "public_practice_attempts_select" on public.practice_attempts
  for select using (student_id = 'local-student');

create policy "public_practice_attempts_insert" on public.practice_attempts
  for insert with check (student_id = 'local-student');

create policy "public_practice_attempts_update" on public.practice_attempts
  for update using (student_id = 'local-student') with check (student_id = 'local-student');

create policy "public_activity_events_select" on public.activity_events
  for select using (student_id = 'local-student');

create policy "public_activity_events_insert" on public.activity_events
  for insert with check (student_id = 'local-student');
