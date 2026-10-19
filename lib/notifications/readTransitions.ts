import type { StudentAnnouncement } from "./types";

export function setAnnouncementsRead(
  announcements: StudentAnnouncement[],
  ids: Set<string>,
  readAt: string,
): StudentAnnouncement[] {
  return announcements.map((announcement) =>
    ids.has(announcement.id) ? { ...announcement, readAt } : announcement,
  );
}

export function restoreAnnouncementReadState(
  announcements: StudentAnnouncement[],
  previousReadAtById: Map<string, string | null>,
): StudentAnnouncement[] {
  return announcements.map((announcement) =>
    previousReadAtById.has(announcement.id)
      ? { ...announcement, readAt: previousReadAtById.get(announcement.id) ?? null }
      : announcement,
  );
}
