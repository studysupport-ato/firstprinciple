-- Push delivery outbox: durable job queue for announcement push dispatch.
--
-- Design decisions:
--   - Each row represents one broadcast delivery job for one announcement.
--   - Announcement + job are inserted atomically inside create_announcement_with_push_job().
--   - Workers claim jobs by flipping status pending→processing with a lease_expires_at timestamp;
--     unclaimed/crashed leases are recovered by subsequent worker runs.
--   - Delivery to individual subscriptions is not tracked per-subscription here; outcomes are
--     reflected back to student_push_subscriptions (status, failed_attempts, last_notified_at).
--   - No push endpoint URLs or cryptographic subscription keys are stored in this table.
--   - RLS: no authenticated client access; all operations go through service_role.

create table public.push_delivery_jobs (
  id text primary key default gen_random_uuid()::text,
  announcement_id text not null,
  status text not null default 'pending',
  -- Delivery statistics updated during/after processing (no secrets stored here)
  attempted_count integer not null default 0,
  succeeded_count integer not null default 0,
  failed_count integer not null default 0,
  expired_count integer not null default 0,
  -- Worker lease: claimed_at + lease_expires_at enable crash recovery
  claimed_at timestamptz,
  lease_expires_at timestamptz,
  -- Retry / backoff
  attempt_number integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_delivery_jobs_announcement_id_fkey
    foreign key (announcement_id) references public.announcements (id) on delete cascade,
  constraint push_delivery_jobs_status_check
    check (status in ('pending', 'processing', 'completed', 'failed')),
  constraint push_delivery_jobs_attempt_number_positive
    check (attempt_number >= 0),
  constraint push_delivery_jobs_counts_non_negative
    check (
      attempted_count >= 0
      and succeeded_count >= 0
      and failed_count >= 0
      and expired_count >= 0
    )
);

-- Index for worker polling: find claimable jobs quickly.
create index push_delivery_jobs_pending_idx
  on public.push_delivery_jobs (next_attempt_at)
  where status = 'pending';

-- Index for lease expiry recovery: find stale processing rows.
create index push_delivery_jobs_lease_recovery_idx
  on public.push_delivery_jobs (lease_expires_at)
  where status = 'processing';

-- Index for looking up by announcement (admin view / idempotency).
create index push_delivery_jobs_announcement_id_idx
  on public.push_delivery_jobs (announcement_id);

-- Unique: at most one delivery job per announcement (idempotent re-enqueue guard).
create unique index push_delivery_jobs_announcement_unique
  on public.push_delivery_jobs (announcement_id);

alter table public.push_delivery_jobs enable row level security;
alter table public.push_delivery_jobs force row level security;

-- No client access at all — only service_role may read or write delivery jobs.
revoke all on public.push_delivery_jobs from anon, authenticated;
grant all on public.push_delivery_jobs to service_role;

-- ============================================================================
-- Atomic RPC: create_announcement_with_push_job
-- Inserts the announcement and its push delivery job in one transaction.
-- Caller must be service_role (enforced by the SECURITY DEFINER + search_path).
-- Returns the newly inserted announcement row.
-- ============================================================================
create or replace function public.create_announcement_with_push_job(
  p_title text,
  p_message text,
  p_sender_id text,
  p_enqueue_push boolean default true
)
returns table (
  id text,
  title text,
  message text,
  sender_id text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_announcement_id text;
  v_now timestamptz := now();
begin
  -- Insert the announcement
  insert into public.announcements (title, message, sender_id, created_at)
  values (btrim(p_title), btrim(p_message), p_sender_id, v_now)
  returning public.announcements.id into v_announcement_id;

  -- Conditionally enqueue the push delivery job (skip if push is not configured)
  if p_enqueue_push then
    insert into public.push_delivery_jobs (
      announcement_id,
      status,
      next_attempt_at,
      created_at,
      updated_at
    )
    values (
      v_announcement_id,
      'pending',
      v_now,
      v_now,
      v_now
    )
    on conflict (announcement_id) do nothing;
  end if;

  -- Return the announcement row
  return query
    select
      a.id,
      a.title,
      a.message,
      a.sender_id,
      a.created_at
    from public.announcements a
    where a.id = v_announcement_id;
end;
$$;

-- Only service_role can execute this function; revoke from public/authenticated.
revoke all on function public.create_announcement_with_push_job(text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.create_announcement_with_push_job(text, text, text, boolean) to service_role;

-- ============================================================================
-- Helper RPC: increment_push_failed_attempts
-- Atomically increments failed_attempts on a student_push_subscriptions row.
-- Called by the push dispatch worker; never called by authenticated clients.
-- ============================================================================
create or replace function public.increment_push_failed_attempts(p_subscription_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.student_push_subscriptions
  set
    failed_attempts = failed_attempts + 1,
    updated_at = now()
  where id = p_subscription_id;
end;
$$;

revoke all on function public.increment_push_failed_attempts(text) from public, anon, authenticated;
grant execute on function public.increment_push_failed_attempts(text) to service_role;
