import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

export type NotificationRealtimeHandlers = {
  onAnnouncement: (announcementId: string) => void;
  onReadStateChange: () => void;
  onStatusChange: (status: string) => void;
};

export function subscribeToStudentNotifications(
  client: SupabaseClient<Database>,
  studentId: string,
  handlers: NotificationRealtimeHandlers,
): () => void {
  // React Strict Mode and auth changes can briefly overlap channel teardown
  // with a new subscription. Supabase channels cannot be reconfigured after
  // joining, so give each lifecycle its own topic rather than reusing one.
  const topic = `student-notifications:${studentId}:${globalThis.crypto.randomUUID()}`;
  const channel: RealtimeChannel = client
    .channel(topic)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "announcements" },
      (payload) => {
        const id = typeof payload.new.id === "string" ? payload.new.id : "";
        if (id) handlers.onAnnouncement(id);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "student_announcement_reads",
        filter: `student_id=eq.${studentId}`,
      },
      handlers.onReadStateChange,
    )
    .subscribe(handlers.onStatusChange);

  return () => {
    void client.removeChannel(channel);
  };
}
