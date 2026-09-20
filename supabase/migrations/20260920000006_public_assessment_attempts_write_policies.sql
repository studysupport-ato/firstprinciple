-- ---------------------------------------------------------------------------
-- Public browser assessment-attempt writes for the student runtime
-- ---------------------------------------------------------------------------

alter table public.assessment_attempts enable row level security;

create policy "public_assessment_attempts_select"
  on public.assessment_attempts
  for select using (student_id = 'local-student');

create policy "public_assessment_attempts_insert"
  on public.assessment_attempts
  for insert with check (student_id = 'local-student');

create policy "public_assessment_attempts_update"
  on public.assessment_attempts
  for update using (student_id = 'local-student') with check (student_id = 'local-student');
