# SMS campaign setup

## Database and consent

Apply `supabase/migrations/20261018160000_add_sms_campaigns.sql` through the
normal database deployment process before enabling SMS campaigns. It has not
been applied to the hosted database. Then apply
`supabase/migrations/20261018181000_allow_manual_sms_recipients.sql` to allow
international E.164 numbers for manually entered recipients and persist their
consent evidence reference. Consent defaults to `unknown`; only
students with a verifiable recorded `opted_in` preference may be sent a
campaign. The admin recipient picker does not create or record student
consent; students without an existing verified opt-in remain ineligible. A
phone number alone is never treated as consent. No preference records are
seeded and signup/onboarding is unchanged.

The SMS composer can send to manual contacts outside the student database. The
admin must confirm consent for those numbers and enter an auditable evidence
reference; the recipient's number and that reference are stored with the
campaign. Manual numbers accept Ghana local format or explicit international
E.164 format (with `+`). No consent is inferred from entering a number.

This composer only offers educational or operational purposes, not promotions.
Before sending, verify the applicable local rules for educational SMS consent,
student/guardian age requirements, privacy and retention, opt-out wording, and
sender-ID registration. Arkesel account configuration and local telecom rules
determine whether a sender ID is approved; the application cannot verify
registration. Do not record opt-in unless there is actual, auditable evidence.

## Arkesel v2 API

Implementation follows Arkesel's official documentation:

- [SMS v2 send reference](https://developers.arkesel.com/#/sms-v2/send_sms):
  `POST https://sms.arkesel.com/api/v2/sms/send`, JSON request, `api-key`
  header, and `sender`, `recipients`, `message` fields. Recipient arrays use
  international digits without a leading `+`. The returned `status: "success"`
  and per-recipient `data[].recipient` / `data[].id` indicate provider
  acceptance, not delivery.
- [Callback URL](https://developers.arkesel.com/#/section/callback-url) and
  [webhook signature verification](https://developers.arkesel.com/#/webhook-signature-verification):
  signed callbacks carry `sms_id`, `status`, timestamp, signature and unique
  webhook ID headers. The handler validates HMAC-SHA256, constant-time
  comparison, callback ID uniqueness, status, and a five-minute timestamp
  window. A callback received before the send response is reconciled from the
  durable event inbox when the provider reference is saved.

The docs do not specify a sender-ID registration process, max recipients,
throughput/rate limit, request idempotency, or webhook retry guarantees.
Campaign submissions use an application cap of 5,000 recipients and batches
of at most 100 per provider request, no assumption of provider idempotency, and no
automatic retry of uncertain outcomes. Only definite failures can be
explicitly retried; consent and current numbers are rechecked and attempts are
capped. Reconcile uncertain requests in Arkesel before manually creating a new
campaign.

Delivery status names supported by the callback include `DELIVERED`,
`SUBMITTED`, `PROHIBITED`, `QUEUED`, `NOT_DELIVERED`, and `EXPIRED`.
`DELIVERED` is the only callback marked delivered. The campaign UI does not
show price/cost estimates because no verified pricing configuration exists.

## Required server environment

| Variable | Purpose |
| --- | --- |
| `ARKESEL_API_KEY` | Arkesel API credential sent only in the server-side `api-key` header. |
| `ARKESEL_SENDER_ID` | Arkesel-approved sender ID, maximum 11 characters including spaces. |
| `ARKESEL_CALLBACK_URL` | Public HTTPS URL for `/api/webhooks/arkesel/sms`, configured in the Arkesel send request. |
| `ARKESEL_WEBHOOK_SECRET` | Active webhook signing secret generated/retrieved in the Arkesel account. |
| `ARKESEL_WEBHOOK_SECRET_PREVIOUS` | Optional previous signing secret during Arkesel's documented 24-hour rotation overlap. |

Configure the provider callback to reach this deployment's exact public HTTPS
route. The route is not admin-session protected because the provider cannot
present that cookie; authenticity is instead verified using Arkesel's signed
headers. Retrieve or rotate the signing secret using Arkesel's documented
`/api/v2/webhooks/secret` operations and set the resulting secret in the
server environment. Do not expose these values in any `NEXT_PUBLIC_*` variable.
