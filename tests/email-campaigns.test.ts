import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  escapeEmailHtml,
  messageToEmailHtml,
  normalizePublicHttpsUrl,
  renderBrandedEmail,
} from "../lib/emailCampaigns/template";
import {
  EMAIL_MESSAGE_MAX_LENGTH,
  EMAIL_CAMPAIGN_MAX_RECIPIENTS,
  EMAIL_CAMPAIGN_MAX_MANUAL_RECIPIENTS,
  EMAIL_SUBJECT_MAX_LENGTH,
  normalizeManualEmailRecipients,
  normalizeRecipientIds,
  validateEmailCampaignContent,
} from "../lib/emailCampaigns/validation";
import { mergeManualEmailRecipients, resolveCampaignRecipients } from "../lib/emailCampaigns/recipients";
import { canRetryFailedRecipient, deriveCampaignStatus } from "../lib/emailCampaigns/status";
import { isEmailAdminAuthorized } from "../lib/emailCampaigns/authorization";
import { getEmailPublicConfiguration, getResendConfiguration } from "../lib/emailCampaigns/config";
import { submitBrandedEmail } from "../lib/emailCampaigns/resendProvider";

test("email content is trimmed, required, and length-limited", () => {
  assert.deepEqual(validateEmailCampaignContent({ subject: "  Exam help  ", message: "  Review\n\nExamples  " }), {
    ok: true,
    data: { subject: "Exam help", message: "Review\n\nExamples" },
  });
  assert.equal(validateEmailCampaignContent({ subject: " ", message: "message" }).ok, false);
  assert.equal(validateEmailCampaignContent({ subject: "subject\nBcc: x@example.test", message: "message" }).ok, false);
  assert.equal(validateEmailCampaignContent({ subject: "x".repeat(EMAIL_SUBJECT_MAX_LENGTH + 1), message: "valid" }).ok, false);
  assert.equal(validateEmailCampaignContent({ subject: "valid", message: "x".repeat(EMAIL_MESSAGE_MAX_LENGTH + 1) }).ok, false);
});

test("template escapes admin content and preserves paragraph and line breaks", () => {
  assert.equal(escapeEmailHtml(`<script>alert("x") & 'bad'</script>`), "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;bad&#39;&lt;/script&gt;");
  const html = renderBrandedEmail({
    subject: `<img src=x onerror=alert(1)>`,
    message: `First line\ncontinues\n\nSecond <script>unsafe()</script>`,
    logoUrl: "https://cdn.example.test/brand-logo.png",
    platformUrl: "https://example.test/course",
  });
  assert.match(html, /&lt;img src=x onerror=alert\(1\)&gt;/);
  assert.match(html, /First line<br>continues/);
  assert.match(html, /Second &lt;script&gt;unsafe\(\)&lt;\/script&gt;/);
  assert.match(html, /src="https:\/\/cdn\.example\.test\/brand-logo\.png"/);
  assert.match(html, /href="https:\/\/example\.test\/course"/);
  assert.doesNotMatch(html, /<script>/);
  assert.equal(messageToEmailHtml(""), "");
});

test("only absolute HTTPS public image and platform URLs are accepted", () => {
  assert.equal(normalizePublicHttpsUrl(" https://example.test/logo.png "), "https://example.test/logo.png");
  assert.equal(normalizePublicHttpsUrl("/brand-logo.png"), null);
  assert.equal(normalizePublicHttpsUrl("http://example.test/logo.png"), null);
  assert.equal(normalizePublicHttpsUrl("https://user:pass@example.test/logo.png"), null);
  assert.match(renderBrandedEmail({ subject: "Hi", message: "Text" }), /First Principles <span/);
});

test("recipient selections are deduplicated, bounded, and resolved from trusted student rows", () => {
  assert.deepEqual(normalizeRecipientIds(["student-a", "student-a", "student-b"]), {
    ok: true,
    ids: ["student-a", "student-b"],
  });
  assert.equal(normalizeRecipientIds([]).ok, false);
  assert.equal(normalizeRecipientIds(["student-a", null]).ok, false);
  assert.equal(normalizeRecipientIds(Array.from({ length: EMAIL_CAMPAIGN_MAX_RECIPIENTS + 1 }, (_, index) => `student-${index}`)).ok, false);
  assert.equal(normalizeManualEmailRecipients(["Ada@example.test", "ada@example.test"]).ok, true);
  assert.equal(normalizeManualEmailRecipients(["bad address"]).ok, false);
  assert.equal(normalizeManualEmailRecipients(Array.from({ length: EMAIL_CAMPAIGN_MAX_MANUAL_RECIPIENTS + 1 }, (_, index) => `person${index}@example.test`)).ok, false);
  assert.deepEqual(resolveCampaignRecipients(["student-a"], [{
    id: "student-a",
    display_name: "Ada",
    email: "ada@example.test",
  }]), {
    ok: true,
    recipients: [{ student_id: "student-a", recipient_name: "Ada", recipient_email: "ada@example.test" }],
  });
  assert.equal(resolveCampaignRecipients(["student-a", "student-b"], [{
    id: "student-a",
    display_name: "Ada",
    email: "ada@example.test",
  }]).ok, false);
  assert.equal(resolveCampaignRecipients(["student-a"], [{
    id: "student-a",
    display_name: "Ada",
    email: null,
  }]).ok, false);
  assert.deepEqual(mergeManualEmailRecipients([
    { student_id: "student-a", recipient_name: "Ada", recipient_email: "ada@example.test" },
  ], ["ADA@example.test", "outside@example.test"]), [
    { student_id: "student-a", recipient_name: "Ada", recipient_email: "ada@example.test" },
    { student_id: null, recipient_name: null, recipient_email: "outside@example.test" },
  ]);
});

test("admin guard denies unauthorized actions and allows a verified admin", async () => {
  let reported = 0;
  const denied = await isEmailAdminAuthorized(
    async () => { throw new Error("denied"); },
    (error) => error instanceof Error && error.message === "denied",
    () => { reported += 1; },
  );
  assert.equal(denied, false);
  assert.equal(reported, 0);
  const allowed = await isEmailAdminAuthorized(async () => ({ subject: "admin" }), () => false, () => { reported += 1; });
  assert.equal(allowed, true);
});

test("campaign statuses distinguish full, partial, failed, and uncertain submissions", () => {
  assert.equal(deriveCampaignStatus(["provider_accepted", "provider_accepted"]), "provider_accepted");
  assert.equal(deriveCampaignStatus(["provider_accepted", "failed"]), "partial");
  assert.equal(deriveCampaignStatus(["failed", "failed"]), "failed");
  assert.equal(deriveCampaignStatus(["provider_accepted", "uncertain"]), "uncertain");
  assert.equal(canRetryFailedRecipient("failed"), true);
  assert.equal(canRetryFailedRecipient("uncertain"), false);
  assert.equal(canRetryFailedRecipient("submitting"), false);
});

test("campaign persistence is admin-only and uses a durable unique request key", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261018150000_add_email_campaigns.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /idempotency_key uuid not null unique/);
  assert.match(migration, /alter table public\.email_campaigns enable row level security/i);
  assert.match(migration, /alter table public\.email_campaign_recipients enable row level security/i);
  assert.match(migration, /revoke all on public\.email_campaigns from public, anon, authenticated/i);
  assert.match(migration, /revoke all on public\.email_campaign_recipients from public, anon, authenticated/i);
  assert.doesNotMatch(migration, /create policy .*email_campaign/i);
});

test("missing sender and provider configuration fails closed without exposing secrets", () => {
  const keys = [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "RESEND_FROM_NAME",
    "FIRST_PRINCIPLES_EMAIL_LOGO_URL",
    "FIRST_PRINCIPLES_PLATFORM_URL",
    "NEXT_PUBLIC_SITE_URL",
  ] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    keys.forEach((key) => { delete process.env[key]; });
    const config = getEmailPublicConfiguration();
    assert.equal(config.logoReady, false);
    assert.equal(config.providerReady, false);
    assert.throws(() => getResendConfiguration(), /RESEND_API_KEY and a verified RESEND_FROM_EMAIL/);
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("configured provider credentials cannot send without an HTTPS production logo URL", () => {
  const previous = {
    apiKey: process.env.RESEND_API_KEY,
    sender: process.env.RESEND_FROM_EMAIL,
    logo: process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL,
  };
  try {
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_EMAIL = "verified@example.test";
    delete process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL;
    assert.throws(() => getResendConfiguration(), /FIRST_PRINCIPLES_EMAIL_LOGO_URL/);
  } finally {
    if (previous.apiKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previous.apiKey;
    if (previous.sender === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = previous.sender;
    if (previous.logo === undefined) delete process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL;
    else process.env.FIRST_PRINCIPLES_EMAIL_LOGO_URL = previous.logo;
  }
});

test("Resend receives one private recipient and returns only provider acceptance", async () => {
  const requestBodies: Record<string, unknown>[] = [];
  const result = await submitBrandedEmail(
    { apiKey: "test-key", sender: "First Principles <verified@example.test>" },
    { recipient: "student@example.test", subject: "Subject", html: "<html>branded</html>" },
    async (_url, init) => {
      requestBodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      return new Response(JSON.stringify({ id: "resend-message-1" }), { status: 200 });
    },
  );
  assert.deepEqual(result, { status: "provider_accepted", messageId: "resend-message-1" });
  assert.deepEqual(requestBodies[0]?.to, ["student@example.test"]);
  assert.equal("cc" in (requestBodies[0] ?? {}), false);
  assert.equal(requestBodies[0]?.html, "<html>branded</html>");
});

test("Resend transport uncertainty and provider rejections are not reported as delivered", async () => {
  const requestFailure = await submitBrandedEmail(
    { apiKey: "key", sender: "Sender <verified@example.test>" },
    { recipient: "student@example.test", subject: "Subject", html: "<html></html>" },
    async () => { throw new TypeError("network failed"); },
  );
  assert.equal(requestFailure.status, "uncertain");

  const rejected = await submitBrandedEmail(
    { apiKey: "key", sender: "Sender <verified@example.test>" },
    { recipient: "student@example.test", subject: "Subject", html: "<html></html>" },
    async () => new Response(JSON.stringify({ message: "Invalid sender" }), { status: 422 }),
  );
  assert.deepEqual(rejected, {
    status: "failed",
    error: "Resend rejected the email (HTTP 422). Check sender and provider configuration.",
  });
});
