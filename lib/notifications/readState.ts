import type { Announcement, AnnouncementReadState, StudentAnnouncement } from "./types";

export function attachAnnouncementReadState(
  announcements: Announcement[],
  readStates: AnnouncementReadState[],
): StudentAnnouncement[] {
  const readAtByAnnouncementId = new Map(
    readStates.map(({ announcement_id, read_at }) => [announcement_id, read_at]),
  );

  return announcements.map((announcement) => ({
    ...announcement,
    readAt: readAtByAnnouncementId.get(announcement.id) ?? null,
  }));
}

export function countUnreadAnnouncements(announcements: StudentAnnouncement[]): number {
  return announcements.reduce((count, announcement) => count + (announcement.readAt === null ? 1 : 0), 0);
}
