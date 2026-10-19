import type { StudentAnnouncement } from "./types";

export class AnnouncementEventTracker {
  private readonly seenIds = new Set<string>();

  seed(announcements: StudentAnnouncement[]) {
    for (const announcement of announcements) this.seenIds.add(announcement.id);
  }

  observeSnapshot(announcements: StudentAnnouncement[]) {
    const unseen = announcements.filter(({ id }) => !this.seenIds.has(id));
    this.seed(announcements);
    return unseen;
  }

  acceptNewAnnouncement(announcementId: string) {
    if (this.seenIds.has(announcementId)) return false;
    this.seenIds.add(announcementId);
    return true;
  }
}

export function mergeAnnouncementSnapshot(
  current: StudentAnnouncement[],
  incoming: StudentAnnouncement[],
): StudentAnnouncement[] {
  const currentById = new Map(current.map((announcement) => [announcement.id, announcement]));
  const incomingIds = new Set(incoming.map((announcement) => announcement.id));

  return [
    ...incoming.map((announcement) => {
      const existing = currentById.get(announcement.id);
      if (!existing) return announcement;
      return {
        ...announcement,
        // Keep a pending optimistic read until the persisted snapshot confirms it.
        readAt: announcement.readAt ?? existing.readAt,
      };
    }),
    ...current.filter((announcement) => !incomingIds.has(announcement.id)),
  ].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

export function removeAnnouncementFromSnapshot(
  announcements: StudentAnnouncement[],
  announcementId: string,
): StudentAnnouncement[] {
  return announcements.filter(({ id }) => id !== announcementId);
}

export function shouldSubscribeToStudentNotifications(
  authenticated: boolean | null,
  studentId: string | null | undefined,
  studentLoading: boolean,
) {
  return authenticated === true && Boolean(studentId) && !studentLoading;
}

export function notificationIdentityKey(authUserId: string | null, studentId: string | null | undefined) {
  return authUserId && studentId ? `${authUserId}:${studentId}` : null;
}

export function unreadBadgeLabel(count: number): string | null {
  if (count <= 0) return null;
  return count > 99 ? "99+" : String(count);
}
