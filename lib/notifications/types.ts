export type Announcement = {
  id: string;
  title: string;
  message: string;
  sender_id: string;
  created_at: string;
};

export type StudentAnnouncement = Announcement & {
  readAt: string | null;
};

export type AnnouncementReadState = {
  announcement_id: string;
  read_at: string;
};

export type NotificationDataResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
