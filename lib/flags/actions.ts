"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FLAG_REASONS, type FlagRecord, type FlagResult, type FlagStatus, type FlagSubmission, type FlagTargetType } from "./shared";

type FlagRow = {
  id: string;
  target_type: FlagTargetType;
  target_key: string;
  course_id: string | null;
  title: string;
  location: string;
  link: string | null;
  reason: string;
  note: string | null;
  user_id: string | null;
  reporter_name: string | null;
  status: FlagStatus;
  resolution: string | null;
  notify: boolean;
  resolved_at: string | null;
  created_at: string;
};

const TYPES: FlagTargetType[] = ["lesson", "question", "video", "playlist"];
const STATUSES: FlagStatus[] = ["open", "in_progress", "fixed", "dismissed"];
/** At most this many flags from one person (or one network address when signed out) per hour. */
const HOURLY_LIMIT = 20;

function table() {
  // content_flags is not in the generated Database types yet.
  return createSupabaseAdminClient().from("content_flags" as never);
}

function clip(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toRecord(row: FlagRow): FlagRecord {
  return {
    id: row.id,
    targetType: row.target_type,
    targetKey: row.target_key,
    courseId: row.course_id,
    title: row.title,
    location: row.location,
    link: row.link,
    reason: row.reason,
    note: row.note,
    reporterName: row.reporter_name,
    signedIn: Boolean(row.user_id),
    status: row.status,
    resolution: row.resolution,
    notify: row.notify,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
  };
}

/** A student (signed in or not) reports a problem. */
export async function submitFlagAction(input: FlagSubmission): Promise<FlagResult<{ id: string }>> {
  try {
    const type = input?.type;
    if (!TYPES.includes(type)) return { ok: false, error: "Unknown item." };
    const reason = clip(input.reason, 80);
    if (!FLAG_REASONS[type].includes(reason)) return { ok: false, error: "Pick what is wrong." };
    const key = clip(input.key, 400);
    const title = clip(input.title, 300) || "Untitled";
    const location = clip(input.location, 400) || title;
    if (!key) return { ok: false, error: "Unknown item." };
    const link = clip(input.link, 400);
    const note = clip(input.note, 1000);

    let userId: string | null = null;
    let reporterName: string | null = null;
    try {
      const client = await createSupabaseServerClient();
      const { data } = await client.auth.getUser();
      if (data.user) {
        userId = data.user.id;
        const { data: student } = await client.from("students").select("display_name").eq("auth_user_id", data.user.id).maybeSingle();
        reporterName = (student as { display_name?: string } | null)?.display_name?.trim() || data.user.email || null;
      }
    } catch {
      // Signed out: the flag is still accepted.
    }

    const requestHeaders = await headers();
    const address = (requestHeaders.get("x-forwarded-for") ?? "").split(",")[0].trim() || requestHeaders.get("x-real-ip") || "unknown";
    const reporterHash = createHash("sha256").update(userId ? `user:${userId}` : `ip:${address}`).digest("hex").slice(0, 32);

    const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await table().select("id", { count: "exact", head: true }).eq("reporter_hash", reporterHash).gte("created_at", since);
    if (countError) throw countError;
    if ((count ?? 0) >= HOURLY_LIMIT) return { ok: false, error: "You have sent a lot of flags. Please try again in an hour." };

    const { data, error } = await table()
      .insert({
        target_type: type,
        target_key: key,
        course_id: clip(input.courseId, 80) || null,
        title,
        location,
        link: link.startsWith("/") ? link : null,
        reason,
        note: note || null,
        user_id: userId,
        reporter_name: reporterName,
        reporter_hash: reporterHash,
      } as never)
      .select("id")
      .single();
    if (error) throw error;
    return { ok: true, data: { id: (data as { id: string }).id } };
  } catch (error) {
    console.error("[flags] Could not save a flag:", error);
    return { ok: false, error: "The flag could not be sent. Please try again." };
  }
}

async function guard(): Promise<string | null> {
  try {
    await requireAdmin();
    return null;
  } catch (error) {
    if (!(error instanceof AdminUnauthorizedError)) console.error("[flags] Admin guard failed:", error);
    return "Unauthorized. A valid admin session is required.";
  }
}

/** Admin: every flag, newest first (the page groups them). */
export async function listFlagsAction(): Promise<FlagResult<FlagRecord[]>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  try {
    const { data, error } = await table()
      .select("id,target_type,target_key,course_id,title,location,link,reason,note,user_id,reporter_name,status,resolution,notify,resolved_at,created_at")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw error;
    return { ok: true, data: ((data ?? []) as FlagRow[]).map(toRecord) };
  } catch (error) {
    console.error("[flags] Could not list flags:", error);
    return { ok: false, error: "Flags could not be loaded." };
  }
}

/** Admin: open flags count for the menu badge. */
export async function countOpenFlagsAction(): Promise<FlagResult<number>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  try {
    const { count, error } = await table().select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]);
    if (error) throw error;
    return { ok: true, data: count ?? 0 };
  } catch (error) {
    console.error("[flags] Could not count flags:", error);
    return { ok: false, error: "Flags could not be counted." };
  }
}

/** Admin: move every unresolved report of one item (or, from the Fixed tab, the whole item) to a new status. */
export async function updateFlagGroupAction(
  targetKey: string,
  update: { status: FlagStatus; resolution?: string; notify?: boolean },
): Promise<FlagResult<number>> {
  const denied = await guard();
  if (denied) return { ok: false, error: denied };
  if (!STATUSES.includes(update.status)) return { ok: false, error: "Unknown status." };
  try {
    const done = update.status === "fixed" || update.status === "dismissed";
    const patch: Record<string, unknown> = { status: update.status, updated_at: new Date().toISOString() };
    if (done) {
      patch.resolved_at = new Date().toISOString();
      patch.resolution = clip(update.resolution, 1000) || null;
      patch.notify = update.notify !== false && update.status === "fixed";
      patch.student_seen_at = null;
    } else {
      patch.resolved_at = null;
    }
    const { data, error } = await table()
      .update(patch as never)
      .eq("target_key", clip(targetKey, 400))
      .in("status", done ? ["open", "in_progress"] : ["open", "in_progress", "fixed", "dismissed"])
      .select("id");
    if (error) throw error;
    return { ok: true, data: (data ?? []).length };
  } catch (error) {
    console.error("[flags] Could not update flags:", error);
    return { ok: false, error: "The flags could not be updated." };
  }
}
