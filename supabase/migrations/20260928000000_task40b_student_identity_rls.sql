-- Task 40B — Real student identity + auth.uid() ownership RLS (part 1).
-- auth_user_id stays TEXT (see final report for rationale); comparisons use auth.uid()::text.
alter table public.students enable row level security;
drop index if exists public.students_auth_user_id_key;
create unique index if not exists students_auth_user_id_key on public.students (auth_user_id);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_auth_text text := new.id::text;
  v_student_id text := 'student-' || replace(substring(new.id::text, 1, 12), '-', '');
begin
  insert into public.students (id, auth_user_id, display_name, email)
  values (
    v_student_id,
    v_auth_text,
    coalesce(nullif(split_part(coalesce(new.email, ''), '@', 1), ''), 'Student'),
    new.email
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    updated_at = now()
  where public.students.email is distinct from excluded.email;
  return new;
exception when unique_violation then
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_student on auth.users;
create trigger on_auth_user_created_student
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

drop policy if exists "public_students_select" on public.students;
drop policy if exists "public_students_insert_local_student" on public.students;
drop policy if exists "public_students_update_local_student" on public.students;
drop policy if exists "students_select_own" on public.students;
drop policy if exists "students_insert_own" on public.students;
drop policy if exists "students_update_own" on public.students;

create policy "students_select_own" on public.students
  for select to authenticated
  using (auth.uid()::text = auth_user_id);

create policy "students_update_own" on public.students
  for update to authenticated
  using (auth.uid()::text = auth_user_id)
  with check (auth.uid()::text = auth_user_id);
