create table public.student_sms_preferences (
  student_id text primary key references public.students (id) on delete cascade,
  status text not null default 'unknown'
    check (status in ('unknown', 'opted_in', 'opted_out')),
  consent_source text
    check (consent_source is null or consent_source in ('student_form', 'written_request', 'verbal_record', 'imported')),
  consent_reference text check (consent_reference is null or char_length(consent_reference) <= 500),
  consent_recorded_at timestamptz,
  consent_recorded_by text,
  opted_out_at timestamptz,
  opted_out_reference text check (opted_out_reference is null or char_length(opted_out_reference) <= 500),
  updated_at timestamptz not null default now(),
  constraint student_sms_preferences_opt_in_evidence_check check (
    status <> 'opted_in'
    or (consent_source is not null and consent_recorded_at is not null and consent_recorded_by is not null)
  ),
  constraint student_sms_preferences_opt_out_timestamp_check check (
    status <> 'opted_out' or opted_out_at is not null
  )
);

create table public.sms_campaigns (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  sender_id text not null,
  sender_name text not null,
  purpose text not null check (purpose in ('educational', 'operational')),
  message text not null check (char_length(message) between 1 and 1000),
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'provider_accepted', 'partial', 'failed', 'uncertain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sms_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.sms_campaigns (id) on delete cascade,
  student_id text references public.students (id) on delete set null,
  recipient_name text,
  recipient_phone text not null check (recipient_phone ~ '^\+233[25][0-9]{8}$'),
  status text not null default 'queued'
    check (status in ('queued', 'submitting', 'provider_accepted', 'delivered', 'failed', 'uncertain', 'suppressed')),
  provider_reference text,
  provider_status text
    check (provider_status is null or provider_status in ('DELIVERED', 'SUBMITTED', 'PROHIBITED', 'QUEUED', 'NOT_DELIVERED', 'EXPIRED')),
  attempt_count integer not null default 0 check (attempt_count between 0 and 5),
  consent_status_snapshot text not null check (consent_status_snapshot = 'opted_in'),
  consent_source_snapshot text not null,
  consent_recorded_at_snapshot timestamptz not null,
  error_message text check (error_message is null or char_length(error_message) <= 500),
  delivery_updated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sms_campaign_recipients_campaign_student_key unique (campaign_id, student_id),
  constraint sms_campaign_recipients_campaign_phone_key unique (campaign_id, recipient_phone)
);

create index student_sms_preferences_status_idx
  on public.student_sms_preferences (status, updated_at desc);
create index sms_campaigns_created_at_idx
  on public.sms_campaigns (created_at desc, id desc);
create index sms_campaign_recipients_campaign_status_idx
  on public.sms_campaign_recipients (campaign_id, status);
create unique index sms_campaign_recipients_provider_reference_key
  on public.sms_campaign_recipients (provider_reference)
  where provider_reference is not null;

create table public.sms_delivery_events (
  id uuid primary key default gen_random_uuid(),
  callback_id text not null unique,
  recipient_id uuid references public.sms_campaign_recipients (id) on delete set null,
  provider_reference text not null,
  provider_status text not null
    check (provider_status in ('DELIVERED', 'SUBMITTED', 'PROHIBITED', 'QUEUED', 'NOT_DELIVERED', 'EXPIRED')),
  provider_timestamp timestamptz not null,
  received_at timestamptz not null default now()
);
create index sms_delivery_events_recipient_received_idx
  on public.sms_delivery_events (recipient_id, received_at desc);
create index sms_delivery_events_provider_reference_idx
  on public.sms_delivery_events (provider_reference, received_at desc);

create trigger student_sms_preferences_set_updated_at
  before update on public.student_sms_preferences
  for each row execute function public.set_updated_at();
create trigger sms_campaigns_set_updated_at
  before update on public.sms_campaigns
  for each row execute function public.set_updated_at();
create trigger sms_campaign_recipients_set_updated_at
  before update on public.sms_campaign_recipients
  for each row execute function public.set_updated_at();

alter table public.student_sms_preferences enable row level security;
alter table public.sms_campaigns enable row level security;
alter table public.sms_campaign_recipients enable row level security;
alter table public.sms_delivery_events enable row level security;

revoke all on public.student_sms_preferences from public, anon, authenticated;
revoke all on public.sms_campaigns from public, anon, authenticated;
revoke all on public.sms_campaign_recipients from public, anon, authenticated;
revoke all on public.sms_delivery_events from public, anon, authenticated;
grant all on public.student_sms_preferences to service_role;
grant all on public.sms_campaigns to service_role;
grant all on public.sms_campaign_recipients to service_role;
grant all on public.sms_delivery_events to service_role;
