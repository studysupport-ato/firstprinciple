"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BellRing, Send, Trash2 } from "lucide-react";

import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  getAdminAnnouncementsAction,
  deleteAnnouncementAction,
  sendAnnouncementAction,
} from "@/lib/notificationAdminActions";
import type { Announcement } from "@/lib/notifications/types";
import {
  ANNOUNCEMENT_MESSAGE_MAX_LENGTH,
  ANNOUNCEMENT_TITLE_MAX_LENGTH,
} from "@/lib/notifications/validation";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleDelete(announcement: Announcement) {
    if (!window.confirm(`Delete "${announcement.title}" from every student's notifications? This cannot be undone.`)) {
      return;
    }

    setError(null);
    setNotice(null);
    setDeletingId(announcement.id);
    try {
      const result = await deleteAnnouncementAction(announcement.id);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setAnnouncements((current) => current.filter(({ id }) => id !== result.data.id));
      setNotice("Announcement deleted from all students' notifications.");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "The announcement could not be deleted.");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    let active = true;
    void getAdminAnnouncementsAction().then((result) => {
      if (!active) return;
      if (result.ok) {
        setAnnouncements(result.data);
        setListError(null);
      } else {
        setListError(result.error);
        setError(result.error);
      }
      setLoading(false);
    }).catch((loadError: unknown) => {
      if (!active) return;
      const message = loadError instanceof Error ? loadError.message : "Announcements could not be loaded.";
      setListError(message);
      setError(message);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  async function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setSending(true);

    try {
      const result = await sendAnnouncementAction({ title, message });
      if (!result.ok) {
        setError(result.error);
        return;
      }

      setAnnouncements((current) => [result.data, ...current].slice(0, 25));
      setTitle("");
      setMessage("");
      setNotice("Announcement sent to eligible students.");
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : "The announcement could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Notifications"
        description="Send a persistent announcement to students who can access the platform."
      />

      <form
        onSubmit={handleSend}
        className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)] md:p-7"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F7F7F8] text-[#111111]">
            <BellRing size={18} />
          </span>
          <div>
            <h2 className="font-serif text-2xl text-[#111111]">New announcement</h2>
            <p className="mt-1 text-sm text-[#666666]">Announcements are stored for eligible students; student-facing notifications are coming in the next phase.</p>
          </div>
        </div>

        <label className="mt-6 block text-sm font-semibold text-[#111111]" htmlFor="announcement-title">
          Title
        </label>
        <div className="mt-2 flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-white px-4 focus-within:border-[#111111]">
          <input
            id="announcement-title"
            required
            maxLength={ANNOUNCEMENT_TITLE_MAX_LENGTH}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="min-w-0 flex-1 py-3 text-sm outline-none"
            placeholder="What should students know?"
          />
          <span className="shrink-0 text-xs text-[#888888]">
            {title.length}/{ANNOUNCEMENT_TITLE_MAX_LENGTH}
          </span>
        </div>

        <label className="mt-5 block text-sm font-semibold text-[#111111]" htmlFor="announcement-message">
          Message
        </label>
        <div className="mt-2 rounded-xl border border-[#E5E5E5] bg-white p-4 focus-within:border-[#111111]">
          <textarea
            id="announcement-message"
            required
            maxLength={ANNOUNCEMENT_MESSAGE_MAX_LENGTH}
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full resize-y text-sm outline-none"
            placeholder="Write your announcement..."
          />
          <div className="text-right text-xs text-[#888888]">
            {message.length}/{ANNOUNCEMENT_MESSAGE_MAX_LENGTH}
          </div>
        </div>

        {error ? <p role="alert" className="mt-4 text-sm font-medium text-[#B42318]">{error}</p> : null}
        {notice ? <p role="status" className="mt-4 text-sm font-medium text-[#16794A]">{notice}</p> : null}

        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim()}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#111111] px-5 text-sm font-semibold text-white transition hover:bg-[#333333] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={15} />
          {sending ? "Sending..." : "Send announcement"}
        </button>
      </form>

      <section className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)] md:p-7">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl text-[#111111]">Recent announcements</h2>
            <p className="mt-1 text-sm text-[#666666]">The latest messages sent to students.</p>
          </div>
          <div className="flex items-center gap-3">
            {listError ? (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setListError(null);
                  void getAdminAnnouncementsAction()
                    .then((result) => {
                      if (result.ok) {
                        setAnnouncements(result.data);
                        setError(null);
                      } else {
                        setListError(result.error);
                      }
                    })
                    .catch((loadError: unknown) => {
                      setListError(loadError instanceof Error ? loadError.message : "Announcements could not be loaded.");
                    })
                    .finally(() => setLoading(false));
                }}
                className="text-xs font-semibold text-[#735A12] underline underline-offset-4"
              >
                Retry
              </button>
            ) : null}
            <span className="rounded-full bg-[#F7F7F8] px-3 py-1 text-xs font-semibold text-[#666666]">
              {announcements.length}
            </span>
          </div>
        </div>

        {loading ? (
          <p role="status" className="py-6 text-sm text-[#666666]">Loading announcements...</p>
        ) : listError ? (
          <p role="alert" className="py-6 text-sm text-[#B42318]">{listError}</p>
        ) : announcements.length === 0 ? (
          <AdminEmptyState
            title="No announcements yet"
            description="Announcements you send will appear here."
          />
        ) : (
          <ul className="divide-y divide-[#EEEEEE]">
            {announcements.map((announcement) => (
              <li key={announcement.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-semibold text-[#111111]">{announcement.title}</h3>
                      <time className="text-xs text-[#777777]" dateTime={announcement.created_at}>
                        {new Intl.DateTimeFormat("en", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(announcement.created_at))}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#555555]">{announcement.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleDelete(announcement)}
                    disabled={deletingId !== null}
                    aria-label={`Delete announcement: ${announcement.title}`}
                    className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#E8C7C3] px-3 text-xs font-semibold text-[#A12B20] transition hover:bg-[#FFF7F5] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {deletingId === announcement.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
