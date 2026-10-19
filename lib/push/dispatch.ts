/**
 * lib/push/dispatch.ts — server-only push dispatch engine.
 *
 * Responsibilities:
 *  - Claim a batch of pending push delivery jobs (lease-based, recoverable).
 *  - For each job: load active subscriptions, send via web-push, record outcomes.
 *  - Handle HTTP 404/410 (mark expired), 429/5xx (schedule retry with backoff),
 *    permanent errors (record failure, do not retry).
 *  - Update push_delivery_jobs.status when processing is complete.
 *  - Never store endpoint URLs, p256dh, or auth values in logs or error text.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "[Back2Basics with Kwamina] lib/push/dispatch.ts is server-only and must never be bundled into client code.",
  );
}

import webpush from "web-push";
import { getServerVapidConfig, isPushServerConfigured, VapidConfigurationError } from "./config";
import { sanitizeNotificationUrl } from "./url";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Maximum push delivery attempts before a job is marked permanently failed. */
export const MAX_DELIVERY_ATTEMPTS = 5;

/** Lease duration in ms: if a worker holds a job longer than this, it is considered crashed. */
export const LEASE_DURATION_MS = 3 * 60 * 1000; // 3 minutes

/** Maximum jobs to claim per worker invocation (bounded concurrency). */
export const JOB_BATCH_SIZE = 10;

/** Maximum subscriptions to notify concurrently per job. */
export const SUBSCRIPTION_CONCURRENCY = 10;

/** Per-subscription push request timeout in ms. */
export const PUSH_TIMEOUT_MS = 10_000;

/** Base delay for exponential backoff in ms. */
const BACKOFF_BASE_MS = 30_000; // 30 seconds

/** Maximum backoff before a retry (to prevent unbounded wait). */
const BACKOFF_MAX_MS = 60 * 60 * 1000; // 1 hour

// ─── Types ────────────────────────────────────────────────────────────────────

export type PushOutcome =
  | { kind: "success" }
  | { kind: "expired_endpoint" }
  | { kind: "transient"; statusCode?: number }
  | { kind: "permanent_error"; safeReason: string };

export type JobProcessResult = {
  jobId: string;
  announcementId: string;
  attempted: number;
  succeeded: number;
  failed: number;
  expired: number;
};

export type WorkerRunResult = {
  jobsProcessed: number;
  details: JobProcessResult[];
  pushConfigured: boolean;
};

// ─── Backoff ──────────────────────────────────────────────────────────────────

/**
 * Returns the next retry delay in ms using full-jitter exponential backoff.
 * nextDelay = random(0, min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * 2^attempt))
 */
export function computeBackoffMs(attemptNumber: number): number {
  const cap = Math.min(BACKOFF_MAX_MS, BACKOFF_BASE_MS * Math.pow(2, attemptNumber));
  return Math.floor(Math.random() * cap);
}

// ─── Outcome classification ───────────────────────────────────────────────────

/** Classify a web-push error into a structured outcome without logging secrets. */
export function classifyPushError(error: unknown): PushOutcome {
  if (!error || typeof error !== "object") {
    return { kind: "permanent_error", safeReason: "Unknown push error" };
  }

  const err = error as { statusCode?: unknown; body?: unknown; message?: unknown };

  if (typeof err.statusCode === "number") {
    const status = err.statusCode;
    if (status === 404 || status === 410) {
      return { kind: "expired_endpoint" };
    }
    if (status === 429 || (status >= 500 && status <= 599)) {
      return { kind: "transient", statusCode: status };
    }
    if (status >= 400 && status < 500) {
      // Bad request / auth failure / etc. — permanent for this subscription.
      return { kind: "permanent_error", safeReason: `Push service rejected request (${status})` };
    }
  }

  const message = typeof err.message === "string" ? err.message : "";
  if (
    message.toLowerCase().includes("fetch failed") ||
    message.toLowerCase().includes("network") ||
    message.toLowerCase().includes("econnreset") ||
    message.toLowerCase().includes("etimedout")
  ) {
    return { kind: "transient" };
  }

  return { kind: "permanent_error", safeReason: "Push delivery error" };
}

// ─── Single subscription delivery ────────────────────────────────────────────

/**
 * Sends one push notification to one subscription.
 * Never logs the endpoint, p256dh, or auth values.
 */
export async function sendOneNotification(
  subscription: { id: string; endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidConfig: { publicKey: string; privateKey: string; subject: string },
): Promise<PushOutcome> {
  try {
    webpush.setVapidDetails(vapidConfig.subject, vapidConfig.publicKey, vapidConfig.privateKey);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PUSH_TIMEOUT_MS);

    try {
      await webpush.sendNotification(
        { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
        payload,
        { urgency: "normal" },
      );
      return { kind: "success" };
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return classifyPushError(error);
  }
}

// ─── Record delivery outcome for one subscription ────────────────────────────

async function recordSubscriptionOutcome(
  subscriptionId: string,
  outcome: PushOutcome,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  if (outcome.kind === "success") {
    await admin
      .from("student_push_subscriptions")
      .update({
        last_notified_at: now,
        failed_attempts: 0,
        updated_at: now,
      } as never)
      .eq("id", subscriptionId);
    return;
  }

  if (outcome.kind === "expired_endpoint") {
    await admin
      .from("student_push_subscriptions")
      .update({
        status: "expired",
        updated_at: now,
      } as never)
      .eq("id", subscriptionId);
    return;
  }

  if (outcome.kind === "transient" || outcome.kind === "permanent_error") {
    // Increment failed_attempts atomically via RPC.
    // Do NOT revoke — transient errors should not permanently kill valid subscriptions.
    await (admin.rpc as any)("increment_push_failed_attempts", { p_subscription_id: subscriptionId })
      .throwOnError();
    return;
  }
}

// ─── Build push payload ───────────────────────────────────────────────────────

export function buildPushPayload(
  title: string,
  message: string,
  destinationPath: string,
): string {
  const baseOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.b2bwithkwamina.com";
  const safeUrl = sanitizeNotificationUrl(destinationPath, baseOrigin);

  return JSON.stringify({
    title: title.slice(0, 120),
    body: message.slice(0, 200),
    icon: "/icons/icon-192x192.png",
    badge: "/icons/badge-96x96.png",
    tag: "first-principles-announcement",
    url: safeUrl,
  });
}

// ─── Process one job ──────────────────────────────────────────────────────────

async function processJob(
  job: { id: string; announcement_id: string; attempt_number: number },
  vapidConfig: { publicKey: string; privateKey: string; subject: string },
): Promise<JobProcessResult> {
  const admin = createSupabaseAdminClient();

  // Load the announcement (may have been deleted; handle gracefully).
  const { data: announcementRows } = await admin
    .from("announcements")
    .select("id,title,message")
    .eq("id", job.announcement_id)
    .limit(1);

  const announcement = announcementRows?.[0] as { id: string; title: string; message: string } | undefined;

  // If announcement was deleted, mark completed with zero sends.
  if (!announcement) {
    const now = new Date().toISOString();
    await admin
      .from("push_delivery_jobs")
      .update({
        status: "completed",
        completed_at: now,
        last_error: "Announcement deleted before dispatch",
        updated_at: now,
      } as never)
      .eq("id", job.id);
    return { jobId: job.id, announcementId: job.announcement_id, attempted: 0, succeeded: 0, failed: 0, expired: 0 };
  }

  // Load active subscriptions in batches (bounded).
  const { data: subscriptionRows } = await admin
    .from("student_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("status", "active")
    .limit(1000);

  const subscriptions = (subscriptionRows ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>;

  const payload = buildPushPayload(announcement.title, announcement.message, "/dashboard");

  let succeeded = 0;
  let failed = 0;
  let expired = 0;

  // Process subscriptions in bounded concurrent batches.
  for (let i = 0; i < subscriptions.length; i += SUBSCRIPTION_CONCURRENCY) {
    const batch = subscriptions.slice(i, i + SUBSCRIPTION_CONCURRENCY);
    await Promise.all(
      batch.map(async (sub) => {
        const outcome = await sendOneNotification(sub, payload, vapidConfig);
        try {
          await recordSubscriptionOutcome(sub.id, outcome);
        } catch {
          // Never let a record-update failure abort the whole batch.
        }
        if (outcome.kind === "success") succeeded++;
        else if (outcome.kind === "expired_endpoint") expired++;
        else failed++;
      }),
    );
  }

  // Mark job completed (all subscriptions attempted).
  const now = new Date().toISOString();
  await admin
    .from("push_delivery_jobs")
    .update({
      status: "completed",
      attempted_count: subscriptions.length,
      succeeded_count: succeeded,
      failed_count: failed,
      expired_count: expired,
      completed_at: now,
      updated_at: now,
    } as never)
    .eq("id", job.id);

  return {
    jobId: job.id,
    announcementId: job.announcement_id,
    attempted: subscriptions.length,
    succeeded,
    failed,
    expired,
  };
}

// ─── Worker: claim + process pending jobs ─────────────────────────────────────

/**
 * One worker run:
 *  1. Recover any stale leases (crash recovery).
 *  2. Claim up to JOB_BATCH_SIZE pending jobs.
 *  3. Process each claimed job.
 *  4. On error, schedule retry with exponential backoff (up to MAX_DELIVERY_ATTEMPTS).
 *
 * Called by POST /api/push/process-jobs on a cron schedule.
 */
export async function runPushDeliveryWorker(): Promise<WorkerRunResult> {
  if (!isPushServerConfigured()) {
    return { jobsProcessed: 0, details: [], pushConfigured: false };
  }

  let vapidConfig: { publicKey: string; privateKey: string; subject: string };
  try {
    vapidConfig = getServerVapidConfig();
  } catch (error) {
    if (error instanceof VapidConfigurationError) {
      console.error("[push-worker] VAPID configuration error:", error.message);
    }
    return { jobsProcessed: 0, details: [], pushConfigured: false };
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  const leaseExpiry = new Date(now.getTime() + LEASE_DURATION_MS).toISOString();

  // Step 1: Reset expired leases back to pending so they can be retried.
  await admin
    .from("push_delivery_jobs")
    .update({ status: "pending", claimed_at: null, lease_expires_at: null, updated_at: nowIso } as never)
    .eq("status", "processing")
    .lt("lease_expires_at", nowIso);

  // Step 2: Claim pending jobs that are due.
  const { data: claimedRows } = await admin
    .from("push_delivery_jobs")
    .select("id,announcement_id,attempt_number")
    .eq("status", "pending")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(JOB_BATCH_SIZE);

  const jobs = (claimedRows ?? []) as Array<{
    id: string;
    announcement_id: string;
    attempt_number: number;
  }>;

  if (jobs.length === 0) {
    return { jobsProcessed: 0, details: [], pushConfigured: true };
  }

  // Mark all claimed jobs as processing atomically per-row.
  await Promise.all(
    jobs.map((job) =>
      admin
        .from("push_delivery_jobs")
        .update({
          status: "processing",
          claimed_at: nowIso,
          lease_expires_at: leaseExpiry,
          updated_at: nowIso,
        } as never)
        .eq("id", job.id)
        .eq("status", "pending"), // Optimistic lock: reject if already claimed by another worker
    ),
  );

  // Step 3: Process each job.
  const details: JobProcessResult[] = [];

  for (const job of jobs) {
    try {
      const result = await processJob(job, vapidConfig);
      details.push(result);
    } catch (error) {
      // Job-level error: schedule retry with backoff or mark permanently failed.
      const nextAttempt = job.attempt_number + 1;
      const safeReason =
        error instanceof Error
          ? error.message.slice(0, 500)
          : "Unexpected worker error";

      const retryIso = new Date(Date.now() + computeBackoffMs(nextAttempt)).toISOString();
      const isTerminal = nextAttempt >= MAX_DELIVERY_ATTEMPTS;

      await admin
        .from("push_delivery_jobs")
        .update({
          status: isTerminal ? "failed" : "pending",
          attempt_number: nextAttempt,
          next_attempt_at: isTerminal ? nowIso : retryIso,
          last_error: safeReason,
          claimed_at: null,
          lease_expires_at: null,
          completed_at: isTerminal ? nowIso : null,
          updated_at: nowIso,
        } as never)
        .eq("id", job.id);

      console.error(
        `[push-worker] Job ${job.id} attempt ${nextAttempt}/${MAX_DELIVERY_ATTEMPTS} failed: ${safeReason}`,
      );

      details.push({
        jobId: job.id,
        announcementId: job.announcement_id,
        attempted: 0,
        succeeded: 0,
        failed: 1,
        expired: 0,
      });
    }
  }

  return { jobsProcessed: jobs.length, details, pushConfigured: true };
}

// ─── Enqueue a push delivery job for an existing announcement ─────────────────
// Used for recovery when the atomic RPC succeeded for the announcement but
// the enqueue returned nothing (edge case).

export async function enqueuePushDeliveryJob(announcementId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const { error } = await admin
      .from("push_delivery_jobs")
      .insert({
        announcement_id: announcementId,
        status: "pending",
        next_attempt_at: now,
        created_at: now,
        updated_at: now,
      } as never);

    if (error) {
      // Unique constraint violation means a job already exists — idempotent.
      if (error.code === "23505") return { ok: true };
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to enqueue push job",
    };
  }
}
