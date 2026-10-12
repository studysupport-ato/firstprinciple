"use client";

import { ArrowLeft, ArrowUpRight, Bookmark, FileQuestion, FileText, Link2, ListVideo, Play, Presentation, SkipForward } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type { MaterialRow, MaterialType } from "@/lib/courseMaterialsDisplay";
import { linkHost } from "@/lib/courseMaterialsTree";
import { buildYouTubeEmbedUrl, getCourseMaterialVideoId } from "@/lib/youtube";
import { buildYouTubePlaylistUrl, parseYouTubePlaylistId, type PlaylistDetails } from "@/lib/youtubePlaylist";

interface CourseDetailProps {
  course: { courseCode?: string; courseTitle: string };
  materials: MaterialRow[];
  backLabel: string;
  onBack: () => void;
  bookmarks: string[];
  toggleBookmark: (id: string) => void;
}

type TabKey = "videos" | "playlists" | "slides" | "pdfs" | "past" | "links";

const TABS: Array<{ key: TabKey; label: string; type: MaterialType }> = [
  { key: "videos", label: "Videos", type: "Video Lecture" },
  { key: "playlists", label: "Playlists", type: "Playlist" },
  { key: "slides", label: "Slides", type: "Lecture Slides" },
  { key: "pdfs", label: "PDFs", type: "PDF Document" },
  { key: "past", label: "Past questions", type: "Past Questions" },
  { key: "links", label: "Links", type: "External Link" },
];

function thumb(videoId: string) {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

/**
 * One course and its materials, one tab per type.
 * Videos and Playlists: a player with a list beside it. Everything else: a grid of tiles.
 */
export function CourseDetail({ course, materials, backLabel, onBack, bookmarks, toggleBookmark }: CourseDetailProps) {
  const byTab = useMemo(() => {
    const map = new Map<TabKey, MaterialRow[]>();
    for (const tab of TABS) map.set(tab.key, materials.filter((m) => m.type === tab.type));
    return map;
  }, [materials]);
  const firstWithItems = TABS.find((tab) => (byTab.get(tab.key)?.length ?? 0) > 0)?.key ?? "videos";
  const [tab, setTab] = useState<TabKey>(firstWithItems);
  const items = byTab.get(tab) ?? [];

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-5 inline-flex min-h-[44px] items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
        {backLabel}
      </button>

      {course.courseCode ? (
        <div className="mb-3">
          <span className="rounded-[6px] bg-[#1A1814] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#E9BC3A]">{course.courseCode}</span>
        </div>
      ) : null}
      <h1 className="font-sans text-[clamp(2rem,5vw,3.25rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">{course.courseTitle}</h1>

      <div role="tablist" aria-label="Material types" className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible md:pb-0">
        {TABS.map((item) => {
          const count = byTab.get(item.key)?.length ?? 0;
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={active}
              disabled={count === 0}
              onClick={() => setTab(item.key)}
              className={`inline-flex min-h-[42px] shrink-0 items-center gap-2 rounded-full px-5 text-[14px] font-extrabold transition ${
                active
                  ? "bg-[#1A1814] text-[#E9BC3A]"
                  : count === 0
                    ? "cursor-not-allowed bg-[#1A1814]/[0.07] text-[#1A1814]/40"
                    : "bg-[#1A1814]/[0.12] text-[#1A1814] hover:bg-[#1A1814]/[0.2]"
              }`}
            >
              {item.label}
              <span className="text-[12px] font-bold opacity-70">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#1A1814]/30 bg-[#1A1814]/[0.06] p-7 text-[15px] font-semibold text-[#1A1814]/70">
            Nothing here yet for this course.
          </div>
        ) : tab === "videos" ? (
          <VideosPanel key="videos" videos={items} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />
        ) : tab === "playlists" ? (
          <PlaylistsPanel key="playlists" playlists={items} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />
        ) : (
          <TileGrid key={tab} items={items} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />
        )}
      </div>
    </div>
  );
}

/* ─── Player + list (videos and playlists) ─────────────────────────────── */

function Stage({ videoId, title, autoplay, onStart }: { videoId?: string; title: string; autoplay: boolean; onStart: () => void }) {
  if (videoId && autoplay) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-[14px] bg-black">
        <iframe
          key={videoId}
          src={`${buildYouTubeEmbedUrl(videoId)}&autoplay=1`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={onStart}
      disabled={!videoId}
      aria-label={`Play ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-[14px] bg-[#2B261D]"
    >
      {videoId ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E9BC3A] text-[#1A1814] shadow-lg transition group-hover:scale-105">
          <Play className="h-6 w-6" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

function SaveButton({ saved, onClick, label }: { saved: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`}
      aria-pressed={saved}
      className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-bold transition ${saved ? "border-[#E9BC3A] text-[#E9BC3A]" : "border-[#3A3428] text-[#F6EFDC] hover:border-[#F6EFDC]/40"}`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

function WatchLayout({ stage, list }: { stage: ReactNode; list: ReactNode }) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <section className="min-w-0 flex-1 rounded-[22px] bg-[#1A1814] p-3.5 text-[#F6EFDC] shadow-[0_2px_14px_rgba(0,0,0,0.22)]">{stage}</section>
      <aside className="w-full shrink-0 rounded-[22px] bg-[#1A1814] p-3 text-[#F6EFDC] shadow-[0_2px_14px_rgba(0,0,0,0.22)] lg:max-h-[640px] lg:w-[380px] lg:overflow-y-auto [scrollbar-color:#3A3428_transparent] [scrollbar-width:thin]">
        {list}
      </aside>
    </div>
  );
}

function ListRow({
  index,
  active,
  videoId,
  title,
  sub,
  disabled,
  onClick,
}: {
  index: number;
  active: boolean;
  videoId?: string;
  title: string;
  sub?: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "true" : undefined}
      className={`flex w-full items-center gap-3 rounded-xl px-1.5 py-2 text-left transition ${active ? "bg-[#E9BC3A]/[0.16]" : "hover:bg-[#F6EFDC]/[0.05]"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span className={`w-5 shrink-0 text-right text-[12px] font-extrabold ${active ? "text-[#E9BC3A]" : "text-[#F6EFDC]/45"}`}>{active ? "▶" : index + 1}</span>
      <span className="relative aspect-video w-[104px] shrink-0 overflow-hidden rounded-lg bg-[#2B261D]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {videoId ? <img src={thumb(videoId)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
      </span>
      <span className="min-w-0">
        <span className="line-clamp-2 block text-[13px] font-extrabold leading-tight text-[#F6EFDC]">{title}</span>
        {sub ? <span className="mt-1 block text-[11px] text-[#F6EFDC]/55">{sub}</span> : null}
      </span>
    </button>
  );
}

function VideosPanel({ videos, bookmarks, toggleBookmark }: { videos: MaterialRow[]; bookmarks: string[]; toggleBookmark: (id: string) => void }) {
  const playable = videos.filter((v) => v.available !== false && getCourseMaterialVideoId(v));
  const [selectedId, setSelectedId] = useState(playable[0]?.id ?? videos[0]?.id);
  const [started, setStarted] = useState(false);
  const current = videos.find((v) => v.id === selectedId) ?? videos[0];
  const currentVideoId = current ? getCourseMaterialVideoId(current) : undefined;
  const position = playable.findIndex((v) => v.id === current?.id);

  function pick(id: string) {
    setSelectedId(id);
    setStarted(true);
  }
  function next() {
    if (playable.length === 0) return;
    pick(playable[(position + 1) % playable.length].id);
  }

  return (
    <WatchLayout
      stage={
        <>
          <Stage videoId={currentVideoId} title={current?.courseTitle ?? "Video"} autoplay={started} onStart={() => setStarted(true)} />
          <div className="px-1.5 pb-1 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#E9BC3A]">
              Video · {position + 1} of {playable.length}
            </p>
            <h2 className="mt-1.5 text-[22px] font-black leading-tight">{current?.courseTitle}</h2>
            {current?.description && current.description !== current.courseTitle ? (
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#F6EFDC]/72">{current.description}</p>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {playable.length > 1 ? (
                <button type="button" onClick={next} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[13px] font-extrabold text-[#F6EFDC] transition hover:brightness-110">
                  Next video <SkipForward className="h-4 w-4" />
                </button>
              ) : null}
              {current ? <SaveButton saved={bookmarks.includes(current.id)} onClick={() => toggleBookmark(current.id)} label={current.courseTitle} /> : null}
            </div>
          </div>
        </>
      }
      list={
        <>
          <p className="px-1.5 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#F6EFDC]/55">Videos · {videos.length}</p>
          {videos.map((video, index) => {
            const off = video.available === false || !getCourseMaterialVideoId(video);
            return (
              <ListRow
                key={video.id}
                index={index}
                active={video.id === current?.id}
                videoId={getCourseMaterialVideoId(video)}
                title={video.courseTitle}
                sub={off ? "Not available at the moment" : undefined}
                disabled={off}
                onClick={() => pick(video.id)}
              />
            );
          })}
        </>
      }
    />
  );
}

type PlaylistState = { status: "loading" } | { status: "ready"; data: PlaylistDetails } | { status: "error"; message: string };

function usePlaylists(playlists: MaterialRow[]) {
  const [state, setState] = useState<Record<string, PlaylistState>>({});
  // Depend on the ids and links, not the array itself, so a parent re-render never refetches.
  const signature = playlists.map((playlist) => `${playlist.id}|${playlist.url}`).join(",");
  useEffect(() => {
    let cancelled = false;
    for (const playlist of playlists) {
      const listId = parseYouTubePlaylistId(playlist.url);
      if (!listId) {
        setState((prev) => ({ ...prev, [playlist.id]: { status: "error", message: "This playlist link is not valid." } }));
        continue;
      }
      setState((prev) => (prev[playlist.id] ? prev : { ...prev, [playlist.id]: { status: "loading" } }));
      fetch(`/api/youtube/playlist?list=${encodeURIComponent(listId)}`)
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error ?? "The playlist could not be loaded.");
          return body as PlaylistDetails;
        })
        .then((data) => {
          if (!cancelled) setState((prev) => ({ ...prev, [playlist.id]: { status: "ready", data } }));
        })
        .catch((error: unknown) => {
          if (!cancelled) setState((prev) => ({ ...prev, [playlist.id]: { status: "error", message: error instanceof Error ? error.message : "The playlist could not be loaded." } }));
        });
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
  return state;
}

function PlaylistsPanel({ playlists, bookmarks, toggleBookmark }: { playlists: MaterialRow[]; bookmarks: string[]; toggleBookmark: (id: string) => void }) {
  const loaded = usePlaylists(playlists);
  const [openId, setOpenId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);

  const visibleVideos = (entry: MaterialRow) => {
    const state = loaded[entry.id];
    if (state?.status !== "ready") return [];
    const hidden = new Set(entry.hiddenVideos ?? []);
    return state.data.videos.filter((video) => !hidden.has(video.videoId));
  };

  const open = playlists.find((p) => p.id === openId) ?? null;
  const featured = open ?? playlists.find((p) => p.available !== false) ?? playlists[0];
  const featuredState = loaded[featured.id];
  const featuredVideos = visibleVideos(featured);
  const currentVideo = open ? featuredVideos[index] : featuredVideos[0];
  const channel = featuredState?.status === "ready" ? featuredState.data.channel : featured.provider?.replace(/\s*-\s*YouTube$/i, "");
  const youtubeLink = buildYouTubePlaylistUrl(parseYouTubePlaylistId(featured.url) ?? "");

  function openPlaylist(id: string) {
    setOpenId(id);
    setIndex(0);
    setStarted(true);
  }

  return (
    <WatchLayout
      stage={
        <>
          {featuredState?.status === "error" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[14px] border border-[#3A3428] bg-[#221F19] p-6 text-center">
              <p className="text-[14px] text-[#F6EFDC]/75">{featuredState.message}</p>
              <a href={youtubeLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[14px] font-extrabold text-[#F6EFDC]">
                Open on YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <Stage
              videoId={currentVideo?.videoId}
              title={currentVideo?.title ?? featured.courseTitle}
              autoplay={started && Boolean(open)}
              onStart={() => openPlaylist(featured.id)}
            />
          )}
          <div className="px-1.5 pb-1 pt-4">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#E9BC3A]">
              Playlist{channel ? ` · ${channel}` : ""}
              {open && featuredVideos.length ? ` · ${index + 1} of ${featuredVideos.length}` : ""}
            </p>
            <h2 className="mt-1.5 text-[22px] font-black leading-tight">{open && currentVideo ? currentVideo.title : featured.courseTitle}</h2>
            {!open && featured.description ? <p className="mt-1.5 line-clamp-3 text-[14px] leading-relaxed text-[#F6EFDC]/72">{featured.description}</p> : null}
            <div className="mt-4 flex flex-wrap gap-2.5">
              {open ? (
                featuredVideos.length > 1 ? (
                  <button type="button" onClick={() => setIndex((i) => (i + 1) % featuredVideos.length)} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[13px] font-extrabold text-[#F6EFDC] transition hover:brightness-110">
                    Next video <SkipForward className="h-4 w-4" />
                  </button>
                ) : null
              ) : (
                <button type="button" onClick={() => openPlaylist(featured.id)} disabled={featuredVideos.length === 0} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[13px] font-extrabold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50">
                  Play playlist <Play className="h-4 w-4" fill="currentColor" />
                </button>
              )}
              <SaveButton saved={bookmarks.includes(featured.id)} onClick={() => toggleBookmark(featured.id)} label={featured.courseTitle} />
              <a href={youtubeLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[#E9BC3A] hover:underline">
                On YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </>
      }
      list={
        open ? (
          <>
            <button type="button" onClick={() => { setOpenId(null); setStarted(false); }} className="min-h-[40px] px-1.5 text-[12px] font-extrabold text-[#E9BC3A]">
              ← All playlists
            </button>
            <div className="mx-1.5 mb-2 border-b border-[#3A3428] pb-3">
              <p className="text-[16px] font-black leading-tight">{open.courseTitle}</p>
              <p className="mt-1 text-[12px] text-[#F6EFDC]/60">
                {channel ? `${channel} · ` : ""}
                {featuredVideos.length} videos
              </p>
              {featuredState?.status === "ready" && featuredState.data.source === "feed" ? (
                <p className="mt-1 text-[11px] text-[#F6EFDC]/45">Showing the newest {featuredVideos.length}. The full list is on YouTube.</p>
              ) : null}
            </div>
            {featuredVideos.map((video, i) => (
              <ListRow key={video.videoId} index={i} active={i === index} videoId={video.videoId} title={video.title} onClick={() => { setIndex(i); setStarted(true); }} />
            ))}
          </>
        ) : (
          <>
            <p className="px-1.5 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#F6EFDC]/55">Playlists · {playlists.length}</p>
            {playlists.map((playlist) => {
              const state = loaded[playlist.id];
              const videosHere = visibleVideos(playlist);
              const off = playlist.available === false;
              const sub = state?.status === "ready" ? (state.data.channel || "") : playlist.provider?.replace(/\s*-\s*YouTube$/i, "") ?? "";
              return (
                <button
                  key={playlist.id}
                  type="button"
                  disabled={off}
                  onClick={() => openPlaylist(playlist.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-1.5 py-2.5 text-left transition hover:bg-[#F6EFDC]/[0.05] ${off ? "cursor-not-allowed opacity-50" : ""}`}
                >
                  <span className="relative w-[124px] shrink-0 pt-1.5">
                    <span className="absolute inset-x-2.5 top-0 h-3 rounded-t-md bg-[#3A3428]" />
                    <span className="relative block aspect-video overflow-hidden rounded-lg bg-[#2B261D]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {videosHere[0] ? <img src={thumb(videosHere[0].videoId)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
                      <span className="absolute inset-y-0 right-0 flex w-[46px] flex-col items-center justify-center gap-0.5 bg-black/75 text-[11px] font-extrabold text-[#F6EFDC]">
                        <ListVideo className="h-4 w-4" />
                        {state?.status === "ready" ? videosHere.length : "…"}
                      </span>
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 block text-[13px] font-extrabold leading-tight text-[#F6EFDC]">{playlist.courseTitle}</span>
                    <span className="mt-1 block text-[11px] text-[#F6EFDC]/55">{off ? "Not available at the moment" : sub}</span>
                    {!off ? <span className="mt-1 block text-[11px] font-extrabold text-[#E9BC3A]">View full playlist</span> : null}
                  </span>
                </button>
              );
            })}
          </>
        )
      }
    />
  );
}

/* ─── Tiles (slides, PDFs, past questions, links) ──────────────────────── */

const TILE_LOOK: Record<string, { icon: ReactNode; bg: string; fg: string; badge: string }> = {
  "Lecture Slides": { icon: <Presentation className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#F0C84A]", fg: "text-[#1A1814]", badge: "Slides" },
  "PDF Document": { icon: <FileText className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#F6EFDC]", fg: "text-[#1A1814]", badge: "PDF" },
  "Past Questions": { icon: <FileQuestion className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#D9CCF4]", fg: "text-[#2A1A5E]", badge: "Past questions" },
  "External Link": { icon: <Link2 className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#8F6500]", fg: "text-[#F6EFDC]", badge: "Link" },
};

function TileGrid({ items, bookmarks, toggleBookmark }: { items: MaterialRow[]; bookmarks: string[]; toggleBookmark: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((item) => {
        const look = TILE_LOOK[item.type] ?? TILE_LOOK["External Link"];
        const off = item.available === false;
        const saved = bookmarks.includes(item.id);
        return (
          <article key={item.id} className={`flex flex-col gap-3 rounded-[18px] bg-[#1A1814] p-2.5 pb-3.5 shadow-[0_2px_14px_rgba(0,0,0,0.18)] ${off ? "opacity-55" : ""}`}>
            <div className={`flex aspect-video flex-col items-center justify-center gap-1.5 rounded-[11px] ${look.bg} ${look.fg}`}>
              {look.icon}
              <span className="text-[10px] font-black uppercase tracking-[0.14em]">{look.badge}</span>
            </div>
            <div className="px-1.5">
              <h3 className="text-[15px] font-black leading-tight text-[#F6EFDC]">{item.courseTitle}</h3>
              {item.description && item.description !== item.courseTitle ? (
                <p className="mt-1.5 line-clamp-2 text-[12px] leading-snug text-[#F6EFDC]/68">{item.description}</p>
              ) : null}
              <p className="mt-1.5 text-[11px] text-[#F6EFDC]/45">{linkHost(item.url)}</p>
            </div>
            <div className="mt-auto flex items-center justify-between gap-2 px-1.5">
              {off ? (
                <span className="text-[12px] font-bold text-[#B8AE95]">Not available at the moment</span>
              ) : (
                <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#8F6500] px-4 text-[12px] font-extrabold text-[#F6EFDC] transition hover:brightness-110">
                  Open <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              )}
              <button
                type="button"
                onClick={() => toggleBookmark(item.id)}
                aria-label={saved ? `Remove ${item.courseTitle} from saved` : `Save ${item.courseTitle}`}
                aria-pressed={saved}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition ${saved ? "border-[#E9BC3A] text-[#E9BC3A]" : "border-[#3A3428] text-[#F6EFDC]/50 hover:text-[#F6EFDC]"}`}
              >
                <Bookmark className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
