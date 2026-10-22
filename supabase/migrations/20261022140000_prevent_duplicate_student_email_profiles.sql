-- Stop a new Auth identity from creating a second student profile for an
-- already-mapped email. Existing accounts must authenticate first and link
-- providers to that same Auth user.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text := nullif(lower(btrim(new.email)), '');
  v_display_name text := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Student'
  );
begin
  if v_normalized_email is not null then
    perform pg_advisory_xact_lock(hashtextextended(v_normalized_email, 0));

    if exists (
      select 1
      from public.students s
      where lower(btrim(s.email)) = v_normalized_email
        and s.auth_user_id is not null
        and s.auth_user_id <> new.id::text
    ) then
      raise exception using
        errcode = 'P0001',
        message = 'A student profile is already linked to this email. Sign in to that account and link the provider.';
    end if;
  end if;

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
end;
$$;
