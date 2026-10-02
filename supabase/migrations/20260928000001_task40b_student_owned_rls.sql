-- Task 40B part 2 — student-owned table RLS via students bridge.
-- Drops legacy local-student policies (incl. duplicate names), then creates
-- ownership policies using one EXISTS against the indexed students bridge.
alter table public.student_day_progress enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.assessment_attempts enable row level security;
alter table public.activity_events enable row level security;

drop policy if exists "public_student_day_progress_select" on public.student_day_progress;
drop policy if exists "public_student_day_progress_insert" on public.student_day_progress;
drop policy if exists "public_student_day_progress_update" on public.student_day_progress;
drop policy if exists "student_day_progress_select_own" on public.student_day_progress;
drop policy if exists "student_day_progress_insert_own" on public.student_day_progress;
drop policy if exists "student_day_progress_update_own" on public.student_day_progress;
drop policy if exists "public_practice_attempts_select" on public.practice_attempts;
drop policy if exists "public_practice_attempts_insert" on public.practice_attempts;
drop policy if exists "public_practice_attempts_update" on public.practice_attempts;
drop policy if exists "practice_attempts_select_own" on public.practice_attempts;
drop policy if exists "practice_attempts_insert_own" on public.practice_attempts;
drop policy if exists "practice_attempts_update_own" on public.practice_attempts;
drop policy if exists "public_assessment_attempts_select" on public.assessment_attempts;
drop policy if exists "public_assessment_attempts_insert" on public.assessment_attempts;
drop policy if exists "public_assessment_attempts_update" on public.assessment_attempts;
drop policy if exists "assessment_attempts_select_own" on public.assessment_attempts;
drop policy if exists "assessment_attempts_insert_own" on public.assessment_attempts;
drop policy if exists "assessment_attempts_update_own" on public.assessment_attempts;
drop policy if exists "public_activity_events_select" on public.activity_events;
drop policy if exists "public_activity_events_insert" on public.activity_events;
drop policy if exists "activity_events_select_own" on public.activity_events;
drop policy if exists "activity_events_insert_own" on public.activity_events;

create policy "student_day_progress_select_own" on public.student_day_progress
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = student_day_progress.student_id and s.auth_user_id = auth.uid()::text));
create policy "student_day_progress_insert_own" on public.student_day_progress
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = student_day_progress.student_id and s.auth_user_id = auth.uid()::text));
create policy "student_day_progress_update_own" on public.student_day_progress
  for update to authenticated
  using (exists (select 1 from public.students s where s.id = student_day_progress.student_id and s.auth_user_id = auth.uid()::text))
  with check (exists (select 1 from public.students s where s.id = student_day_progress.student_id and s.auth_user_id = auth.uid()::text));

create policy "practice_attempts_select_own" on public.practice_attempts
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = practice_attempts.student_id and s.auth_user_id = auth.uid()::text));
create policy "practice_attempts_insert_own" on public.practice_attempts
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = practice_attempts.student_id and s.auth_user_id = auth.uid()::text));
create policy "practice_attempts_update_own" on public.practice_attempts
  for update to authenticated
  using (exists (select 1 from public.students s where s.id = practice_attempts.student_id and s.auth_user_id = auth.uid()::text))
  with check (exists (select 1 from public.students s where s.id = practice_attempts.student_id and s.auth_user_id = auth.uid()::text));

create policy "assessment_attempts_select_own" on public.assessment_attempts
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = assessment_attempts.student_id and s.auth_user_id = auth.uid()::text));
create policy "assessment_attempts_insert_own" on public.assessment_attempts
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = assessment_attempts.student_id and s.auth_user_id = auth.uid()::text));
create policy "assessment_attempts_update_own" on public.assessment_attempts
  for update to authenticated
  using (exists (select 1 from public.students s where s.id = assessment_attempts.student_id and s.auth_user_id = auth.uid()::text))
  with check (exists (select 1 from public.students s where s.id = assessment_attempts.student_id and s.auth_user_id = auth.uid()::text));

create policy "activity_events_select_own" on public.activity_events
  for select to authenticated
  using (exists (select 1 from public.students s where s.id = activity_events.student_id and s.auth_user_id = auth.uid()::text));
create policy "activity_events_insert_own" on public.activity_events
  for insert to authenticated
  with check (exists (select 1 from public.students s where s.id = activity_events.student_id and s.auth_user_id = auth.uid()::text));
