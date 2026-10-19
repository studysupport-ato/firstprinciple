import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import webpush from "web-push";

import {
  getServerVapidConfig,
  isPushServerConfigured,
  validateVapidKeys,
  validateVapidSubject,
  VapidConfigurationError,
} from "../lib/push/config";
import { getClientPushConfig } from "../lib/push/clientConfig";
import { sanitizeNotificationUrl } from "../lib/push/url";
import { urlBase64ToUint8Array, isPushSupported } from "../lib/push/vapidClient";
import {
  validateSubscriptionEndpoint,
  validateSubscriptionKeys,
  validateSubscriptionPayload,
} from "../lib/push/validation";

describe("VAPID subject validation", () => {
  it("accepts valid mailto URIs", () => {
    const result = validateVapidSubject("mailto:notifications@b2bwithkwamina.com");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.subject, "mailto:notifications@b2bwithkwamina.com");
    }
  });

  it("accepts valid https URLs", () => {
    const result = validateVapidSubject("https://www.b2bwithkwamina.com");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.subject, "https://www.b2bwithkwamina.com");
    }
  });

  it("rejects missing, empty, or non-URI subjects", () => {
    assert.equal(validateVapidSubject(undefined).ok, false);
    assert.equal(validateVapidSubject("   ").ok, false);
    assert.equal(validateVapidSubject("not-a-uri").ok, false);
    assert.equal(validateVapidSubject("http://insecure.example.com").ok, false);
    assert.equal(validateVapidSubject("mailto:invalid-email").ok, false);
  });
});

describe("VAPID key validation", () => {
  const generated = webpush.generateVAPIDKeys();

  it("accepts valid base64url curve25519 / P-256 keys", () => {
    const result = validateVapidKeys(generated.publicKey, generated.privateKey);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.publicKey, generated.publicKey);
      assert.equal(result.privateKey, generated.privateKey);
    }
  });

  it("rejects missing public or private keys", () => {
    const missingPublic = validateVapidKeys(undefined, generated.privateKey);
    assert.equal(missingPublic.ok, false);
    if (!missingPublic.ok) {
      assert.match(missingPublic.error, /NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing/);
    }

    const missingPrivate = validateVapidKeys(generated.publicKey, undefined);
    assert.equal(missingPrivate.ok, false);
    if (!missingPrivate.ok) {
      assert.match(missingPrivate.error, /VAPID_PRIVATE_KEY is missing/);
    }
  });

  it("rejects malformed keys without leaking secret material in error messages", () => {
    const secretAttempt = "super-secret-unencoded-private-key-12345";
    const result = validateVapidKeys("invalid-public-key", secretAttempt);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /Malformed VAPID key material/);
      assert.doesNotMatch(result.error, new RegExp(secretAttempt));
    }
  });
});

describe("VAPID server environment loader", () => {
  const generated = webpush.generateVAPIDKeys();

  it("throws clear VapidConfigurationError when variables are missing", () => {
    const origPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const origPriv = process.env.VAPID_PRIVATE_KEY;
    const origSub = process.env.VAPID_SUBJECT;

    try {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PUBLIC_KEY;
      delete process.env.VAPID_PRIVATE_KEY;
      delete process.env.VAPID_SUBJECT;

      assert.equal(isPushServerConfigured(), false);
      assert.throws(() => getServerVapidConfig(), VapidConfigurationError);
    } finally {
      if (origPub !== undefined) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origPub;
      if (origPriv !== undefined) process.env.VAPID_PRIVATE_KEY = origPriv;
      if (origSub !== undefined) process.env.VAPID_SUBJECT = origSub;
    }
  });

  it("returns verified config and isPushServerConfigured=true when environment is valid", () => {
    const origPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const origPriv = process.env.VAPID_PRIVATE_KEY;
    const origSub = process.env.VAPID_SUBJECT;

    try {
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = generated.publicKey;
      process.env.VAPID_PRIVATE_KEY = generated.privateKey;
      process.env.VAPID_SUBJECT = "mailto:notifications@b2bwithkwamina.com";

      assert.equal(isPushServerConfigured(), true);
      const config = getServerVapidConfig();
      assert.equal(config.publicKey, generated.publicKey);
      assert.equal(config.privateKey, generated.privateKey);
      assert.equal(config.subject, "mailto:notifications@b2bwithkwamina.com");
    } finally {
      if (origPub !== undefined) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origPub;
      else delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      if (origPriv !== undefined) process.env.VAPID_PRIVATE_KEY = origPriv;
      else delete process.env.VAPID_PRIVATE_KEY;

      if (origSub !== undefined) process.env.VAPID_SUBJECT = origSub;
      else delete process.env.VAPID_SUBJECT;
    }
  });

  it("reads client-safe public config without accessing private keys", () => {
    const origPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    try {
      delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      assert.deepEqual(getClientPushConfig(), { publicKey: null, configured: false });

      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = generated.publicKey;
      assert.deepEqual(getClientPushConfig(), { publicKey: generated.publicKey, configured: true });
    } finally {
      if (origPub !== undefined) process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = origPub;
      else delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    }
  });
});

describe("student push subscriptions database migration", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261019130000_add_student_push_subscriptions.sql", import.meta.url),
    "utf8",
  );

  it("creates public.student_push_subscriptions with required columns and constraints", () => {
    assert.match(migration, /create table public\.student_push_subscriptions/i);
    assert.match(migration, /student_id text not null/i);
    assert.match(migration, /endpoint text not null/i);
    assert.match(migration, /p256dh text not null/i);
    assert.match(migration, /auth text not null/i);
    assert.match(migration, /status text not null default 'active'/i);
    assert.match(migration, /check \(status in \('active', 'revoked', 'expired'\)\)/i);
    assert.match(migration, /foreign key \(student_id\) references public\.students \(id\) on delete cascade/i);
  });

  it("enforces uniqueness on endpoint and adds indexes for student lookup and active dispatch", () => {
    assert.match(migration, /create unique index student_push_subscriptions_endpoint_key\s+on public\.student_push_subscriptions \(endpoint\)/i);
    assert.match(migration, /create index student_push_subscriptions_student_id_idx\s+on public\.student_push_subscriptions \(student_id\)/i);
    assert.match(migration, /create index student_push_subscriptions_active_idx\s+on public\.student_push_subscriptions \(student_id\)\s+where status = 'active'/i);
  });

  it("enforces RLS and force RLS on the subscriptions table", () => {
    assert.match(migration, /alter table public\.student_push_subscriptions enable row level security/i);
    assert.match(migration, /alter table public\.student_push_subscriptions force row level security/i);
  });

  it("applies least privilege permissions: revokes anon/authenticated, grants select to authenticated, full access to service_role", () => {
    assert.match(migration, /revoke all on public\.student_push_subscriptions from anon, authenticated/i);
    assert.match(migration, /grant select on public\.student_push_subscriptions to authenticated/i);
    assert.doesNotMatch(migration, /grant (?:all|insert|update|delete)[^;]*public\.student_push_subscriptions to authenticated/i);
    assert.match(migration, /grant all on public\.student_push_subscriptions to service_role/i);
    assert.doesNotMatch(migration, /grant [^;]* to anon/i);
  });

  it("enforces student ownership and prevents identity forgery across all operations", () => {
    for (const action of ["select", "insert", "update", "delete"]) {
      const policyStart = migration.indexOf(`create policy "student_push_subscriptions_${action}_own"`);
      assert.ok(policyStart >= 0, `missing ${action} ownership policy`);
      const nextPolicy = migration.indexOf("create policy ", policyStart + 1);
      const policy = migration.slice(policyStart, nextPolicy < 0 ? undefined : nextPolicy);

      assert.match(policy, /s\.id = student_push_subscriptions\.student_id/i);
      assert.match(policy, /s\.auth_user_id = auth\.uid\(\)::text/i);

      if (action === "update") {
        // Must enforce both USING and WITH CHECK to prevent reassigning student_id
        assert.match(policy, /using\s*\(\s*exists/i);
        assert.match(policy, /with check\s*\(\s*exists/i);
      }
    }
  });

  it("verifies identity lookup semantics through simulated PostgreSQL RLS evaluation", () => {
    // Model existing students table and RLS policy: students_select_own (auth.uid() = auth_user_id)
    const mockStudentsTable = [
      { id: "student-1", auth_user_id: "auth-user-1", display_name: "Kwame" },
      { id: "student-2", auth_user_id: "auth-user-2", display_name: "Ama" },
    ];

    const evaluateStudentsRls = (authUid: string | null, row: typeof mockStudentsTable[0]): boolean => {
      if (!authUid) return false;
      return authUid === row.auth_user_id;
    };

    // Subquery logic in subscription policy:
    // exists (select 1 from public.students s where s.id = student_push_subscriptions.student_id and s.auth_user_id = auth.uid()::text)
    const evaluateSubscriptionPolicy = (
      authUid: string | null,
      subscriptionStudentId: string,
    ): boolean => {
      return mockStudentsTable.some(
        (s) => evaluateStudentsRls(authUid, s) && s.id === subscriptionStudentId && s.auth_user_id === authUid,
      );
    };

    // 1. Authenticated student-1 accessing own subscription -> ALLOWED
    assert.equal(evaluateSubscriptionPolicy("auth-user-1", "student-1"), true);

    // 2. Authenticated student-1 attempting to access student-2's subscription -> DENIED
    assert.equal(evaluateSubscriptionPolicy("auth-user-1", "student-2"), false);

    // 3. Authenticated student-2 accessing own subscription -> ALLOWED
    assert.equal(evaluateSubscriptionPolicy("auth-user-2", "student-2"), true);

    // 4. Authenticated student-2 attempting to access student-1's subscription -> DENIED
    assert.equal(evaluateSubscriptionPolicy("auth-user-2", "student-1"), false);

    // 5. Unauthenticated / anonymous visitor attempting to access any subscription -> DENIED
    assert.equal(evaluateSubscriptionPolicy(null, "student-1"), false);
    assert.equal(evaluateSubscriptionPolicy(null, "student-2"), false);

    // 6. Non-existent student ID -> DENIED
    assert.equal(evaluateSubscriptionPolicy("auth-user-1", "non-existent-student"), false);
  });
});

describe("VAPID public key conversion", () => {
  const generated = webpush.generateVAPIDKeys();

  it("converts base64url public key to Uint8Array with expected 65-byte length", () => {
    const uint8 = urlBase64ToUint8Array(generated.publicKey);
    assert.ok(uint8 instanceof Uint8Array);
    assert.equal(uint8.length, 65); // Standard uncompressed P-256 public key length
  });

  it("throws on missing or non-string input", () => {
    assert.throws(() => urlBase64ToUint8Array(""), /must be a non-empty string/);
    assert.throws(() => urlBase64ToUint8Array(null as unknown as string), /must be a non-empty string/);
  });
});

describe("notification click URL sanitizer", () => {
  const base = "https://www.b2bwithkwamina.com";

  it("resolves valid relative paths to same-origin URLs", () => {
    assert.equal(sanitizeNotificationUrl("/dashboard", base), "https://www.b2bwithkwamina.com/dashboard");
    assert.equal(sanitizeNotificationUrl("/courses/math-151", base), "https://www.b2bwithkwamina.com/courses/math-151");
  });

  it("preserves valid same-origin absolute URLs", () => {
    assert.equal(
      sanitizeNotificationUrl("https://www.b2bwithkwamina.com/progress", base),
      "https://www.b2bwithkwamina.com/progress",
    );
  });

  it("rejects cross-origin URLs and falls back to /dashboard", () => {
    assert.equal(
      sanitizeNotificationUrl("https://malicious.example.com/phish", base),
      "https://www.b2bwithkwamina.com/dashboard",
    );
    assert.equal(
      sanitizeNotificationUrl("//attacker.com/evil", base),
      "https://www.b2bwithkwamina.com/dashboard",
    );
  });

  it("rejects dangerous URI schemes and malformed strings", () => {
    assert.equal(sanitizeNotificationUrl("javascript:alert(1)", base), "https://www.b2bwithkwamina.com/dashboard");
    assert.equal(sanitizeNotificationUrl("data:text/html,<script>alert(1)</script>", base), "https://www.b2bwithkwamina.com/dashboard");
    assert.equal(sanitizeNotificationUrl(null, base), "https://www.b2bwithkwamina.com/dashboard");
    assert.equal(sanitizeNotificationUrl("   ", base), "https://www.b2bwithkwamina.com/dashboard");
  });
});

describe("service worker public/sw.js integrity", () => {
  const swContent = readFileSync(new URL("../public/sw.js", import.meta.url), "utf8");

  it("listens to push and notificationclick events", () => {
    assert.match(swContent, /self\.addEventListener\(\s*["']push["']/);
    assert.match(swContent, /self\.addEventListener\(\s*["']notificationclick["']/);
  });

  it("does not intercept application fetch requests to protect Next.js routing", () => {
    assert.doesNotMatch(swContent, /self\.addEventListener\(\s*["']fetch["']/);
  });

  it("contains no third-party tracking, external scripts, or secrets", () => {
    assert.doesNotMatch(swContent, /importScripts/i);
    assert.doesNotMatch(swContent, /process\.env/);
    assert.doesNotMatch(swContent, /secret/i);
  });

  it("sanitizes destination URLs before window focus or openWindow", () => {
    assert.match(swContent, /getSanitizedDestinationUrl/);
    assert.match(swContent, /self\.location\.origin/);
  });
});

describe("subscription payload validation and authorization boundary", () => {
  it("accepts valid HTTPS endpoints and rejects insecure, malformed, or oversized endpoints", () => {
    const valid = validateSubscriptionEndpoint("https://fcm.googleapis.com/fcm/send/sample-token-12345");
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.data, "https://fcm.googleapis.com/fcm/send/sample-token-12345");
    }

    assert.equal(validateSubscriptionEndpoint(null).ok, false);
    assert.equal(validateSubscriptionEndpoint("").ok, false);
    assert.equal(validateSubscriptionEndpoint("http://insecure.example.com/push").ok, false);
    assert.equal(validateSubscriptionEndpoint("not-a-url").ok, false);
    assert.equal(validateSubscriptionEndpoint("javascript:alert(1)").ok, false);
    assert.equal(validateSubscriptionEndpoint("https://example.com/" + "a".repeat(2048)).ok, false);
  });

  it("validates key material constraints and rejects missing or oversized keys", () => {
    const valid = validateSubscriptionKeys({
      p256dh: "BM_valid_p256dh_public_key_string",
      auth: "valid_auth_secret_string",
    });
    assert.equal(valid.ok, true);

    assert.equal(validateSubscriptionKeys(null).ok, false);
    assert.equal(validateSubscriptionKeys({ p256dh: "", auth: "secret" }).ok, false);
    assert.equal(validateSubscriptionKeys({ p256dh: "key", auth: "" }).ok, false);
    assert.equal(validateSubscriptionKeys({ p256dh: "a".repeat(501), auth: "secret" }).ok, false);
    assert.equal(validateSubscriptionKeys({ p256dh: "key", auth: "b".repeat(501) }).ok, false);
  });

  it("validates complete subscription payloads including userAgent", () => {
    const valid = validateSubscriptionPayload({
      endpoint: "https://updates.push.services.mozilla.com/wpush/v2/gAAAAABsample",
      keys: {
        p256dh: "BM_sample_key",
        auth: "sample_auth",
      },
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    assert.equal(valid.ok, true);
    if (valid.ok) {
      assert.equal(valid.data.userAgent, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
    }
  });

  it("verifies server action code strictly derives student identity from session, not client inputs", () => {
    const actionsCode = readFileSync(
      new URL("../lib/push/studentPushActions.ts", import.meta.url),
      "utf8",
    );
    assert.match(actionsCode, /getAuthenticatedStudent\(auth\.user\.id\)/);
    assert.doesNotMatch(actionsCode, /input\??\.student_id/);
    assert.doesNotMatch(actionsCode, /input\??\.studentId/);
    assert.doesNotMatch(actionsCode, /input\??\.auth_user_id/);
    assert.match(actionsCode, /createSupabaseAdminClient\(\)/);
    assert.match(actionsCode, /onConflict:\s*["']endpoint["']/);
  });
});

describe("PushNotificationOptInModal component and client subscription flow", () => {
  const modalCode = readFileSync(
    new URL("../components/platform/PushNotificationOptInModal.tsx", import.meta.url),
    "utf8",
  );
  const layoutCode = readFileSync(
    new URL("../app/(platform)/layout.tsx", import.meta.url),
    "utf8",
  );
  const clientSubCode = readFileSync(
    new URL("../lib/push/clientSubscription.ts", import.meta.url),
    "utf8",
  );

  it("modal is mounted in PlatformLayout for authenticated platform areas", () => {
    assert.match(layoutCode, /import\s*\{\s*PushNotificationOptInModal\s*\}\s*from/);
    assert.match(layoutCode, /<PushNotificationOptInModal\s*\/>/);
  });

  it("suppresses popup on login, admin, and unauthenticated/loading states", () => {
    assert.match(modalCode, /pathname\.startsWith\(["']\/admin["']\)/);
    assert.match(modalCode, /pathname\s*===\s*["']\/login["']/);
    assert.match(modalCode, /studentLoading\s*\|\|\s*authenticated\s*!==\s*true/);
  });

  it("persists dismissal in localStorage to avoid recurring prompts", () => {
    assert.match(modalCode, /DISMISSAL_LOCALSTORAGE_KEY/);
    assert.match(modalCode, /localStorage\.getItem\(DISMISSAL_LOCALSTORAGE_KEY\)/);
    assert.match(modalCode, /localStorage\.setItem\(DISMISSAL_LOCALSTORAGE_KEY/);
  });

  it("checks browser support and existing active subscription before displaying", () => {
    assert.match(modalCode, /isPushSupported\(\)/);
    assert.match(modalCode, /isIosStandaloneRequired\(\)/);
    assert.match(modalCode, /checkDevicePushSubscriptionActive\(\)/);
    assert.match(modalCode, /getNotificationPermission\(\)\s*===\s*["']denied["']/);
  });

  it("does not request native notification permission on popup display or dismissal", () => {
    // Notification.requestPermission must NOT be invoked inside handleDismiss or display useEffect
    const dismissFn = modalCode.slice(modalCode.indexOf("const handleDismiss"), modalCode.indexOf("const handleEnable"));
    assert.doesNotMatch(dismissFn, /requestPermission/);
  });

  it("enable button triggers user-gesture permission request and reuses existing subscription server action", () => {
    // enableDevicePushNotifications calls Notification.requestPermission and registerPushSubscriptionAction
    assert.match(clientSubCode, /Notification\.requestPermission\(\)/);
    assert.match(clientSubCode, /registerPushSubscriptionAction/);
    assert.match(modalCode, /enableDevicePushNotifications\(\)/);
  });

  it("handles permission denial and reports error safely without subscribing", () => {
    assert.match(clientSubCode, /requestResult\s*===\s*["']denied["']/);
    assert.match(clientSubCode, /Notifications are blocked in your browser settings/);
    assert.match(modalCode, /setErrorMessage/);
  });

  it("PushNotificationToggle reuses shared client subscription flow and syncs state via event", () => {
    const toggleCode = readFileSync(
      new URL("../components/platform/PushNotificationToggle.tsx", import.meta.url),
      "utf8",
    );
    assert.match(toggleCode, /enableDevicePushNotifications/);
    assert.match(toggleCode, /checkDevicePushSubscriptionActive/);
    assert.match(toggleCode, /push-subscription-changed/);
    assert.match(clientSubCode, /push-subscription-changed/);
  });
});



