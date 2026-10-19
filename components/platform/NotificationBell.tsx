"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, Check, X } from "lucide-react";

import { useAuthSession } from "@/lib/auth/useAuthSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { subscribeToStudentNotifications } from "@/lib/notifications/realtime";
import {
  getCurrentStudentAnnouncementsAction,
  getCurrentStudentAnnouncementReadStateAction,
  markCurrentStudentAnnouncementReadAction,
  markCurrentStudentAnnouncementsReadAction,
} from "@/lib/notifications/studentActions";
import { AnnouncementEventTracker, mergeAnnouncementSnapshot, notificationIdentityKey, removeAnnouncementFromSnapshot, shouldSubscribeToStudentNotifications, unreadBadgeLabel } from "@/lib/notifications/liveState";
import { restoreAnnouncementReadState, setAnnouncementsRead } from "@/lib/notifications/readTransitions";
import type { AnnouncementReadState, StudentAnnouncement } from "@/lib/notifications/types";

function formatAnnouncementTime(timestamp: string) {
  const date = new Date(timestamp);
  const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  const ranges: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["week", 60 * 60 * 24 * 7],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const range = ranges.find(([, seconds]) => Math.abs(elapsedSeconds) >= seconds);
  if (!range) return relative.format(elapsedSeconds, "second");
  return relative.format(Math.round(elapsedSeconds / range[1]), range[0]);
}

export function NotificationBell({ variant = "button", compact = false }: { variant?: "button" | "sidebar"; compact?: boolean } = {}) {
  const inSidebar = variant === "sidebar";
  const { authenticated, student, studentLoading, user } = useAuthSession();
  const authUserId = user?.id ?? null;
  const studentId = student?.id ?? null;
  const identityKey = notificationIdentityKey(authUserId, studentId);
  const enabled = shouldSubscribeToStudentNotifications(authenticated, studentId, studentLoading);
  const [announcements, setAnnouncements] = useState<StudentAnnouncement[]>([]);
  const [announcementOwnerKey, setAnnouncementOwnerKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [mutatingIds, setMutatingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const activeIdentityKeyRef = useRef<string | null>(identityKey);
  activeIdentityKeyRef.current = identityKey;
  const currentAnnouncements = announcementOwnerKey === identityKey ? announcements : [];
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const ringingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const unreadCount = currentAnnouncements.filter(({ readAt }) => !readAt).length;
  const badge = unreadBadgeLabel(unreadCount);

  const refresh = useCallback(async () => {
    try {
      const result = await getCurrentStudentAnnouncementsAction();
      if (activeIdentityKeyRef.current !== identityKey) return null;
      if (!result.ok) {
        setError(result.error);
        return null;
      }
      setError(null);
      setAnnouncementOwnerKey(identityKey);
      setAnnouncements((current) => mergeAnnouncementSnapshot(current, result.data));
      return result.data;
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Notifications could not be loaded.";
      setError(message);
      return null;
    }
  }, [identityKey, studentId]);

  const refreshReadState = useCallback(async () => {
    try {
      const result = await getCurrentStudentAnnouncementReadStateAction();
      if (activeIdentityKeyRef.current !== identityKey) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const readAtById = new Map(
        (result.data as AnnouncementReadState[]).map(({ announcement_id, read_at }) => [announcement_id, read_at]),
      );
      setAnnouncements((current) => current.map((announcement) => ({
        ...announcement,
        readAt: readAtById.get(announcement.id) ?? announcement.readAt,
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Read status could not be refreshed.");
    }
  }, [identityKey, studentId]);

  const ringBell = useCallback(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setRinging(true);
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
    ringingTimer.current = setTimeout(() => setRinging(false), 900);
  }, []);

  useEffect(() => {
    if (!enabled || !studentId) {
      setAnnouncements([]);
      setAnnouncementOwnerKey(null);
      setPanelOpen(false);
      setError(null);
      return;
    }

    let active = true;
    let initialLoadComplete = false;
    let removeSubscription: (() => void) | null = null;
    let refreshInFlight: Promise<StudentAnnouncement[] | null> | null = null;
    let refreshQueued = false;
    const pendingInitialEventIds = new Set<string>();
    const tracker = new AnnouncementEventTracker();
    setAnnouncements([]);
    setAnnouncementOwnerKey(identityKey);
    setLoading(true);
    setError(null);
    setAnnouncementOwnerKey(identityKey);
    setMutationError(null);
    setMutatingIds(new Set());
    setMarkingAll(false);
    setPanelOpen(false);

    const refreshSnapshot = async (animateNew = false) => {
      if (!active) return null;
      if (refreshInFlight) {
        refreshQueued = true;
        return refreshInFlight;
      }
      refreshInFlight = (async () => {
        try {
          const snapshot = await getCurrentStudentAnnouncementsAction();
          if (!active) return null;
          if (!snapshot.ok) {
            setError(snapshot.error);
            return null;
          }
          setError(null);
          const unseen = tracker.observeSnapshot(snapshot.data);
          setAnnouncements((current) => mergeAnnouncementSnapshot(current, snapshot.data));
          if (animateNew && unseen.some(({ readAt }) => !readAt)) ringBell();
          return snapshot.data;
        } catch (loadError) {
          if (active) {
            console.error("[student notifications] Could not refresh announcements:", loadError);
            setError(loadError instanceof Error ? loadError.message : "Notifications could not be loaded.");
          }
          return null;
        }
      })();
      const result = await refreshInFlight;
      refreshInFlight = null;
      if (refreshQueued && active) {
        refreshQueued = false;
        void refreshSnapshot();
      }
      return result;
    };

    const handleAnnouncementInsert = (announcementId: string) => {
      if (!active || !announcementId) return;
      if (!initialLoadComplete) {
        pendingInitialEventIds.add(announcementId);
        return;
      }
      const isNew = tracker.acceptNewAnnouncement(announcementId);
      if (!isNew) return;
      void (async () => {
        let snapshot = await refreshSnapshot();
        if (active && !snapshot?.some(({ id }) => id === announcementId)) {
          snapshot = await refreshSnapshot();
        }
        if (!active || !snapshot) return;
        const persisted = snapshot.find(({ id }) => id === announcementId);
        if (persisted && !persisted.readAt) ringBell();
      })();
    };

    void (async () => {
      try {
        const client = createSupabaseBrowserClient();
        const { data: auth, error: authError } = await client.auth.getUser();
        if (!active) return;
        if (authError) throw authError;
        if (!auth.user || studentLoading || auth.user.id !== authUserId) {
          setLoading(false);
          if (!studentLoading) setError("Your session could not be verified. Please refresh and sign in again.");
          return;
        }

        const { data: studentRow, error: studentError } = await client
          .from("students")
          .select("id")
          .eq("auth_user_id", auth.user.id)
          .maybeSingle();
        if (!active) return;
        if (studentError) throw studentError;
        const mappedStudent = studentRow as { id: string } | null;
        if (!mappedStudent || mappedStudent.id !== studentId) {
          setLoading(false);
          setError("Your student profile could not be verified for notifications.");
          return;
        }

        removeSubscription = subscribeToStudentNotifications(client, studentId, {
          onAnnouncement: handleAnnouncementInsert,
          onAnnouncementDeleted: (announcementId) => {
            if (!active || !announcementId) return;
            setAnnouncements((current) => removeAnnouncementFromSnapshot(current, announcementId));
          },
          onReadStateChange: () => void refreshReadState(),
          onStatusChange: (status) => {
            if (!active) return;
            if (status === "SUBSCRIBED") {
              if (initialLoadComplete) void refreshSnapshot(true);
            } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
              setError("Live updates paused. Retrying connection...");
            }
          },
        });

        const snapshot = await refreshSnapshot();
        if (!active) return;
        if (snapshot) tracker.seed(snapshot);
        initialLoadComplete = true;
        setLoading(false);
        const baselineIds = new Set((snapshot ?? []).map(({ id }) => id));
        for (const eventId of pendingInitialEventIds) {
          if (!baselineIds.has(eventId) && tracker.acceptNewAnnouncement(eventId)) {
            let latest = await refreshSnapshot();
            if (active && !latest?.some(({ id }) => id === eventId)) latest = await refreshSnapshot();
            const persisted = latest?.find(({ id }) => id === eventId);
            if (active && persisted && !persisted.readAt) ringBell();
          }
        }
        pendingInitialEventIds.clear();
      } catch (loadError) {
        if (!active) return;
        console.error("[student notifications] Could not start notification stream:", loadError);
        setError(loadError instanceof Error ? loadError.message : "Notifications could not be loaded.");
        setLoading(false);
        initialLoadComplete = true;
      }
    })();

    return () => {
      active = false;
      initialLoadComplete = false;
      if (ringingTimer.current) clearTimeout(ringingTimer.current);
      removeSubscription?.();
    };
  }, [authUserId, enabled, identityKey, refreshReadState, ringBell, studentId, studentLoading]);

  useEffect(() => {
    if (!panelOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!panelRef.current?.contains(event.target as Node) && !triggerRef.current?.contains(event.target as Node)) {
        setPanelOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPanelOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panelOpen]);

  useEffect(() => () => {
    if (ringingTimer.current) clearTimeout(ringingTimer.current);
  }, []);

  async function markRead(announcement: StudentAnnouncement) {
    if (announcement.readAt || mutatingIds.has(announcement.id)) return;
    setMutationError(null);
    setMutatingIds((current) => new Set(current).add(announcement.id));
    const previousReadAt = new Map([[announcement.id, announcement.readAt]]);
    const result = await markCurrentStudentAnnouncementReadAction(announcement.id).catch((mutationFailure: unknown) => ({
      ok: false as const,
      error: mutationFailure instanceof Error ? mutationFailure.message : "The announcement could not be marked as read.",
    }));
    if (activeIdentityKeyRef.current !== identityKey) return;
    if (!result.ok) {
      setAnnouncements((current) => restoreAnnouncementReadState(current, previousReadAt));
      setMutationError(result.error);
    } else {
      setAnnouncements((current) => current.map((item) =>
        item.id === announcement.id ? { ...item, readAt: result.data.read_at } : item,
      ));
    }
    setMutatingIds((current) => {
      const next = new Set(current);
      next.delete(announcement.id);
      return next;
    });
  }

  async function markAllRead() {
    const unread = currentAnnouncements.filter(({ readAt }) => !readAt);
    if (unread.length === 0 || markingAll) return;
    setMutationError(null);
    setMarkingAll(true);
    const optimisticReadAt = new Date().toISOString();
    const previousReadAt = new Map(unread.map(({ id, readAt }) => [id, readAt]));
    setAnnouncements((current) => setAnnouncementsRead(current, new Set(previousReadAt.keys()), optimisticReadAt));
    const result = await markCurrentStudentAnnouncementsReadAction(unread.map(({ id }) => id)).catch((mutationFailure: unknown) => ({
      ok: false as const,
      error: mutationFailure instanceof Error ? mutationFailure.message : "Announcements could not be marked as read.",
    }));
    if (activeIdentityKeyRef.current !== identityKey) return;
    if (!result.ok) {
      setAnnouncements((current) => restoreAnnouncementReadState(current, previousReadAt));
      setMutationError(result.error);
    } else {
      const persistedAtById = new Map(result.data.map(({ announcement_id, read_at }) => [announcement_id, read_at]));
      setAnnouncements((current) => current.map((item) =>
        persistedAtById.has(item.id) ? { ...item, readAt: persistedAtById.get(item.id) ?? item.readAt } : item,
      ));
    }
    setMarkingAll(false);
  }

  if (!enabled) return null;

  return (
    <div ref={panelRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={badge ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={panelOpen}
        aria-controls={panelOpen ? "student-notification-panel" : undefined}
        onClick={() => setPanelOpen((open) => !open)}
        title="Notifications"
        className={
          inSidebar
            ? `relative flex min-h-11 w-full items-center rounded-xl py-2.5 font-sans text-[14px] font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C84A] ${compact ? "justify-center px-0" : "gap-3.5 px-[14px]"} ${panelOpen ? "bg-[#3A3428] text-[#F6EFDC]" : "text-[#F6EFDC]/70 hover:bg-[#3A3428] hover:text-[#F6EFDC]"}`
            : "relative flex h-9 w-9 items-center justify-center rounded-full border border-[#E9D99D] bg-[#FFF9E5] text-[#302713] shadow-sm transition hover:bg-[#F0C84A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F0C84A] focus-visible:ring-offset-2"
        }
      >
        <Bell size={inSidebar ? 19 : 17} strokeWidth={inSidebar ? 2.5 : 2} aria-hidden="true" className={ringing ? "notification-bell-ring" : ""} />
        {inSidebar && !compact ? <span>Notifications</span> : null}
        {badge ? (
          <span aria-hidden="true" className={`${inSidebar && !compact ? "ml-auto" : "absolute -right-1 -top-1"} flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#F0C84A] px-1 text-[10px] font-extrabold leading-none text-[#211B0D]`}>
            {badge}
          </span>
        ) : null}
        <span className="sr-only" aria-live="polite">{unreadCount ? `${unreadCount} unread notifications` : "No unread notifications"}</span>
      </button>

      {panelOpen ? (
        <section
          id="student-notification-panel"
          aria-label="Notifications"
          className={`absolute z-[60] w-[min(24rem,calc(100vw-1.5rem))] ${inSidebar ? "bottom-0 left-[calc(100%+0.75rem)]" : "right-0 top-[calc(100%+0.75rem)]"} overflow-hidden rounded-2xl border border-[#E7E1D2] bg-[#FFFEFA] text-[#211F1A] shadow-[0_18px_50px_rgba(32,27,17,0.18)]`}
        >
          <div className="flex items-start justify-between border-b border-[#ECE7DC] px-4 py-4">
            <div>
              <h2 className="font-serif text-xl font-semibold">Notifications</h2>
              <p className="mt-1 text-xs text-[#625D52]">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount ? (
                <button
                  type="button"
                  onClick={() => void markAllRead()}
                  disabled={markingAll}
                  className="min-h-9 rounded-full px-2 text-xs font-semibold text-[#514119] underline decoration-[#D7B64B] underline-offset-4 hover:bg-[#F8F1DD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-60"
                >
                  {markingAll ? "Saving..." : "Mark all read"}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setPanelOpen(false);
                  triggerRef.current?.focus();
                }}
                aria-label="Close notifications"
                className="flex h-9 w-9 items-center justify-center rounded-full text-[#514D44] hover:bg-[#F4F0E7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21]"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {error ? <p role="alert" className="border-b border-[#F1D2CB] bg-[#FFF6F3] px-4 py-3 text-sm text-[#8C2D1C]">{error}</p> : null}
          {mutationError ? <p role="alert" className="border-b border-[#F1D2CB] bg-[#FFF6F3] px-4 py-3 text-sm text-[#8C2D1C]">{mutationError}</p> : null}

          {error ? (
            <button
              type="button"
              onClick={() => void refresh()}
              className="w-full border-b border-[#ECE7DC] px-4 py-3 text-left text-sm font-semibold text-[#514119] hover:bg-[#F8F1DD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B18B21]"
            >
              Retry loading
            </button>
          ) : null}

          <div className="max-h-[min(65vh,30rem)] overflow-y-auto overscroll-contain">
            {loading ? (
              <p role="status" className="px-4 py-8 text-center text-sm text-[#625D52]">Loading notifications...</p>
            ) : currentAnnouncements.length === 0 ? (
              <div className="px-5 py-9 text-center">
                <CheckCheck size={25} className="mx-auto text-[#8B7A4A]" aria-hidden="true" />
                <p className="mt-3 font-medium">You’re all caught up</p>
                <p className="mt-1 text-sm text-[#625D52]">New announcements will appear here.</p>
              </div>
            ) : (
              <ul>
                {currentAnnouncements.map((announcement) => (
                  <li
                    key={announcement.id}
                    className={`border-b border-[#EEEAE1] px-4 py-4 last:border-b-0 ${announcement.readAt ? "" : "bg-[#FFF9E8]"}`}
                  >
                    <div className="flex items-start gap-3">
                      {!announcement.readAt ? <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#A77B0B]" aria-label="Unread" /> : null}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold leading-5">{announcement.title}</h3>
                          {!announcement.readAt ? (
                            <span className="shrink-0 rounded-full bg-[#F0C84A] px-2 py-0.5 text-[10px] font-bold text-[#29210D]">NEW</span>
                          ) : null}
                        </div>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-[#504C43]">{announcement.message}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <time dateTime={announcement.created_at} className="text-xs text-[#625D52]">
                            {formatAnnouncementTime(announcement.created_at)}
                          </time>
                          {!announcement.readAt ? (
                            <button
                              type="button"
                              onClick={() => void markRead(announcement)}
                              disabled={mutatingIds.has(announcement.id) || markingAll}
                              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-[#514119] hover:bg-[#F4EAC8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#B18B21] disabled:opacity-60"
                            >
                              <Check size={14} aria-hidden="true" />
                              {mutatingIds.has(announcement.id) ? "Saving..." : "Mark read"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {mutationError ? (
            <button
              type="button"
              onClick={() => void refresh()}
              className="w-full border-t border-[#ECE7DC] px-4 py-3 text-sm font-semibold text-[#514119] hover:bg-[#F8F1DD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B18B21]"
            >
              Refresh notifications
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
