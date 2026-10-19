import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, describe, it } from "node:test";

import { createAdminSessionToken, verifyAdminSessionToken } from "../lib/adminSession";
import { attachAnnouncementReadState, countUnreadAnnouncements } from "../lib/notifications/readState";
import { AnnouncementEventTracker, mergeAnnouncementSnapshot, notificationIdentityKey, shouldSubscribeToStudentNotifications, unreadBadgeLabel } from "../lib/notifications/liveState";
import { restoreAnnouncementReadState, setAnnouncementsRead } from "../lib/notifications/readTransitions";
import { subscribeToStudentNotifications } from "../lib/notifications/realtime";
import { validateAnnouncementContent } from "../lib/notifications/validation";
import { announcementRequestSignal, getAnnouncementOperationError } from "../lib/notifications/adminErrors";
import type { Announcement } from "../lib/notifications/types";
import type { Database } from "../lib/supabase/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const previousAdminSecret = process.env.ADMIN_SESSION_SECRET;
process.env.ADMIN_SESSION_SECRET = "notification-tests-only-secret";

after(() => {
  if (previousAdminSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = previousAdminSecret;
});

const sampleAnnouncements: Announcement[] = [
  { id: "a1", title: "One", message: "First", sender_id: "admin", created_at: "2026-10-18T10:00:00Z" },
  { id: "a2", title: "Two", message: "Second", sender_id: "admin", created_at: "2026-10-18T11:00:00Z" },
];

describe("announcement content validation", () => {
  it("trims valid content before persistence", () => {
    assert.deepEqual(validateAnnouncementContent({ title: "  Update  ", message: "  New material is live.  " }), {
      ok: true,
      data: { title: "Update", message: "New material is live." },
    });
  });

  it("rejects missing, blank, and over-limit content", () => {
    assert.equal(validateAnnouncementContent(null).ok, false);
    assert.equal(validateAnnouncementContent({ title: " ", message: "body" }).ok, false);
    assert.equal(validateAnnouncementContent({ title: "x".repeat(121), message: "body" }).ok, false);
    assert.equal(validateAnnouncementContent({ title: "title", message: "x".repeat(2001) }).ok, false);
  });
});

describe("announcement server errors", () => {
  it("limits database request duration and describes timeout and network failures", () => {
    assert.ok(announcementRequestSignal() instanceof AbortSignal);
    assert.match(
      getAnnouncementOperationError({ name: "TimeoutError", message: "The operation timed out" }),
      /timed out.*Check recent announcements/i,
    );
    assert.match(
      getAnnouncementOperationError({
        message: "TypeError: fetch failed",
        details: "ERR_HTTP2_STREAM_ERROR",
        code: "",
      }),
      /connection to Supabase failed.*avoid a duplicate send/i,
    );
  });

  it("preserves useful structured database errors instead of returning a generic fallback", () => {
    assert.equal(
      getAnnouncementOperationError({ message: "new row violates row-level security policy", code: "42501" }),
      "new row violates row-level security policy",
    );
    assert.equal(getAnnouncementOperationError({ message: "  " }), "The notification operation failed.");
  });
});

describe("admin session authorization", () => {
  it("accepts only a signed, unexpired admin session", () => {
    const valid = createAdminSessionToken();
    assert.equal(verifyAdminSessionToken(valid)?.subject, "admin");
    assert.equal(verifyAdminSessionToken(`${valid}tampered`), null);
    assert.equal(verifyAdminSessionToken(null), null);
    assert.equal(verifyAdminSessionToken(createAdminSessionToken(Date.now() - 9 * 60 * 60 * 1000)), null);
  });
});

describe("announcement read state", () => {
  it("marks only announcements with this student's read-state rows as read", () => {
    const withReadState = attachAnnouncementReadState(sampleAnnouncements, [
      { announcement_id: "a1", read_at: "2026-10-18T11:30:00Z" },
    ]);
    assert.equal(withReadState[0].readAt, "2026-10-18T11:30:00Z");
    assert.equal(withReadState[1].readAt, null);
    assert.equal(countUnreadAnnouncements(withReadState), 1);
    assert.equal(countUnreadAnnouncements(attachAnnouncementReadState([], [])), 0);
  });

  it("updates unread counts promptly and restores state after a failed read mutation", () => {
    const initial = attachAnnouncementReadState(sampleAnnouncements, []);
    const previous = new Map(initial.map(({ id, readAt }) => [id, readAt]));
    const optimistic = setAnnouncementsRead(initial, new Set(["a1", "a2"]), "2026-10-18T12:00:00Z");
    assert.equal(countUnreadAnnouncements(optimistic), 0);

    const restored = restoreAnnouncementReadState(optimistic, previous);
    assert.equal(countUnreadAnnouncements(restored), 2);
    assert.deepEqual(restored.map(({ readAt }) => readAt), [null, null]);
  });

  it("merges refreshed data without losing a pending optimistic read", () => {
    const optimistic = attachAnnouncementReadState(sampleAnnouncements, [
      { announcement_id: "a1", read_at: "2026-10-18T12:00:00Z" },
    ]);
    const staleSnapshot = attachAnnouncementReadState(sampleAnnouncements, []);
    const merged = mergeAnnouncementSnapshot(optimistic, staleSnapshot);
    assert.equal(merged.find(({ id }) => id === "a1")?.readAt, "2026-10-18T12:00:00Z");
  });
});

describe("live announcement events", () => {
  it("does not ring for initial records and accepts a genuinely new event only once", () => {
    const tracker = new AnnouncementEventTracker();
    tracker.seed(attachAnnouncementReadState(sampleAnnouncements, []));
    assert.equal(tracker.acceptNewAnnouncement("a1"), false);
    assert.equal(tracker.acceptNewAnnouncement("a3"), true);
    assert.equal(tracker.acceptNewAnnouncement("a3"), false);
  });

  it("keeps a reconnect snapshot from replaying seen announcements", () => {
    const tracker = new AnnouncementEventTracker();
    tracker.seed(attachAnnouncementReadState(sampleAnnouncements, []));
    const recovered = tracker.observeSnapshot(attachAnnouncementReadState([...sampleAnnouncements, {
      id: "a3", title: "Three", message: "Third", sender_id: "admin", created_at: "2026-10-18T12:00:00Z",
    }], []));
    assert.deepEqual(recovered.map(({ id }) => id), ["a3"]);
    assert.equal(tracker.acceptNewAnnouncement("a3"), false);
  });

  it("subscribes only after auth and mapped student identity resolve", () => {
    assert.equal(shouldSubscribeToStudentNotifications(null, null, true), false);
    assert.equal(shouldSubscribeToStudentNotifications(false, "student-1", false), false);
    assert.equal(shouldSubscribeToStudentNotifications(true, null, false), false);
    assert.equal(shouldSubscribeToStudentNotifications(true, "student-1", true), false);
    assert.equal(shouldSubscribeToStudentNotifications(true, "student-1", false), true);
    assert.notEqual(notificationIdentityKey("auth-1", "student-1"), notificationIdentityKey("auth-2", "student-2"));
    assert.equal(notificationIdentityKey(null, "student-1"), null);
    assert.equal(unreadBadgeLabel(1), "1");
    assert.equal(unreadBadgeLabel(99), "99");
    assert.equal(unreadBadgeLabel(100), "99+");
  });

  it("filters read-state changes by student and removes the same channel on cleanup", () => {
    const registrations: Array<{ filter: unknown; callback: (payload: { new: Record<string, unknown> }) => void }> = [];
    const statuses: Array<(status: string) => void> = [];
    const receivedStatuses: string[] = [];
    const channelNames: string[] = [];
    const channels: Array<{
      on(_type: string, filter: unknown, callback: (payload: { new: Record<string, unknown> }) => void): unknown;
      subscribe(callback: (status: string) => void): unknown;
    }> = [];
    const makeChannel = () => {
      const channel = {
      on(_type: string, filter: unknown, callback: (payload: { new: Record<string, unknown> }) => void) {
        registrations.push({ filter, callback });
        return this;
      },
      subscribe(callback: (status: string) => void) {
        statuses.push(callback);
        return this;
      },
      };
      channels.push(channel);
      return channel;
    };
    const removed: unknown[] = [];
    const client = {
      channel(name: string) {
        channelNames.push(name);
        return makeChannel();
      },
      removeChannel(target: unknown) {
        removed.push(target);
        return Promise.resolve("ok");
      },
    } as unknown as SupabaseClient<Database>;
    const received: string[] = [];
    const readChanges: number[] = [];
    const cleanup = subscribeToStudentNotifications(client, "student-1", {
      onAnnouncement: (id) => received.push(id),
      onReadStateChange: () => readChanges.push(1),
      onStatusChange: (status) => receivedStatuses.push(status),
    });
    const secondCleanup = subscribeToStudentNotifications(client, "student-2", {
      onAnnouncement: () => undefined,
      onReadStateChange: () => undefined,
      onStatusChange: () => undefined,
    });

    assert.equal(registrations.length, 4);
    assert.equal(channelNames.length, 2);
    assert.match(channelNames[0], /^student-notifications:student-1:/);
    assert.match(channelNames[1], /^student-notifications:student-2:/);
    assert.deepEqual(registrations[1].filter, {
      event: "*",
      schema: "public",
      table: "student_announcement_reads",
      filter: "student_id=eq.student-1",
    });
    registrations[0].callback({ new: { id: "a3" } });
    registrations[1].callback({ new: { student_id: "student-1" } });
    assert.deepEqual(received, ["a3"]);
    assert.equal(readChanges.length, 1);
    statuses[0]("SUBSCRIBED");
    assert.deepEqual(receivedStatuses, ["SUBSCRIBED"]);
    assert.equal(statuses.length, 2);
    cleanup();
    secondCleanup();
    assert.deepEqual(removed, channels);
  });
});

describe("notification interaction accessibility and motion", () => {
  it("provides reduced-motion styling and labelled keyboard controls", () => {
    const css = readFileSync(new URL("../app/notifications.css", import.meta.url), "utf8");
    const component = readFileSync(new URL("../components/platform/NotificationBell.tsx", import.meta.url), "utf8");
    assert.match(css, /prefers-reduced-motion:\s*reduce/);
    assert.match(component, /aria-expanded=\{panelOpen\}/);
    assert.match(component, /aria-label=\{badge \? `Notifications,/);
    assert.match(component, /event\.key === "Escape"/);
    assert.match(component, /role="alert"/);
  });
});

describe("notification row-level security migration", () => {
  const migration = readFileSync(
    new URL("../supabase/migrations/20261018120000_add_notifications.sql", import.meta.url),
    "utf8",
  );

  it("makes announcements student-readable but gives authenticated students no write grant or write policy", () => {
    assert.match(migration, /grant select on public\.announcements to authenticated/i);
    assert.doesNotMatch(migration, /grant (?:all|insert|update|delete)[^;]*public\.announcements to authenticated/i);
    assert.match(migration, /where s\.auth_user_id = auth\.uid\(\)::text/i);
    assert.doesNotMatch(migration, /create policy "[^"]+" on public\.announcements\s+for (?:insert|update|delete)/i);
  });

  it("restricts read-state select, insert, and update to the mapped students.id owner", () => {
    for (const action of ["select", "insert", "update"]) {
      const policyStart = migration.indexOf(`create policy "student_announcement_reads_${action}_own"`);
      const followingPolicy = migration.indexOf("create policy ", policyStart + 1);
      const policy = policyStart < 0
        ? ""
        : migration.slice(policyStart, followingPolicy < 0 ? undefined : followingPolicy);
      assert.ok(policy, `missing ${action} ownership policy`);
      assert.match(policy, /s\.id = student_announcement_reads\.student_id/i);
      assert.match(policy, /s\.auth_user_id = auth\.uid\(\)::text/i);
    }
    assert.doesNotMatch(migration, /create policy "[^"]+" on public\.student_announcement_reads\s+for delete/i);
  });

  it("adds only the notification tables to the existing Realtime publication", () => {
    const realtimeMigration = readFileSync(
      new URL("../supabase/migrations/20261018130000_enable_notification_realtime.sql", import.meta.url),
      "utf8",
    );
    assert.match(realtimeMigration, /pubname = 'supabase_realtime'/i);
    assert.match(realtimeMigration, /alter publication supabase_realtime add table public\.announcements/i);
    assert.match(realtimeMigration, /alter publication supabase_realtime add table public\.student_announcement_reads/i);
  });
});
