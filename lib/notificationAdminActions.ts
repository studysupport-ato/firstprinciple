"use server";

import { revalidatePath } from "next/cache";

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import type { AdminActionResult } from "@/lib/content/adminContract";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import type { Announcement } from "@/lib/notifications/types";
import { announcementRequestSignal, getAnnouncementOperationError } from "@/lib/notifications/adminErrors";
import { validateAnnouncementContent } from "@/lib/notifications/validation";

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

export async function sendAnnouncementAction(input: unknown): Promise<AdminActionResult<Announcement>> {
  return runAdminAction(async (senderId) => {
    const validated = validateAnnouncementContent(input);
    if (!validated.ok) throw new Error(validated.error);

    const { data, error } = await createSupabaseAdminClient()
      .from("announcements")
      .insert({ ...validated.data, sender_id: senderId } as never)
      .select("id,title,message,sender_id,created_at")
      .abortSignal(announcementRequestSignal())
      .single();

    if (error) throw error;
    revalidatePath("/admin/notifications");
    return data;
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
