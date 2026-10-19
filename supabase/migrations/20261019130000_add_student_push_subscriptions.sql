-- Student Web Push Subscriptions table
-- Supports multiple devices/browsers per student with strict RLS and least-privilege grants.

create table public.student_push_subscriptions (
  id text primary key default gen_random_uuid()::text,
  student_id text not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  status text not null default 'active',
  failed_attempts integer not null default 0,
  last_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_push_subscriptions_student_id_fkey
    foreign key (student_id) references public.students (id) on delete cascade,
  constraint student_push_subscriptions_status_check
    check (status in ('active', 'revoked', 'expired')),
  constraint student_push_subscriptions_endpoint_not_empty
    check (char_length(btrim(endpoint)) > 0),
  constraint student_push_subscriptions_p256dh_not_empty
    check (char_length(btrim(p256dh)) > 0),
  constraint student_push_subscriptions_auth_not_empty
    check (char_length(btrim(auth)) > 0)
);

-- Unique index on endpoint ensures each device/browser subscription endpoint appears at most once
create unique index student_push_subscriptions_endpoint_key
  on public.student_push_subscriptions (endpoint);

-- Fast lookup of all subscriptions for a given student
create index student_push_subscriptions_student_id_idx
  on public.student_push_subscriptions (student_id);

-- Partial index for active subscription dispatch
create index student_push_subscriptions_active_idx
  on public.student_push_subscriptions (student_id)
  where status = 'active';

alter table public.student_push_subscriptions enable row level security;
alter table public.student_push_subscriptions force row level security;

-- Revoke default public access; grant select to authenticated students, full access to service_role.
-- All registration, update, and revocation writes are strictly channeled through authorized server actions.
revoke all on public.student_push_subscriptions from anon, authenticated;
grant select on public.student_push_subscriptions to authenticated;
grant all on public.student_push_subscriptions to service_role;

-- SELECT policy: authenticated students can only select subscriptions belonging to their mapped student id
create policy "student_push_subscriptions_select_own" on public.student_push_subscriptions
  for select to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_push_subscriptions.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );

-- INSERT policy: authenticated students can only insert subscriptions for their mapped student id
create policy "student_push_subscriptions_insert_own" on public.student_push_subscriptions
  for insert to authenticated
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_push_subscriptions.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );

-- UPDATE policy: authenticated students can only update their own subscriptions, and cannot change student_id to another student
create policy "student_push_subscriptions_update_own" on public.student_push_subscriptions
  for update to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_push_subscriptions.student_id
        and s.auth_user_id = auth.uid()::text
    )
  )
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_push_subscriptions.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );

-- DELETE policy: authenticated students can delete (revoke) their own subscriptions
create policy "student_push_subscriptions_delete_own" on public.student_push_subscriptions
  for delete to authenticated
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_push_subscriptions.student_id
        and s.auth_user_id = auth.uid()::text
    )
  );
