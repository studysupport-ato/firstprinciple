/**
 * tests/push-delivery.test.ts
 *
 * Phase 4 tests: push delivery outbox, worker, and dispatch correctness.
 * Pure in-process tests — no Docker, no live Supabase, no real HTTP push calls.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  buildPushPayload,
  classifyPushError,
  computeBackoffMs,
  MAX_DELIVERY_ATTEMPTS,
  LEASE_DURATION_MS,
  JOB_BATCH_SIZE,
  SUBSCRIPTION_CONCURRENCY,
  PUSH_TIMEOUT_MS,
} from "../lib/push/dispatch";
import { sanitizeNotificationUrl } from "../lib/push/url";

// ─── Outbox migration tests ───────────────────────────────────────────────────

describe("push delivery jobs migration", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261019140000_add_push_delivery_jobs.sql", import.meta.url),
    "utf8",
  );

  it("creates public.push_delivery_jobs with required columns and constraints", () => {
    assert.match(migration, /create table public\.push_delivery_jobs/i);
    assert.match(migration, /announcement_id text not null/i);
    assert.match(migration, /status text not null default 'pending'/i);
    assert.match(migration, /check \(status in \('pending', 'processing', 'completed', 'failed'\)\)/i);
    assert.match(migration, /lease_expires_at timestamptz/i);
    assert.match(migration, /attempt_number integer not null default 0/i);
    assert.match(migration, /next_attempt_at timestamptz not null default now\(\)/i);
    assert.match(migration, /foreign key \(announcement_id\) references public\.announcements \(id\) on delete cascade/i);
  });

  it("adds indexes for pending job polling and lease recovery", () => {
    assert.match(migration, /create index push_delivery_jobs_pending_idx/i);
    assert.match(migration, /where status = 'pending'/i);
    assert.match(migration, /create index push_delivery_jobs_lease_recovery_idx/i);
    assert.match(migration, /where status = 'processing'/i);
    assert.match(migration, /create unique index push_delivery_jobs_announcement_unique/i);
  });

  it("enforces RLS and revokes all client access — only service_role may access jobs", () => {
    assert.match(migration, /alter table public\.push_delivery_jobs enable row level security/i);
    assert.match(migration, /alter table public\.push_delivery_jobs force row level security/i);
    assert.match(migration, /revoke all on public\.push_delivery_jobs from anon, authenticated/i);
    assert.doesNotMatch(migration, /grant (?:select|insert|update|delete|all)[^;]*public\.push_delivery_jobs to (?:anon|authenticated)/i);
    assert.match(migration, /grant all on public\.push_delivery_jobs to service_role/i);
  });

  it("defines create_announcement_with_push_job as a security definer function", () => {
    assert.match(migration, /create or replace function public\.create_announcement_with_push_job/i);
    assert.match(migration, /security definer/i);
    assert.match(migration, /set search_path = public/i);
    assert.match(migration, /language plpgsql/i);
    // Inserts both announcement and push job inside one function body = atomicity
    assert.match(migration, /insert into public\.announcements/i);
    assert.match(migration, /insert into public\.push_delivery_jobs/i);
    // Only service_role may execute
    assert.match(migration, /revoke all on function public\.create_announcement_with_push_job/i);
    assert.match(migration, /grant execute on function public\.create_announcement_with_push_job.*to service_role/i);
  });

  it("includes increment_push_failed_attempts for atomic counter updates", () => {
    assert.match(migration, /create or replace function public\.increment_push_failed_attempts/i);
    assert.match(migration, /failed_attempts = failed_attempts \+ 1/i);
    assert.match(migration, /revoke all on function public\.increment_push_failed_attempts/i);
    assert.match(migration, /grant execute on function public\.increment_push_failed_attempts.*to service_role/i);
  });

  it("on conflict clause makes job insert idempotent per announcement", () => {
    assert.match(migration, /on conflict \(announcement_id\) do nothing/i);
  });
});

// ─── Atomicity: admin action code inspection ──────────────────────────────────

describe("atomic announcement + outbox persistence", () => {
  const actionsCode = readFileSync(
    new URL("../lib/notificationAdminActions.ts", import.meta.url),
    "utf8",
  );

  it("uses the atomic RPC instead of a bare insert", () => {
    assert.match(actionsCode, /rpc[\s\S]*["']create_announcement_with_push_job["']/);
    // Must NOT directly insert into announcements table (that would bypass atomicity)
    assert.doesNotMatch(actionsCode, /\.from\(\s*[\"']announcements[\"']\s*\)\s*\.insert\(/);
  });

  it("passes p_enqueue_push based on isPushServerConfigured — never unconditionally", () => {
    assert.match(actionsCode, /isPushServerConfigured/);
    assert.match(actionsCode, /p_enqueue_push[\s\S]*pushConfigured|pushConfigured[\s\S]*p_enqueue_push/);
  });

  it("returns pushQueued to distinguish delivery queued vs push not configured vs enqueue failed", () => {
    assert.match(actionsCode, /pushQueued/);
    assert.match(actionsCode, /pushEnqueueError/);
  });

  it("still passes through requireAdmin before any announcement operation", () => {
    assert.match(actionsCode, /requireAdmin/);
    assert.match(actionsCode, /AdminUnauthorizedError/);
  });

  it("does not perform announcement insert outside the atomic RPC", () => {
    // Ensure no stray non-RPC inserts to announcements
    const insertMatches = [...actionsCode.matchAll(/\.from\(["']announcements["']\)\s*\.\s*insert/g)];
    assert.equal(insertMatches.length, 0, "Found direct insert to announcements table bypassing atomic RPC");
  });
});

// ─── Unauthorized announcement publishing ─────────────────────────────────────

describe("unauthorized announcement publishing", () => {
  it("admin action code guards every privileged operation with requireAdmin", () => {
    const actionsCode = readFileSync(
      new URL("../lib/notificationAdminActions.ts", import.meta.url),
      "utf8",
    );
    // runAdminAction always calls requireAdmin before the operation
    assert.match(actionsCode, /const session = await requireAdmin\(\)/);
    // Every exported action must go through runAdminAction
    assert.match(actionsCode, /sendAnnouncementAction[\s\S]*runAdminAction/);
    assert.match(actionsCode, /deleteAnnouncementAction[\s\S]*runAdminAction/);
    assert.match(actionsCode, /getAdminAnnouncementsAction[\s\S]*runAdminAction/);
  });

  it("admin session guard rejects tampered, expired, or missing tokens", () => {
    // Already covered by notifications.test.ts – cross-reference here for completeness.
    // If the admin session module is not reachable or misconfigured, the action returns ok:false.
    const actionsCode = readFileSync(
      new URL("../lib/notificationAdminActions.ts", import.meta.url),
      "utf8",
    );
    assert.match(actionsCode, /return \{ ok: false, error: "Unauthorized/);
  });
});

// ─── Duplicate job handling and idempotency ───────────────────────────────────

describe("duplicate job handling and concurrent workers", () => {
  it("migration uses ON CONFLICT DO NOTHING for idempotent job insert", () => {
    const migration = readFileSync(
      new URL("../supabase/migrations/20261019140000_add_push_delivery_jobs.sql", import.meta.url),
      "utf8",
    );
    assert.match(migration, /on conflict \(announcement_id\) do nothing/i);
    assert.match(migration, /create unique index push_delivery_jobs_announcement_unique/i);
  });

  it("worker code updates status with eq status=pending to reject double-claims", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    // The optimistic lock: .eq("status", "pending") ensures a second worker cannot claim
    // an already-claimed job
    assert.match(dispatchCode, /\.eq\(["']status["'],\s*["']pending["']\)/);
  });

  it("worker claims status=processing with lease_expires_at to support crash recovery", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    assert.match(dispatchCode, /status.*processing/);
    assert.match(dispatchCode, /lease_expires_at/);
    assert.match(dispatchCode, /claimed_at/);
  });
});

// ─── Lease expiry and crash recovery ─────────────────────────────────────────

describe("lease expiry and crash recovery", () => {
  it("LEASE_DURATION_MS is positive and bounded (not more than 10 minutes)", () => {
    assert.ok(LEASE_DURATION_MS > 0);
    assert.ok(LEASE_DURATION_MS <= 10 * 60 * 1000, "Lease duration exceeds 10 minutes");
  });

  it("worker resets expired leases back to pending before claiming new jobs", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    // Recovery step: status=processing + lease_expires_at < now => reset to pending
    assert.match(dispatchCode, /status[\s\S]*processing[\s\S]*lt\([\s\S]*lease_expires_at|lt\([\s\S]*lease_expires_at[\s\S]*processing/);
    assert.match(dispatchCode, /status[\s\S]*pending[\s\S]*claimed_at[\s\S]*null|claimed_at[\s\S]*null[\s\S]*status[\s\S]*pending/);
  });

  it("failed job retry resets claimed_at and lease_expires_at to null", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    // When marking for retry, claimed_at and lease_expires_at must be cleared
    const retryBlock = dispatchCode.slice(dispatchCode.indexOf("isTerminal"));
    assert.match(retryBlock, /claimed_at.*null/);
    assert.match(retryBlock, /lease_expires_at.*null/);
  });
});

// ─── Retry and backoff limits ─────────────────────────────────────────────────

describe("retry and backoff limits", () => {
  it("MAX_DELIVERY_ATTEMPTS is positive and bounded", () => {
    assert.ok(MAX_DELIVERY_ATTEMPTS > 0);
    assert.ok(MAX_DELIVERY_ATTEMPTS <= 10, "MAX_DELIVERY_ATTEMPTS should be <= 10 to avoid long-tail retries");
  });

  it("computeBackoffMs returns value within [0, BACKOFF_MAX_MS]", () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const delay = computeBackoffMs(attempt);
      assert.ok(delay >= 0, `backoff at attempt ${attempt} must be >= 0`);
      assert.ok(delay <= 60 * 60 * 1000, `backoff at attempt ${attempt} exceeds max`);
    }
  });

  it("backoff is on average larger for higher attempt numbers (statistical)", () => {
    // Sample 100 values at attempt=0 and attempt=4, verify mean[4] > mean[0]
    let sum0 = 0;
    let sum4 = 0;
    const N = 100;
    for (let i = 0; i < N; i++) {
      sum0 += computeBackoffMs(0);
      sum4 += computeBackoffMs(4);
    }
    assert.ok(sum4 / N > sum0 / N, "Expected higher attempt to have larger average backoff");
  });

  it("job is marked failed (not pending) once MAX_DELIVERY_ATTEMPTS is reached", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    assert.match(dispatchCode, /MAX_DELIVERY_ATTEMPTS/);
    assert.match(dispatchCode, /isTerminal[\s\S]*failed|failed[\s\S]*isTerminal/);
  });
});

// ─── HTTP 404/410 endpoint expiry ────────────────────────────────────────────

describe("404/410 endpoint expiry", () => {
  it("classifyPushError maps 404 and 410 to expired_endpoint", () => {
    const result404 = classifyPushError({ statusCode: 404 });
    assert.equal(result404.kind, "expired_endpoint");

    const result410 = classifyPushError({ statusCode: 410 });
    assert.equal(result410.kind, "expired_endpoint");
  });

  it("expired_endpoint outcome leads to status=expired in dispatch code", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    assert.match(dispatchCode, /expired_endpoint/);
    assert.match(dispatchCode, /status[\s\S]*expired|expired[\s\S]*status/);
  });
});

// ─── 429/5xx/network transient failure handling ───────────────────────────────

describe("429/5xx and network failure handling", () => {
  it("classifyPushError maps 429 to transient", () => {
    const result = classifyPushError({ statusCode: 429 });
    assert.equal(result.kind, "transient");
    assert.equal((result as { kind: "transient"; statusCode?: number }).statusCode, 429);
  });

  it("classifyPushError maps 500-599 to transient", () => {
    for (const code of [500, 502, 503, 504]) {
      const result = classifyPushError({ statusCode: code });
      assert.equal(result.kind, "transient", `expected transient for status ${code}`);
    }
  });

  it("classifyPushError maps network errors to transient", () => {
    const result = classifyPushError(new Error("fetch failed: ECONNRESET"));
    assert.equal(result.kind, "transient");
  });

  it("classifyPushError maps 400-level non-404/410 errors to permanent_error", () => {
    const result = classifyPushError({ statusCode: 400 });
    assert.equal(result.kind, "permanent_error");

    const result403 = classifyPushError({ statusCode: 403 });
    assert.equal(result403.kind, "permanent_error");
  });

  it("classifyPushError handles null/undefined gracefully without throwing", () => {
    assert.doesNotThrow(() => classifyPushError(null));
    assert.doesNotThrow(() => classifyPushError(undefined));
    assert.doesNotThrow(() => classifyPushError("plain string error"));
    assert.equal(classifyPushError(null).kind, "permanent_error");
  });

  it("transient errors increment failed_attempts but do not revoke subscriptions", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    // increment_push_failed_attempts is called for transient and permanent errors
    assert.match(dispatchCode, /increment_push_failed_attempts/);
    // For transient outcomes, status should NOT be set to revoked
    const outcomeSection = dispatchCode.slice(dispatchCode.indexOf("recordSubscriptionOutcome"));
    // The revoked status should NOT appear in the transient/permanent branch
    assert.doesNotMatch(outcomeSection, /kind[\s\S]*transient[\s\S]*revoked|transient[\s\S]*status[\s\S]*revoked/);
  });
});

// ─── VAPID configuration errors ───────────────────────────────────────────────

describe("missing or invalid VAPID configuration", () => {
  it("worker exits early and returns pushConfigured=false when VAPID is not set", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    assert.match(dispatchCode, /isPushServerConfigured/);
    assert.match(dispatchCode, /pushConfigured[\s\S]*false|return[\s\S]*pushConfigured: false/);
  });

  it("API route rejects requests without a valid bearer token", () => {
    const routeCode = readFileSync(
      new URL("../app/api/push/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(routeCode, /verifyWorkerAuthorization/);
    assert.match(routeCode, /401/);
    assert.match(routeCode, /PUSH_WORKER_SECRET|CRON_SECRET/);
    // Fail-closed: if no secret is configured, refuse all requests
    assert.match(routeCode, /return false/);
  });

  it("API route contains maxDuration export for serverless timeout control", () => {
    const routeCode = readFileSync(
      new URL("../app/api/push/route.ts", import.meta.url),
      "utf8",
    );
    assert.match(routeCode, /export const maxDuration/);
  });
});

// ─── Safe URL handling ────────────────────────────────────────────────────────

describe("safe URL handling in push payload", () => {
  const base = "https://www.b2bwithkwamina.com";

  it("buildPushPayload produces valid JSON with expected fields", () => {
    process.env.NEXT_PUBLIC_SITE_URL = base;
    const payload = buildPushPayload("Test title", "Test message", "/dashboard");
    const parsed = JSON.parse(payload) as {
      title: string;
      body: string;
      url: string;
      tag: string;
      icon: string;
      badge: string;
    };
    assert.equal(parsed.title, "Test title");
    assert.equal(parsed.body, "Test message");
    assert.equal(parsed.url, `${base}/dashboard`);
    assert.ok(parsed.tag, "tag must be present");
    assert.ok(parsed.icon, "icon must be present");
    assert.ok(parsed.badge, "badge must be present");
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("buildPushPayload truncates oversized title and body", () => {
    process.env.NEXT_PUBLIC_SITE_URL = base;
    const longTitle = "T".repeat(200);
    const longMessage = "M".repeat(500);
    const payload = JSON.parse(buildPushPayload(longTitle, longMessage, "/dashboard")) as {
      title: string;
      body: string;
    };
    assert.ok(payload.title.length <= 120, "title must be truncated to 120 chars");
    assert.ok(payload.body.length <= 200, "body must be truncated to 200 chars");
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  it("sanitizeNotificationUrl rejects cross-origin and dangerous schemes", () => {
    assert.equal(
      sanitizeNotificationUrl("https://malicious.example.com/evil", base),
      `${base}/dashboard`,
    );
    assert.equal(sanitizeNotificationUrl("javascript:alert(1)", base), `${base}/dashboard`);
    assert.equal(sanitizeNotificationUrl("data:text/html,<script>x</script>", base), `${base}/dashboard`);
  });
});

// ─── Secret redaction ─────────────────────────────────────────────────────────

describe("secret redaction in logs and responses", () => {
  it("dispatch code never logs endpoint, p256dh, or auth values directly", () => {
    const dispatchCode = readFileSync(
      new URL("../lib/push/dispatch.ts", import.meta.url),
      "utf8",
    );
    // There should be no console.log/warn calls that reference subscription key fields
    assert.doesNotMatch(dispatchCode, /console\.(?:log|warn)\(.*endpoint/i);
    assert.doesNotMatch(dispatchCode, /console\.(?:log|warn)\(.*p256dh/i);
    assert.doesNotMatch(dispatchCode, /console\.(?:log|warn)\(.*\.auth/i);
  });

  it("worker API route returns only safe aggregated statistics", () => {
    const routeCode = readFileSync(
      new URL("../app/api/push/route.ts", import.meta.url),
      "utf8",
    );
    // Check that the summary mapping block does not expose raw subscription material
    const summaryStart = routeCode.indexOf("summary: result.details.map");
    const summaryEnd = routeCode.indexOf("})),", summaryStart);
    const summaryBlock = summaryStart >= 0 ? routeCode.slice(summaryStart, summaryEnd + 4) : "";
    assert.ok(summaryBlock.length > 0, "summary mapping block not found");
    assert.doesNotMatch(summaryBlock, /p256dh/);
    assert.doesNotMatch(summaryBlock, /endpoint:/);
    assert.match(summaryBlock, /jobId/);
    assert.match(summaryBlock, /attempted/);
  });

  it("classifyPushError safeReason does not echo private key or subscription material", () => {
    const result = classifyPushError({ statusCode: 400, body: "p256dh_secret_value=abcdef" });
    if (result.kind === "permanent_error") {
      assert.doesNotMatch(result.safeReason, /p256dh_secret_value/);
      assert.doesNotMatch(result.safeReason, /abcdef/);
    }
  });
});

// ─── Bounded concurrency constants ────────────────────────────────────────────

describe("bounded concurrency and timeout constants", () => {
  it("JOB_BATCH_SIZE is positive and bounded to prevent unbounded work", () => {
    assert.ok(JOB_BATCH_SIZE > 0);
    assert.ok(JOB_BATCH_SIZE <= 50, "JOB_BATCH_SIZE exceeds 50 — risk of timeout");
  });

  it("SUBSCRIPTION_CONCURRENCY is positive and bounded", () => {
    assert.ok(SUBSCRIPTION_CONCURRENCY > 0);
    assert.ok(SUBSCRIPTION_CONCURRENCY <= 20, "SUBSCRIPTION_CONCURRENCY exceeds safe concurrency limit");
  });

  it("PUSH_TIMEOUT_MS is reasonable (> 1s, <= 30s)", () => {
    assert.ok(PUSH_TIMEOUT_MS > 1000);
    assert.ok(PUSH_TIMEOUT_MS <= 30_000);
  });
});

// ─── Existing notification behavior preserved ─────────────────────────────────

describe("existing in-app notification behavior preserved", () => {
  it("NotificationBell component still exists and renders unread badge and panel", () => {
    const bell = readFileSync(
      new URL("../components/platform/NotificationBell.tsx", import.meta.url),
      "utf8",
    );
    assert.match(bell, /aria-expanded=\{panelOpen\}/);
    assert.match(bell, /aria-label=\{badge \? `Notifications,/);
    assert.match(bell, /event\.key === "Escape"/);
    assert.match(bell, /role="alert"/);
  });

  it("student announcement actions are unchanged (read, mark-read, unread count)", () => {
    const studentActions = readFileSync(
      new URL("../lib/notifications/studentActions.ts", import.meta.url),
      "utf8",
    );
    assert.match(studentActions, /getCurrentStudentAnnouncementsAction/);
    assert.match(studentActions, /markCurrentStudentAnnouncementReadAction/);
    assert.match(studentActions, /markCurrentStudentAnnouncementsReadAction/);
    assert.match(studentActions, /getCurrentStudentAnnouncementReadStateAction/);
  });

  it("Realtime subscription module is unchanged", () => {
    const realtime = readFileSync(
      new URL("../lib/notifications/realtime.ts", import.meta.url),
      "utf8",
    );
    assert.match(realtime, /subscribeToStudentNotifications/);
    assert.match(realtime, /supabase_realtime|announcements/i);
  });

  it("vercel.json cron only targets the push worker route, not student-facing routes", () => {
    const vercelJson = JSON.parse(
      readFileSync(new URL("../vercel.json", import.meta.url), "utf8"),
    ) as { crons?: Array<{ path: string; schedule: string }> };
    assert.ok(Array.isArray(vercelJson.crons), "vercel.json must have a crons array");
    const paths = vercelJson.crons.map((c) => c.path);
    assert.ok(paths.some((p) => p.includes("/api/push")), "Must have a cron for /api/push");
    assert.ok(
      paths.every((p) => !p.includes("/dashboard") && !p.includes("/courses") && !p.includes("/students")),
      "Cron must not target student-facing routes",
    );
  });
});
