"use client";

import { useState } from "react";

import { buildYouTubePlaylistUrl, parseYouTubePlaylistId, type PlaylistDetails } from "@/lib/youtubePlaylist";

export interface PlaylistImport {
  title: string;
  url: string;
  provider: string;
  hiddenVideos: string[];
}

const inputClass =
  "min-h-[46px] w-full rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]";
const primaryButton =
  "min-h-[46px] rounded-full bg-[#8F6500] px-6 text-base font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50";

/** Paste a YouTube playlist link, preview its videos, untick any to hide, then import it as one material. */
export function PlaylistImporter({ busy, onImport, onError }: { busy: boolean; onImport: (playlist: PlaylistImport) => Promise<boolean>; onError: (message: string) => void }) {
  const [link, setLink] = useState("");
  const [loading, setLoading] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [name, setName] = useState("");
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  async function fetchPlaylist() {
    const listId = parseYouTubePlaylistId(link);
    if (!listId) return onError("Paste a YouTube playlist link. It contains list=… in the address.");
    setLoading(true);
    try {
      const response = await fetch(`/api/youtube/playlist?list=${encodeURIComponent(listId)}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? "The playlist could not be read.");
      const details = body as PlaylistDetails;
      setPlaylist(details);
      setName(details.title);
      setHidden(new Set());
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "The playlist could not be read.");
    } finally {
      setLoading(false);
    }
  }

  function toggle(videoId: string) {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(videoId)) next.delete(videoId);
      else next.add(videoId);
      return next;
    });
  }

  async function importIt() {
    if (!playlist) return;
    if (!name.trim()) return onError("Give the playlist a name students will see.");
    const ok = await onImport({
      title: name.trim(),
      url: buildYouTubePlaylistUrl(playlist.playlistId),
      // Kept in the same "Channel - YouTube" shape as older playlist rows (never a bare 11-character word, which would read as a video id).
      provider: `${playlist.channel || "YouTube"} - YouTube`,
      hiddenVideos: [...hidden],
    });
    if (ok) {
      setLink("");
      setPlaylist(null);
      setName("");
      setHidden(new Set());
    }
  }

  const shown = playlist ? playlist.videos.length - hidden.size : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2.5">
        <input
          value={link}
          onChange={(event) => setLink(event.target.value)}
          onKeyDown={(event) => event.key === "Enter" && void fetchPlaylist()}
          placeholder="https://www.youtube.com/playlist?list=…"
          aria-label="YouTube playlist link"
          className={`${inputClass} flex-[3_1_280px]`}
        />
        <button type="button" disabled={loading || busy} onClick={() => void fetchPlaylist()} className={primaryButton}>
          {loading ? "Fetching…" : "Fetch playlist"}
        </button>
      </div>

      {playlist ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-[#3A3428] bg-[#211E18] p-4">
          <div>
            <div className="text-lg font-extrabold">{playlist.title}</div>
            <div className="text-[14px] text-[#C9BFA6]">
              {playlist.channel ? `${playlist.channel} · ` : ""}
              {playlist.videos.length} videos{hidden.size ? ` · ${shown} will show` : ""}
            </div>
            {playlist.source === "feed" ? (
              <p className="mt-1 text-[13px] text-[#E9BC3A]">Only the newest {playlist.videos.length} videos could be read. Add YOUTUBE_API_KEY in Vercel to get the whole playlist.</p>
            ) : null}
          </div>
          <label className="flex flex-col gap-1.5 text-[14px] font-bold">
            Name shown to students
            <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} />
          </label>
          <div className="text-[14px] font-bold">Videos (untick any you want to hide)</div>
          <div className="max-h-[360px] overflow-y-auto rounded-xl border border-[#3A3428]">
            {playlist.videos.map((video, index) => (
              <label key={video.videoId} className="flex min-h-[48px] cursor-pointer items-center gap-3 border-b border-[#2E2A22] px-3 py-2 last:border-b-0">
                <input type="checkbox" checked={!hidden.has(video.videoId)} onChange={() => toggle(video.videoId)} className="h-4 w-4 accent-[#E9BC3A]" />
                <span className="w-6 text-right text-[13px] text-[#8F8671]">{index + 1}</span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`} alt="" loading="lazy" className="aspect-video w-[88px] shrink-0 rounded-md object-cover" />
                <span className={`text-[15px] ${hidden.has(video.videoId) ? "text-[#8F8671] line-through" : ""}`}>{video.title}</span>
              </label>
            ))}
          </div>
          <p className="text-[13px] text-[#C9BFA6]">Videos the channel adds to this playlist later will show up on the site by themselves.</p>
          <div>
            <button type="button" disabled={busy || shown === 0} onClick={() => void importIt()} className={primaryButton}>
              Import playlist
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
