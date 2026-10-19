/**
 * POST /api/push/process-jobs
 *
 * Cron-triggered push delivery worker endpoint.
 * Claims and processes pending push_delivery_jobs using a lease-based outbox.
 *
 * Security:
 *  - Requires a shared secret (PUSH_WORKER_SECRET) in the Authorization header.
 *  - Never exposes subscription endpoints, p256dh, or auth values in responses.
 *  - Returns only safe, aggregated statistics.
 *
 * Caller: Vercel Cron (vercel.json), which adds Authorization: Bearer <CRON_SECRET>
 * on Vercel, or your own scheduler calling with Authorization: Bearer <PUSH_WORKER_SECRET>.
 *
 * Environment variables required in production:
 *  - PUSH_WORKER_SECRET   — shared secret authorizing this endpoint
 *  - NEXT_PUBLIC_VAPID_PUBLIC_KEY — VAPID public key
 *  - VAPID_PRIVATE_KEY    — VAPID private key (server-only)
 *  - VAPID_SUBJECT        — Contact URI (mailto: or https://)
 */

import { type NextRequest, NextResponse } from "next/server";
import { runPushDeliveryWorker } from "@/lib/push/dispatch";

export const maxDuration = 60; // Vercel Functions: max execution time in seconds
export const dynamic = "force-dynamic";

function getWorkerSecret(): string | null {
  return process.env.PUSH_WORKER_SECRET?.trim() || process.env.CRON_SECRET?.trim() || null;
}

function verifyWorkerAuthorization(request: NextRequest): boolean {
  const secret = getWorkerSecret();
  if (!secret) {
    // If no secret is configured, refuse all requests.
    // This is fail-closed: an unprotected worker endpoint is a security risk.
    console.error("[push-worker] PUSH_WORKER_SECRET is not configured. Refusing request.");
    return false;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;

  if (!token) return false;

  // Constant-time comparison to prevent timing attacks.
  if (token.length !== secret.length) return false;
  let mismatch = 0;
  for (let i = 0; i < token.length; i++) {
    mismatch |= token.charCodeAt(i) ^ secret.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!verifyWorkerAuthorization(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runPushDeliveryWorker();

    return NextResponse.json({
      ok: true,
      pushConfigured: result.pushConfigured,
      jobsProcessed: result.jobsProcessed,
      summary: result.details.map((d) => ({
        jobId: d.jobId,
        announcementId: d.announcementId,
        attempted: d.attempted,
        succeeded: d.succeeded,
        failed: d.failed,
        expired: d.expired,
      })),
    });
  } catch (error) {
    const safeMessage = error instanceof Error ? error.message : "Worker run failed";
    console.error("[push-worker] Unhandled error during worker run:", safeMessage);
    return NextResponse.json({ ok: false, error: "Worker run failed" }, { status: 500 });
  }
}

// Reject all other HTTP methods explicitly.
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
