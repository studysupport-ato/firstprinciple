"use server";

import { revalidatePath } from "next/cache";

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import type { AdminActionResult } from "@/lib/content/adminContract";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/notifications/types";
import { announcementRequestSignal, getAnnouncementOperationError } from "@/lib/notifications/adminErrors";
import { validateAnnouncementContent } from "@/lib/notifications/validation";
import { isPushServerConfigured } from "@/lib/push/config";

async function runAdminAction<T>(operation: (senderId: string) => Promise<T>): Promise<AdminActionResult<T>> {
  let senderId: string;
  try {
    const session = await requireAdmin();
    senderId = session.subject;
  } catch (error) {
    if (error instanceof AdminUnauthorizedError) {
      console.warn("[notification admin action denied] Missing or invalid admin session.");
    } else {
      console.error("[notification admin action denied] Admin guard failed:", error);
    }
    return { ok: false, error: "Unauthorized. A valid admin session is required." };
  }

  try {
    return { ok: true, data: await operation(senderId) };
  } catch (error) {
    console.error("[notification admin action failed]", error);
    return {
      ok: false,
      error: getAnnouncementOperationError(error),
    };
  }
}

export async function getAdminAnnouncementsAction(): Promise<AdminActionResult<Announcement[]>> {
  return runAdminAction(async () => {
    const { data, error } = await createSupabaseAdminClient()
      .from("announcements")
      .select("id,title,message,sender_id,created_at")
      .order("created_at", { ascending: false })
      .limit(25)
      .abortSignal(announcementRequestSignal());
    if (error) throw error;
    return data ?? [];
  });
}

export type SendAnnouncementResult = Announcement & {
  /** Whether a push delivery job was successfully enqueued. */
  pushQueued: boolean;
  /** If push is configured but job enqueue failed, describes the safe recovery path. */
  pushEnqueueError?: string;
};

/**
 * Publishes an announcement and atomically enqueues a push delivery job.
 *
 * Return values:
 *  - ok: true  + pushQueued: true  → announcement saved, push job queued (normal)
 *  - ok: true  + pushQueued: false → announcement saved, push not configured (no VAPID keys)
 *  - ok: true  + pushQueued: false + pushEnqueueError → announcement saved, job enqueue failed
 *  - ok: false → announcement was NOT saved (database error)
 *
 * The admin UI must never lose the announcement without reporting it.
 * If the atomic RPC returns no rows but we detect a database error, we propagate it.
 */
export async function sendAnnouncementAction(
  input: unknown,
): Promise<AdminActionResult<SendAnnouncementResult>> {
  return runAdminAction(async (senderId) => {
    const validated = validateAnnouncementContent(input);
    if (!validated.ok) throw new Error(validated.error);

    const pushConfigured = isPushServerConfigured();

    // Use the atomic RPC that inserts announcement + push delivery job in one transaction.
    // If push is not configured, we pass p_enqueue_push=false to skip the job insert.
    const { data, error } = await (createSupabaseAdminClient().rpc as any)(
      "create_announcement_with_push_job",
      {
        p_title: validated.data.title,
        p_message: validated.data.message,
        p_sender_id: senderId,
        p_enqueue_push: pushConfigured,
      },
    ).abortSignal(announcementRequestSignal());

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as Array<{
      id: string;
      title: string;
      message: string;
      sender_id: string;
      created_at: string;
    }>;

    if (rows.length === 0) {
      throw new Error("Announcement insert returned no data. The record may not have been saved.");
    }

    const row = rows[0];

    // On Vercel Free, cron only runs once daily.
    // Trigger the worker immediately upon announcement publish so students receive pushes instantly!
    if (pushConfigured) {
      try {
        const { runPushDeliveryWorker } = await import("@/lib/push/dispatch");
        await runPushDeliveryWorker();
      } catch (workerError) {
        // Safe: announcement and outbox job are already persisted atomically in Supabase.
        // Daily cron (or any subsequent trigger) will recover and dispatch the pending job.
        console.error("[push] Immediate worker dispatch encountered an error; job remains in outbox for retry:", workerError);
      }
    }

    revalidatePath("/admin/notifications");
    return {
      id: row.id,
      title: row.title,
      message: row.message,
      sender_id: row.sender_id,
      created_at: row.created_at,
      pushQueued: pushConfigured,
    } satisfies SendAnnouncementResult;
  });
}

export async function deleteAnnouncementAction(input: unknown): Promise<AdminActionResult<{ id: string }>> {
  return runAdminAction(async () => {
    if (typeof input !== "string" || !input.trim() || input.trim().length > 200) {
      throw new Error("Select a valid announcement to delete.");
    }

    const id = input.trim();
    const { count, error } = await createSupabaseAdminClient()
      .from("announcements")
      .delete({ count: "exact" })
      .eq("id", id)
      .abortSignal(announcementRequestSignal());

    if (error) throw error;
    if (count !== 1) throw new Error("This announcement no longer exists. Refresh the list.");

    revalidatePath("/admin/notifications");
    return { id };
  });
}
