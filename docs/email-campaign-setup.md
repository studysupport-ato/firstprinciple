# Email campaign setup

The Email admin page stores campaigns and recipient outcomes in the
`email_campaigns` and `email_campaign_recipients` tables. Apply
`supabase/migrations/20261018150000_add_email_campaigns.sql` through the normal
database deployment process before enabling this page. This migration has not
been applied to the hosted database as part of this change.

Configure these values only in the server environment:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Resend API credential. Never expose it through a `NEXT_PUBLIC_*` variable. |
| `RESEND_FROM_EMAIL` | Sender email address verified with Resend; no sender address is assumed by the application. |
| `RESEND_FROM_NAME` | Optional sender display name. Defaults to First Principles · Math 151. |
| `FIRST_PRINCIPLES_EMAIL_LOGO_URL` | Absolute public HTTPS URL to the website's actual `public/brand-logo.png` asset, for example `https://<production-host>/brand-logo.png`. |
| `FIRST_PRINCIPLES_PLATFORM_URL` | Optional public HTTPS platform URL included in the email footer. |

The project did not have a configured production host, public logo URL,
verified sender, or Resend credential during implementation. The admin preview
uses the branded text fallback until the HTTPS logo URL is configured. Verify
that the configured image is publicly reachable by email clients; a local
relative asset path is deliberately rejected.

Each recipient is submitted to Resend as a separate email, not a shared To/CC
message. The campaign and recipient records are persisted before submissions.
The app records `provider_accepted`, `failed`, or `uncertain`; provider
acceptance is not delivery confirmation. No delivery webhook is implemented,
so delivered/bounced outcomes are not represented. The database idempotency
key prevents a retried action from submitting the same campaign again; Resend
provider-side idempotency is not assumed. Review uncertain submissions in
campaign history and the Resend dashboard before taking any manual action.

Campaign tables have RLS enabled and no browser-role policies or grants.
Privileged campaign operations run only after `requireAdmin()` and use the
server-side service-role client.
