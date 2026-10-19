alter table public.sms_campaign_recipients
  drop constraint if exists sms_campaign_recipients_recipient_phone_check;

alter table public.sms_campaign_recipients
  add constraint sms_campaign_recipients_recipient_phone_check
  check (recipient_phone ~ '^\+[1-9][0-9]{7,14}$');

alter table public.sms_campaign_recipients
  add column if not exists consent_reference_snapshot text
  check (consent_reference_snapshot is null or char_length(consent_reference_snapshot) <= 500);
