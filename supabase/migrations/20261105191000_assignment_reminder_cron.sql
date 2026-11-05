-- Every 5 minutes, ask the site to send due assignment reminders.
-- The bearer token lives in Supabase Vault (name: assignment_reminder_secret)
-- and in Vercel as ASSIGNMENT_REMINDER_SECRET. It is not stored in this repo:
--   select vault.create_secret('<secret>', 'assignment_reminder_secret');
create extension if not exists pg_cron;
create extension if not exists pg_net;
select cron.schedule(
  'assignment-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://www.b2bwithkwamina.com/api/assignment-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'assignment_reminder_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
