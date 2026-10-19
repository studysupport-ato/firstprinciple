create table public.email_campaigns (
  id uuid primary key default gen_random_uuid(),
  idempotency_key uuid not null unique,
  sender_id text not null,
  subject text not null check (char_length(subject) between 1 and 160),
  message text not null check (char_length(message) between 1 and 10000),
  status text not null default 'queued'
    check (status in ('queued', 'sending', 'provider_accepted', 'partial', 'failed', 'uncertain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.email_campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.email_campaigns (id) on delete cascade,
  student_id text references public.students (id) on delete set null,
  recipient_name text,
  recipient_email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'submitting', 'provider_accepted', 'failed', 'uncertain')),
  provider_message_id text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_campaign_recipients_campaign_student_key unique (campaign_id, student_id)
);

create index email_campaigns_created_at_idx
  on public.email_campaigns (created_at desc, id desc);
create index email_campaign_recipients_campaign_status_idx
  on public.email_campaign_recipients (campaign_id, status);
create unique index email_campaign_recipients_provider_message_key
  on public.email_campaign_recipients (provider_message_id)
  where provider_message_id is not null;

create trigger email_campaigns_set_updated_at
  before update on public.email_campaigns
  for each row execute function public.set_updated_at();
create trigger email_campaign_recipients_set_updated_at
  before update on public.email_campaign_recipients
  for each row execute function public.set_updated_at();

alter table public.email_campaigns enable row level security;
alter table public.email_campaign_recipients enable row level security;

revoke all on public.email_campaigns from public, anon, authenticated;
revoke all on public.email_campaign_recipients from public, anon, authenticated;
grant all on public.email_campaigns to service_role;
grant all on public.email_campaign_recipients to service_role;
