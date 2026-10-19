import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { StudentAnnouncement } from "@/lib/notifications/types";

/** Fixed flags show in the student's notification bell under ids that start with this. */
export const FLAG_NOTICE_PREFIX = "flag:";

type NoticeRow = { id: string; title: string; location: string; resolution: string | null; resolved_at: string | null; student_seen_at: string | null };

/** "Your flag was fixed" notices for the signed-in student (their own rows only, via RLS). */
export async function getMyFlagNotices(): Promise<StudentAnnouncement[]> {
  try {
    const client = await createSupabaseServerClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return [];
    const { data, error } = await client
      .from("content_flags" as never)
      .select("id,title,location,resolution,resolved_at,student_seen_at")
      .eq("user_id", auth.user.id)
      .eq("status", "fixed")
      .eq("notify", true)
      .order("resolved_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return ((data ?? []) as NoticeRow[]).map((row) => ({
      id: `${FLAG_NOTICE_PREFIX}${row.id}`,
      title: "Thanks, your flag was fixed",
      message: `${row.title} (${row.location}).${row.resolution ? ` What changed: ${row.resolution}` : ""}`,
      sender_id: "Back2Basics team",
      created_at: row.resolved_at ?? new Date().toISOString(),
      readAt: row.student_seen_at,
    }));
  } catch (error) {
    console.error("[flags] Could not load flag notices:", error);
    return [];
  }
}

export async function markMyFlagNoticesSeen(noticeIds: string[]): Promise<void> {
  const ids = noticeIds.filter((id) => id.startsWith(FLAG_NOTICE_PREFIX)).map((id) => id.slice(FLAG_NOTICE_PREFIX.length)).slice(0, 100);
  if (!ids.length) return;
  try {
    const client = await createSupabaseServerClient();
    const { data: auth } = await client.auth.getUser();
    if (!auth.user) return;
    await client
      .from("content_flags" as never)
      .update({ student_seen_at: new Date().toISOString() } as never)
      .in("id", ids)
      .eq("user_id", auth.user.id)
      .is("student_seen_at", null);
  } catch (error) {
    console.error("[flags] Could not mark flag notices seen:", error);
  }
}
