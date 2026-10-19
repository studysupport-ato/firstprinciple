"use server";

import { FLAG_NOTICE_PREFIX, getMyFlagNotices, markMyFlagNoticesSeen } from "@/lib/flags/studentNotices";
import {
  getCurrentStudentAnnouncements,
  getCurrentStudentAnnouncementReadState,
  markCurrentStudentAnnouncementRead,
  markCurrentStudentAnnouncementsRead,
} from "./studentNotifications";

export async function getCurrentStudentAnnouncementsAction() {
  const [announcements, flagNotices] = await Promise.all([getCurrentStudentAnnouncements(), getMyFlagNotices()]);
  if (!announcements.ok || flagNotices.length === 0) return announcements;
  // "Your flag was fixed" notices sit in the same list, newest first.
  const data = [...announcements.data, ...flagNotices].sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { ok: true as const, data };
}

export async function getCurrentStudentAnnouncementReadStateAction() {
  return getCurrentStudentAnnouncementReadState();
}

export async function markCurrentStudentAnnouncementReadAction(announcementId: string) {
  if (announcementId.startsWith(FLAG_NOTICE_PREFIX)) {
    await markMyFlagNoticesSeen([announcementId]);
    return { ok: true as const, data: { announcement_id: announcementId, read_at: new Date().toISOString() } };
  }
  return markCurrentStudentAnnouncementRead(announcementId);
}

export async function markCurrentStudentAnnouncementsReadAction(announcementIds: string[]) {
  const flagIds = announcementIds.filter((id) => typeof id === "string" && id.startsWith(FLAG_NOTICE_PREFIX));
  const rest = announcementIds.filter((id) => !flagIds.includes(id));
  if (flagIds.length) await markMyFlagNoticesSeen(flagIds);
  const result = await markCurrentStudentAnnouncementsRead(rest);
  if (!result.ok || !flagIds.length) return result;
  const readAt = new Date().toISOString();
  return { ok: true as const, data: [...result.data, ...flagIds.map((id) => ({ announcement_id: id, read_at: readAt }))] };
}
