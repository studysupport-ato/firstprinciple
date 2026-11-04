-- Phones that asked to be told when a course rep uploads for their programme and year.
-- Written only by server actions (service role); browsers have no access.
create table if not exists public.materials_push_subscriptions (
  endpoint text primary key check (char_length(btrim(endpoint)) > 0),
  p256dh text not null,
  auth text not null,
  department_id text not null,
  study_year integer not null check (study_year between 1 and 6),
  user_id uuid,
  failed_attempts integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists materials_push_subscriptions_scope_idx on public.materials_push_subscriptions (department_id, study_year);
alter table public.materials_push_subscriptions enable row level security;
alter table public.materials_push_subscriptions force row level security;
revoke all on public.materials_push_subscriptions from anon, authenticated;
grant all on public.materials_push_subscriptions to service_role;
