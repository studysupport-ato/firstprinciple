-- ---------------------------------------------------------------------------
-- Public browser practice-attempt writes for local-student runtime
-- ---------------------------------------------------------------------------

alter table public.practice_attempts enable row level security;

create policy "public_practice_attempts_select"
  on public.practice_attempts
  for select using (student_id = 'local-student');

create policy "public_practice_attempts_insert"
  on public.practice_attempts
  for insert with check (student_id = 'local-student');

create policy "public_practice_attempts_update"
  on public.practice_attempts
  for update using (student_id = 'local-student') with check (student_id = 'local-student');
