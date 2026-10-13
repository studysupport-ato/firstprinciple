"use client";

import { useEffect, useState } from "react";

import type { CourseMaterialEntry } from "@/lib/content/adminContract";
import { parseYouTubePlaylistId, type PlaylistDetails } from "@/lib/youtubePlaylist";

export interface PlaylistEdit {
  courseTitle: string;
  hiddenVideos: string[];
  extraVideos: Array<{ videoId: string; title: string }>;
}

const inputClass =
  "min-h-[46px] w-full rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]";
const primaryButton =
  "min-h-[46px] rounded-full bg-[#8F6500] px-6 text-base font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50";
const quietButton = "min-h-[44px] rounded-full border border-[#5A4F3A] px-5 text-sm font-semibold text-[#F6EFDC] transition hover:bg-[#F6EFDC]/5";

/**
 * Edit a playlist after it was imported: rename it, tick or untick any of its videos,
 * and add single YouTube videos on top (they show after the playlist's own videos).
 */
export function PlaylistEditor({
  material,
  busy,
  onSave,
  onClose,
  onError,
}: {
  material: CourseMaterialEntry;
  busy: boolean;
  onSave: (edit: PlaylistEdit) => Promise<boolean>;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(material.courseTitle);
  const [hidden, setHidden] = useState<Set<string>>(new Set(material.hiddenVideos ?? []));
  const [extras, setExtras] = useState<Array<{ videoId: string; title: string }>>(material.extraVideos ?? []);
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [addLink, setAddLink] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const listId = parseYouTubePlaylistId(material.url);
    if (!listId) {
      setLoadError("This playlist's link is not a valid YouTube playlist link.");
      return;
    }
    let cancelled = false;
    fetch(`/api/youtube/playlist?list=${encodeURIComponent(listId)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body?.error ?? "The playlist could not be read.");
        if (!cancelled) setPlaylist(body as PlaylistDetails);
      })
      .catch((error: unknown) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : "The playlist could not be read.");
      });
    return () => {
      cancelled = true;
    };
  }, [material.url]);

  function toggle(videoId: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  async function addVideo() {
    if (!addLink.trim()) return;
    setAdding(true);
    try {
      const response = await fetch(`/api/youtube/video?v=${encodeURIComponent(addLink.trim())}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "That video could not be read.");
      const video = body as { videoId: string; title: string };
      if (playlist?.videos.some((item) => item.videoId === video.videoId)) {
        // Already in the playlist: adding it again just makes sure it is shown.
        setHidden((current) => {
          const next = new Set(current);
          next.delete(video.videoId);
          return next;
        });
      } else if (!extras.some((item) => item.videoId === video.videoId)) {
        setExtras((current) => [...current, video]);
      }
      setAddLink("");
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "That video could not be read.");
    } finally {
      setAdding(false);
    }
  }

  async function save() {
    if (!name.trim()) return onError("Give the playlist a name students will see.");
    // Only keep hidden ids that still belong to the playlist, so the list never grows stale.
    const stillInPlaylist = playlist ? new Set(playlist.videos.map((video) => video.videoId)) : null;
    const hiddenVideos = [...hidden].filter((id) => !stillInPlaylist || stillInPlaylist.has(id));
    const ok = await onSave({ courseTitle: name.trim(), hiddenVideos, extraVideos: extras });
    if (ok) onClose();
  }

  const playlistShown = playlist ? playlist.videos.filter((video) => !hidden.has(video.videoId)).length : 0;

  return (
    <div className="flex basis-full flex-col gap-3 rounded-2xl border border-[#3A3428] bg-[#211E18] p-4">
      <label className="flex flex-col gap-1.5 text-[14px] font-bold">
        Name shown to students
        <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
      </label>

      <div>
        <div className="text-[14px] font-bold">Videos (untick to hide from students, tick to show again)</div>
        {playlist ? (
          <div className="text-[13px] text-[#C9BFA6]">
            {playlist.channel ? `${playlist.channel} · ` : ""}
            {playlistShown + extras.length} of {playlist.videos.length + extras.length} will show
          </div>
        ) : null}
      </div>

      {loadError ? <p className="text-[14px] text-[#F0A798]">{loadError}</p> : null}
      {!playlist && !loadError ? <p className="text-[14px] text-[#C9BFA6]">Loading the playlist from YouTube…</p> : null}

      {playlist ? (
        <div className="max-h-[380px] overflow-y-auto rounded-xl border border-[#3A3428]">
          {playlist.videos.map((video, index) => (
            <label key={video.videoId} className="flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-[#2E2A22] px-3 py-2">
              <input type="checkbox" checked={!hidden.has(video.videoId)} onChange={() => toggle(video.videoId)} className="h-4 w-4 accent-[#E9BC3A]" />
              <span className="w-6 text-right text-[13px] text-[#8F8671]">{index + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-[88px] shrink-0 rounded-md object-cover" />
              <span className={`text-[15px] ${hidden.has(video.videoId) ? "text-[#8F8671] line-through" : ""}`}>{video.title}</span>
            </label>
          ))}
          {extras.map((video, index) => (
            <div key={video.videoId} className="flex min-h-[48px] items-center gap-3 border-b border-[#2E2A22] px-3 py-2 last:border-b-0">
              <span className="w-4" />
              <span className="w-6 text-right text-[13px] text-[#8F8671]">{playlist.videos.length + index + 1}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-[88px] shrink-0 rounded-md object-cover" />
              <span className="flex-1 text-[15px]">
                {video.title}
                <span className="ml-2 rounded-full bg-[#E9BC3A]/15 px-2 py-0.5 text-[11px] font-bold text-[#E9BC3A]">Added by you</span>
              </span>
              <button
                type="button"
                onClick={() => setExtras((current) => current.filter((item) => item.videoId !== video.videoId))}
                className="min-h-[40px] rounded-full border border-[#5A4F3A] px-3.5 text-[13px] font-semibold text-[#F0A798] hover:bg-[#F0A798]/10"
                aria-label={`Remove ${video.title}`}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <div className="text-[14px] font-bold">Add a video</div>
        <div className="flex flex-wrap gap-2.5">
          <input
            value={addLink}
            onChange={(event) => setAddLink(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void addVideo()}
            placeholder="Paste a YouTube video link"
            aria-label="YouTube video link to add"
            className={`${inputClass} flex-[3_1_260px]`}
          />
          <button type="button" disabled={adding || !addLink.trim()} onClick={() => void addVideo()} className={quietButton}>
            {adding ? "Adding…" : "Add video"}
          </button>
        </div>
        <p className="text-[13px] text-[#C9BFA6]">Added videos play after the playlist&apos;s own videos.</p>
      </div>

      <div className="flex flex-wrap gap-2.5">
        <button type="button" disabled={busy} onClick={() => void save()} className={primaryButton}>
          Save changes
        </button>
        <button type="button" onClick={onClose} className={quietButton}>
          Cancel
        </button>
      </div>
    </div>
  );
}
