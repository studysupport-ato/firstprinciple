create table public.password_recovery_rate_limits (
  bucket_key text not null,
  requested_at timestamptz not null default now()
);

create index password_recovery_rate_limits_bucket_requested_idx
  on public.password_recovery_rate_limits (bucket_key, requested_at desc);

alter table public.password_recovery_rate_limits enable row level security;
alter table public.password_recovery_rate_limits force row level security;

revoke all on public.password_recovery_rate_limits from public, anon, authenticated;

create or replace function public.consume_password_recovery_rate_limit(
  p_email_key text,
  p_ip_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_lock_key text;
  v_email_count integer;
  v_ip_count integer;
  v_now timestamptz := pg_catalog.now();
begin
  if p_email_key !~ '^[a-f0-9]{64}$' or p_ip_key !~ '^[a-f0-9]{64}$' then
    raise exception 'Invalid password recovery rate-limit key.';
  end if;

  for v_lock_key in
    select lock_key
    from pg_catalog.unnest(array['email:' || p_email_key, 'ip:' || p_ip_key]) as keys(lock_key)
    order by lock_key
  loop
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_lock_key, 0));
  end loop;

  delete from public.password_recovery_rate_limits
  where requested_at < v_now - interval '1 day';

  select pg_catalog.count(*)::integer
  into v_email_count
  from public.password_recovery_rate_limits
  where bucket_key = 'email:' || p_email_key
    and requested_at > v_now - interval '15 minutes';

  select pg_catalog.count(*)::integer
  into v_ip_count
  from public.password_recovery_rate_limits
  where bucket_key = 'ip:' || p_ip_key
    and requested_at > v_now - interval '15 minutes';

  if v_email_count >= 3 or v_ip_count >= 10 then
    return false;
  end if;

  insert into public.password_recovery_rate_limits (bucket_key, requested_at)
  values
    ('email:' || p_email_key, v_now),
    ('ip:' || p_ip_key, v_now);

  return true;
end;
$$;

revoke all on function public.consume_password_recovery_rate_limit(text, text)
  from public, anon, authenticated;
grant execute on function public.consume_password_recovery_rate_limit(text, text)
  to service_role;
