"use server";

import {
  getCurrentStudentAnnouncements,
  getCurrentStudentAnnouncementReadState,
  markCurrentStudentAnnouncementRead,
  markCurrentStudentAnnouncementsRead,
} from "./studentNotifications";

export async function getCurrentStudentAnnouncementsAction() {
  return getCurrentStudentAnnouncements();
}

export async function getCurrentStudentAnnouncementReadStateAction() {
  return getCurrentStudentAnnouncementReadState();
}

export async function markCurrentStudentAnnouncementReadAction(announcementId: string) {
  return markCurrentStudentAnnouncementRead(announcementId);
}

export async function markCurrentStudentAnnouncementsReadAction(announcementIds: string[]) {
  return markCurrentStudentAnnouncementsRead(announcementIds);
}
