import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { attachAnnouncementReadState, countUnreadAnnouncements } from "./readState";
import type { Announcement, AnnouncementReadState, NotificationDataResult, StudentAnnouncement } from "./types";

async function resolveStudentContext(): Promise<
  NotificationDataResult<{ client: Awaited<ReturnType<typeof createSupabaseServerClient>>; studentId: string }>
> {
  try {
    const client = await createSupabaseServerClient();
    const { data: auth, error: authError } = await client.auth.getUser();
    if (authError) return { ok: false, error: authError.message };
    if (!auth.user) return { ok: false, error: "Sign in to view announcements." };

    const { data: student, error: studentError } = await client
      .from("students")
      .select("id")
      .eq("auth_user_id", auth.user.id)
      .maybeSingle();
    if (studentError) return { ok: false, error: studentError.message };
    const studentRow = student as { id: string } | null;
    if (!studentRow) return { ok: false, error: "Your student profile could not be found." };

    return { ok: true, data: { client, studentId: studentRow.id } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Announcements could not be loaded.";
    console.error("[student notifications] Could not resolve student context:", error);
    return { ok: false, error: message };
  }
}

export async function getCurrentStudentAnnouncementReadState(): Promise<
  NotificationDataResult<AnnouncementReadState[]>
> {
  const context = await resolveStudentContext();
  if (!context.ok) return context;

  const { data, error } = await context.data.client
    .from("student_announcement_reads")
    .select("announcement_id,read_at")
    .eq("student_id", context.data.studentId)
    .order("read_at", { ascending: false });

  if (error) {
    console.error("[student notifications] Could not load read state:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ?? [] };
}

export async function getCurrentStudentAnnouncements(): Promise<NotificationDataResult<StudentAnnouncement[]>> {
  const context = await resolveStudentContext();
  if (!context.ok) return context;

  const { data: announcements, error: announcementsError } = await context.data.client
    .from("announcements")
    .select("id,title,message,sender_id,created_at")
    .order("created_at", { ascending: false });

  if (announcementsError) {
    console.error("[student notifications] Could not load announcements:", announcementsError);
    return { ok: false, error: announcementsError.message };
  }

  const rows = (announcements ?? []) as Announcement[];
  if (rows.length === 0) return { ok: true, data: [] };

  const { data: readStates, error: readStateError } = await context.data.client
    .from("student_announcement_reads")
    .select("announcement_id,read_at")
    .eq("student_id", context.data.studentId)
    .in("announcement_id", rows.map(({ id }) => id));

  if (readStateError) {
    console.error("[student notifications] Could not load announcement read state:", readStateError);
    return { ok: false, error: readStateError.message };
  }

  return {
    ok: true,
    data: attachAnnouncementReadState(rows, (readStates ?? []) as AnnouncementReadState[]),
  };
}

export async function getCurrentStudentUnreadAnnouncementCount(): Promise<NotificationDataResult<number>> {
  const announcements = await getCurrentStudentAnnouncements();
  if (!announcements.ok) return announcements;
  return { ok: true, data: countUnreadAnnouncements(announcements.data) };
}

export async function markCurrentStudentAnnouncementRead(
  announcementId: string,
): Promise<NotificationDataResult<AnnouncementReadState>> {
  if (!announcementId.trim()) return { ok: false, error: "An announcement id is required." };

  const context = await resolveStudentContext();
  if (!context.ok) return context;

  const { data: announcement, error: announcementError } = await context.data.client
    .from("announcements")
    .select("id")
    .eq("id", announcementId)
    .maybeSingle();
  if (announcementError) {
    console.error("[student notifications] Could not verify announcement access:", announcementError);
    return { ok: false, error: announcementError.message };
  }
  if (!announcement) return { ok: false, error: "This announcement is not available." };

  const { data, error } = await context.data.client
    .from("student_announcement_reads")
    .upsert(
      { student_id: context.data.studentId, announcement_id: announcementId } as never,
      { onConflict: "student_id,announcement_id" },
    )
    .select("announcement_id,read_at")
    .single();

  if (error) {
    console.error("[student notifications] Could not mark announcement read:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data };
}

export async function markCurrentStudentAnnouncementsRead(
  announcementIds: string[],
): Promise<NotificationDataResult<AnnouncementReadState[]>> {
  const uniqueIds = [...new Set(announcementIds.filter((id) => typeof id === "string" && id.trim()))];
  if (uniqueIds.length === 0) return { ok: true, data: [] };
  if (uniqueIds.length > 500) return { ok: false, error: "Too many announcements were selected." };

  const context = await resolveStudentContext();
  if (!context.ok) return context;

  const { data: availableAnnouncements, error: announcementsError } = await context.data.client
    .from("announcements")
    .select("id")
    .in("id", uniqueIds);
  if (announcementsError) {
    console.error("[student notifications] Could not verify announcements:", announcementsError);
    return { ok: false, error: announcementsError.message };
  }

  const availableIds = (availableAnnouncements ?? []).map(({ id }) => id);
  if (availableIds.length === 0) return { ok: true, data: [] };

  const { data: existingReads, error: readsError } = await context.data.client
    .from("student_announcement_reads")
    .select("announcement_id")
    .eq("student_id", context.data.studentId)
    .in("announcement_id", availableIds);
  if (readsError) {
    console.error("[student notifications] Could not load existing read state:", readsError);
    return { ok: false, error: readsError.message };
  }

  const alreadyRead = new Set((existingReads ?? []).map(({ announcement_id }) => announcement_id));
  const unreadIds = availableIds.filter((id) => !alreadyRead.has(id));
  if (unreadIds.length === 0) return { ok: true, data: [] };

  const readAt = new Date().toISOString();
  const { data, error } = await context.data.client
    .from("student_announcement_reads")
    .upsert(
      unreadIds.map((announcement_id) => ({
        student_id: context.data.studentId,
        announcement_id,
        read_at: readAt,
      })) as never,
      { onConflict: "student_id,announcement_id" },
    )
    .select("announcement_id,read_at");

  if (error) {
    console.error("[student notifications] Could not mark announcements read:", error);
    return { ok: false, error: error.message };
  }
  return { ok: true, data: data ?? [] };
}
