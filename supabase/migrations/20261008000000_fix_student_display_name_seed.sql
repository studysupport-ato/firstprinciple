-- Fix the student display_name seed so it is not overwritten by the email prefix.
-- This migration repairs the current database state and makes future auth-user rows
-- preserve the real full name captured during signup or settings edits.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Student'
  );
begin
  insert into public.students (id, auth_user_id, display_name, email)
  values (
    'student-' || replace(substring(new.id::text, 1, 12), '-', ''),
    new.id::text,
    v_display_name,
    new.email
  )
  on conflict (auth_user_id) do update set
    email = excluded.email,
    display_name = case
      when public.students.display_name is null
        or trim(public.students.display_name) = ''
        or public.students.display_name = split_part(coalesce(public.students.email, ''), '@', 1)
      then excluded.display_name
      else public.students.display_name
    end,
    updated_at = now()
  where public.students.email is distinct from excluded.email
     or public.students.display_name is distinct from excluded.display_name;

  return new;
exception when unique_violation then
  return new;
end;
$$;

with preferred_display_names as (
  select
    s.id,
    coalesce(
      nullif(trim(au.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(au.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(coalesce(s.email, ''), '@', 1), ''),
      s.display_name,
      'Student'
    ) as preferred_name
  from public.students s
  left join auth.users au on au.id::text = s.auth_user_id
)
update public.students s
set display_name = p.preferred_name,
    updated_at = now()
from preferred_display_names p
where s.id = p.id
  and (
    s.display_name is null
    or trim(s.display_name) = ''
    or s.display_name = split_part(coalesce(s.email, ''), '@', 1)
  );
