import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ARKESEL_SMS_ENDPOINT, submitArkeselSmsBatch } from "../lib/smsCampaigns/arkeselProvider";
import { isValidArkeselSender } from "../lib/smsCampaigns/config";
import { verifyArkeselDeliverySignature, mapArkeselDeliveryStatus } from "../lib/smsCampaigns/deliveryWebhook";
import { normalizeGhanaSmsNumber, normalizeSmsRecipientNumber, resolveSmsRecipients } from "../lib/smsCampaigns/phone";
import { estimateSmsSegments } from "../lib/smsCampaigns/segments";
import { ARKESEL_SMS_BATCH_SIZE, SMS_CAMPAIGN_HISTORY_LIMIT, SMS_CAMPAIGN_MAX_RECIPIENTS, isSmsCampaignFormReady, normalizeSmsCampaignIds, normalizeSmsRecipientIds, validateManualSmsNumbers, validateSmsMessage } from "../lib/smsCampaigns/validation";
import { canRetrySmsRecipient, deriveSmsCampaignStatus } from "../lib/smsCampaigns/status";
import { getArkeselConfiguration } from "../lib/smsCampaigns/config";
import { isEmailAdminAuthorized } from "../lib/emailCampaigns/authorization";

test("Ghana mobile numbers normalize only when their country context is explicit", () => {
  assert.deepEqual(normalizeGhanaSmsNumber("024 123 4567"), { ok: true, e164: "+233241234567", display: "0241234567" });
  assert.deepEqual(normalizeGhanaSmsNumber("+233 (24) 123-4567"), { ok: true, e164: "+233241234567", display: "0241234567" });
  assert.deepEqual(normalizeGhanaSmsNumber("233501234567"), { ok: true, e164: "+233501234567", display: "0501234567" });
  assert.deepEqual(normalizeGhanaSmsNumber("00233 020 853 5111"), { ok: true, e164: "+233208535111", display: "0208535111" });
  assert.deepEqual(normalizeGhanaSmsNumber("+233 (0) 24 123 4567"), { ok: true, e164: "+233241234567", display: "0241234567" });
  assert.deepEqual(normalizeGhanaSmsNumber("+14155552671"), { ok: false, reason: "ambiguous" });
  assert.deepEqual(normalizeGhanaSmsNumber("02412345"), { ok: false, reason: "invalid" });
  assert.deepEqual(normalizeGhanaSmsNumber("  "), { ok: false, reason: "missing" });
});

test("manual SMS numbers accept Ghana local and explicit international E.164 formats", () => {
  assert.deepEqual(normalizeSmsRecipientNumber("020 853 5111"), { ok: true, e164: "+233208535111", display: "0208535111" });
  assert.deepEqual(normalizeSmsRecipientNumber("+14155552671"), { ok: true, e164: "+14155552671", display: "+14155552671" });
  assert.equal(normalizeSmsRecipientNumber("14155552671").ok, false);
  assert.deepEqual(validateManualSmsNumbers(["+233208535111", "+14155552671"]), {
    ok: true,
    numbers: ["+233208535111", "+14155552671"],
  });
  assert.equal(validateManualSmsNumbers(["233208535111"]).ok, false);
});

test("recipient resolution requires opt-in, excludes invalid phones, and deduplicates normalized numbers", () => {
  const result = resolveSmsRecipients([
    { studentId: "a", fullName: "Ada", phoneNumber: "0241234567", consentStatus: "opted_in" },
    { studentId: "b", fullName: "Ben", phoneNumber: "+233241234567", consentStatus: "opted_in" },
    { studentId: "c", fullName: "Cy", phoneNumber: "0501234567", consentStatus: "opted_out" },
    { studentId: "d", fullName: "Dee", phoneNumber: "+1 415 555 2671", consentStatus: "opted_in" },
    { studentId: "e", fullName: "Esi", phoneNumber: null, consentStatus: "unknown" },
  ]);
  assert.deepEqual(result.recipients, [{ studentId: "a", fullName: "Ada", phoneNumber: "+233241234567" }]);
  assert.deepEqual(result.excluded.map((entry) => entry.studentId), ["b", "c", "d", "e"]);
  assert.match(result.excluded[1].reason, /opted out/);
  assert.match(result.excluded[3].reason, /consent not recorded/);
});

test("student phone formats normalize before recipient selection and server resolution", () => {
  const result = resolveSmsRecipients([
    { studentId: "a", fullName: "Ama", phoneNumber: "00233 020 853 5111", consentStatus: "opted_in" },
    { studentId: "b", fullName: "Kojo", phoneNumber: "+233 (0) 20-853-5111", consentStatus: "opted_in" },
  ]);
  assert.deepEqual(result.recipients, [
    { studentId: "a", fullName: "Ama", phoneNumber: "+233208535111" },
  ]);
  assert.deepEqual(result.excluded, [
    { studentId: "b", fullName: "Kojo", reason: "Duplicate phone number in this campaign" },
  ]);
});

test("manual recipients can enable sending without selecting a directory audience", () => {
  const base = {
    sending: false,
    audience: null,
    selectedStudentCount: 0,
    manualNumberCount: 1,
    message: "Class starts at nine",
    purposeConfirmed: true,
    manualConsentConfirmed: true,
    manualConsentReference: "consent record 123",
  } as const;
  assert.equal(isSmsCampaignFormReady(base), true);
  assert.equal(isSmsCampaignFormReady({ ...base, manualConsentReference: " " }), false);
  assert.equal(isSmsCampaignFormReady({ ...base, manualConsentConfirmed: false }), false);
  assert.equal(isSmsCampaignFormReady({ ...base, purposeConfirmed: false }), false);
  assert.equal(isSmsCampaignFormReady({ ...base, manualNumberCount: 0 }), false);
  assert.equal(isSmsCampaignFormReady({ ...base, audience: "all" }), true);
});

test("SMS message and recipient selection validation rejects empty, malformed, and oversized input", () => {
  assert.deepEqual(validateSmsMessage("  Class begins at 9  "), { ok: true, message: "Class begins at 9" });
  assert.equal(validateSmsMessage("  ").ok, false);
  assert.equal(validateSmsMessage("bad\u0000message").ok, false);
  assert.equal(validateSmsMessage("x".repeat(1001)).ok, false);
  assert.deepEqual(normalizeSmsRecipientIds(["a", "a", "b"]), { ok: true, ids: ["a", "b"] });
  assert.equal(normalizeSmsRecipientIds([]).ok, false);
  assert.equal(normalizeSmsRecipientIds(["a", null]).ok, false);
  assert.equal(normalizeSmsRecipientIds(Array.from({ length: SMS_CAMPAIGN_MAX_RECIPIENTS + 1 }, (_, index) => String(index))).ok, false);
  assert.equal(ARKESEL_SMS_BATCH_SIZE, 100);
});

test("SMS campaign deletion accepts only bounded UUID selections", () => {
  const first = "123e4567-e89b-42d3-a456-426614174000";
  const second = "123e4567-e89b-42d3-a456-426614174001";
  assert.deepEqual(normalizeSmsCampaignIds([first, first, second]), {
    ok: true,
    ids: [first, second],
  });
  assert.equal(normalizeSmsCampaignIds([]).ok, false);
  assert.equal(normalizeSmsCampaignIds([first, "not-a-uuid"]).ok, false);
  assert.equal(normalizeSmsCampaignIds(Array.from({ length: SMS_CAMPAIGN_HISTORY_LIMIT + 1 }, (_, index) =>
    `123e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}`,
  )).ok, false);
});

test("GSM-7 extension characters and Unicode change estimated SMS segments", () => {
  assert.deepEqual(estimateSmsSegments("a".repeat(160)), {
    encoding: "GSM-7", characters: 160, segments: 1, charactersPerSegment: 153, singleMessageLimit: 160, estimated: true,
  });
  assert.equal(estimateSmsSegments("a".repeat(161)).segments, 2);
  assert.equal(estimateSmsSegments("^").characters, 2);
  assert.equal(estimateSmsSegments("^".repeat(81)).segments, 2);
  assert.equal(estimateSmsSegments("🙂").encoding, "Unicode (UCS-2)");
  assert.equal(estimateSmsSegments("🙂").characters, 2);
  assert.equal(estimateSmsSegments("🙂".repeat(36)).segments, 2);
});

test("Arkesel sender id follows documented limit and campaign send is blocked on invalid provider setup", () => {
  assert.equal(isValidArkeselSender("Math 151"), true);
  assert.equal(isValidArkeselSender("abcdefghijkl"), false);
  assert.equal(isValidArkeselSender("Name\nBcc"), false);
});

test("SMS server configuration fails closed without credentials, approved sender, callback, and webhook secret", () => {
  const keys = ["ARKESEL_API_KEY", "ARKESEL_SENDER_ID", "ARKESEL_CALLBACK_URL", "ARKESEL_WEBHOOK_SECRET"] as const;
  const previous = new Map(keys.map((key) => [key, process.env[key]]));
  try {
    for (const key of keys) delete process.env[key];
    assert.throws(() => getArkeselConfiguration(), /ARKESEL_API_KEY/);
    process.env.ARKESEL_API_KEY = "test-key";
    process.env.ARKESEL_SENDER_ID = "Math 151";
    process.env.ARKESEL_CALLBACK_URL = "https://example.test/api/webhooks/arkesel/sms";
    assert.throws(() => getArkeselConfiguration(), /ARKESEL_WEBHOOK_SECRET/);
    process.env.ARKESEL_WEBHOOK_SECRET = "test-secret";
    assert.deepEqual(getArkeselConfiguration(), {
      apiKey: "test-key",
      sender: "Math 151",
      callbackUrl: "https://example.test/api/webhooks/arkesel/sms",
    });
  } finally {
    for (const key of keys) {
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("Arkesel v2 uses its documented endpoint, api-key header and digits-only recipient batch", async () => {
  let requestedUrl = "";
  let requestInit: RequestInit | undefined;
  const result = await submitArkeselSmsBatch(
    { apiKey: "test-key", sender: "Math 151", callbackUrl: "https://example.test/api/webhooks/arkesel/sms" },
    { recipients: [{ phoneNumber: "+233241234567" }], message: "Class at nine" },
    async (url, init) => {
      requestedUrl = String(url);
      requestInit = init;
      return new Response(JSON.stringify({
        status: "success",
        data: [{ recipient: "233241234567", id: "arkesel-id-1" }],
      }), { status: 200 });
    },
  );
  assert.equal(requestedUrl, ARKESEL_SMS_ENDPOINT);
  assert.equal(requestInit?.method, "POST");
  assert.equal(new Headers(requestInit?.headers).get("api-key"), "test-key");
  const body = JSON.parse(String(requestInit?.body)) as Record<string, unknown>;
  assert.deepEqual(body.recipients, ["233241234567"]);
  assert.equal(body.callback_url, "https://example.test/api/webhooks/arkesel/sms");
  assert.deepEqual(result, {
    status: "provider_accepted",
    recipients: [{ phoneNumber: "+233241234567", providerReference: "arkesel-id-1" }],
  });

  test("Arkesel response can match an explicit international recipient", async () => {
    const result = await submitArkeselSmsBatch(
      { apiKey: "test-key", sender: "Math 151", callbackUrl: "https://example.test/callback" },
      { recipients: [{ phoneNumber: "+14155552671" }], message: "Test" },
      async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as { recipients: string[] };
        assert.deepEqual(body.recipients, ["14155552671"]);
        return new Response(JSON.stringify({
          status: "success",
          data: [{ recipient: "14155552671", id: "intl-ref" }],
        }), { status: 200 });
      },
    );
    assert.deepEqual(result, {
      status: "provider_accepted",
      recipients: [{ phoneNumber: "+14155552671", providerReference: "intl-ref" }],
    });
  });
});

test("Arkesel rejection is failed and transport/ambiguous success is uncertain, never delivered", async () => {
  const configuration = { apiKey: "key", sender: "Math 151", callbackUrl: "https://example.test/callback" };
  const input = { recipients: [{ phoneNumber: "+233241234567" }], message: "Hello" };
  const rejected = await submitArkeselSmsBatch(configuration, input, async () => new Response("{}", { status: 422 }));
  assert.equal(rejected.status, "failed");
  const timeout = await submitArkeselSmsBatch(configuration, input, async () => { throw new TypeError("network failed"); });
  assert.equal(timeout.status, "uncertain");
  const partial = await submitArkeselSmsBatch(configuration, {
    recipients: [{ phoneNumber: "+233241234567" }, { phoneNumber: "+233501234567" }],
    message: "Hello",
  }, async () => new Response(JSON.stringify({
    status: "success",
    data: [{ recipient: "233241234567", id: "accepted-only-one" }],
  }), { status: 200 }));
  assert.deepEqual(partial, {
    status: "provider_accepted",
    recipients: [{ phoneNumber: "+233241234567", providerReference: "accepted-only-one" }],
  });
  const incomplete = await submitArkeselSmsBatch(configuration, input, async () => new Response(JSON.stringify({
    status: "success",
    data: [{ recipient: "233241234567" }],
  }), { status: 200 }));
  assert.deepEqual(incomplete, {
    status: "uncertain",
    error: "Arkesel did not return a matching recipient reference; check provider status before retrying.",
  });
});

test("Arkesel webhook verifies canonical signed query, freshness, valid status, and duplicate signatures", () => {
  const secret = "test-webhook-secret";
  const timestamp = 1_783_425_600;
  const query = new URLSearchParams("status=DELIVERED&sms_id=abc123");
  const canonical = JSON.stringify({ sms_id: "abc123", status: "DELIVERED" });
  const digest = createHmac("sha256", secret).update(`${timestamp}.${canonical}`).digest("hex");
  const event = verifyArkeselDeliverySignature({
    query,
    timestampHeader: String(timestamp),
    signatureHeader: `v1=${digest}`,
    callbackIdHeader: "callback-unique-id",
    secrets: [secret],
    nowSeconds: timestamp + 20,
  });
  assert.deepEqual(event, { smsId: "abc123", status: "DELIVERED", callbackId: "callback-unique-id", timestamp });
  assert.equal(mapArkeselDeliveryStatus("DELIVERED"), "delivered");
  assert.equal(mapArkeselDeliveryStatus("SUBMITTED"), "provider_accepted");
  assert.equal(mapArkeselDeliveryStatus("QUEUED"), "provider_accepted");
  assert.equal(verifyArkeselDeliverySignature({
    query,
    timestampHeader: String(timestamp),
    signatureHeader: `v1=${"0".repeat(64)},v1=${digest}`,
    callbackIdHeader: "callback-unique-id",
    secrets: [secret],
    nowSeconds: timestamp,
  })?.status, "DELIVERED");
  assert.equal(verifyArkeselDeliverySignature({
    query,
    timestampHeader: String(timestamp),
    signatureHeader: `v1=${digest}`,
    callbackIdHeader: "callback-unique-id",
    secrets: [secret],
    nowSeconds: timestamp + 301,
  }), null);
  assert.equal(verifyArkeselDeliverySignature({
    query,
    timestampHeader: String(timestamp),
    signatureHeader: `v1=${digest}`,
    callbackIdHeader: null,
    secrets: [secret],
    nowSeconds: timestamp,
  }), null);
});

test("campaign transitions and retry limits distinguish delivery, failure, and uncertainty", () => {
  assert.equal(deriveSmsCampaignStatus(["provider_accepted", "delivered"]), "provider_accepted");
  assert.equal(deriveSmsCampaignStatus(["provider_accepted", "failed"]), "partial");
  assert.equal(deriveSmsCampaignStatus(["failed", "suppressed"]), "failed");
  assert.equal(deriveSmsCampaignStatus(["provider_accepted", "uncertain"]), "uncertain");
  assert.equal(canRetrySmsRecipient("failed", 4), true);
  assert.equal(canRetrySmsRecipient("failed", 5), false);
  assert.equal(canRetrySmsRecipient("uncertain", 0), false);
});

test("server admin authorization fails closed", async () => {
  const denied = await isEmailAdminAuthorized(async () => { throw new Error("no"); }, () => true, () => undefined);
  const allowed = await isEmailAdminAuthorized(async () => ({ subject: "admin" }), () => false, () => undefined);
  assert.equal(denied, false);
  assert.equal(allowed, true);
});

test("SMS campaign and preferences migration defaults consent to unknown and denies browser table access", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261018160000_add_sms_campaigns.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /status text not null default 'unknown'/);
  assert.match(migration, /status <> 'opted_in'[\s\S]*consent_source is not null/);
  assert.match(migration, /unique \(campaign_id, recipient_phone\)/);
  assert.match(migration, /idempotency_key uuid not null unique/);
  assert.match(migration, /alter table public\.sms_campaigns enable row level security/i);
  assert.match(migration, /alter table public\.sms_campaign_recipients enable row level security/i);
  assert.match(migration, /revoke all on public\.sms_campaign_recipients from public, anon, authenticated/i);
  assert.match(migration, /callback_id text not null unique/);
  assert.doesNotMatch(migration, /create policy .*sms_campaign/i);
});

test("SMS history deletion is transactional and limited to service-role invocation", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261018190000_add_admin_sms_campaign_deletion.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /security invoker/i);
  assert.match(migration, /for update/i);
  assert.match(migration, /status in \('sending', 'uncertain'\)/i);
  assert.match(migration, /delete from public\.sms_delivery_events/i);
  assert.match(migration, /delete from public\.sms_campaigns/i);
  assert.match(migration, /revoke all on function .* from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function .* to service_role/i);
});

test("manual SMS migration permits E.164 recipients while preserving consent evidence snapshots", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261018181000_allow_manual_sms_recipients.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /recipient_phone ~ .+\[1-9\].+\{7,14\}/);
  assert.match(migration, /add column if not exists consent_reference_snapshot text/i);
});
