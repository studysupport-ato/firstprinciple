"use client";

import { ArrowLeft, ArrowUpRight, Bookmark, FileQuestion, FileText, LayoutGrid, Link2, ListVideo, Play, Presentation, SkipForward } from "lucide-react";
import { FlagButton } from "@/components/flags/FlagButton";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import type { CourseOutlineChapter } from "@/lib/courseMaterials";
import type { MaterialRow, MaterialType } from "@/lib/courseMaterialsDisplay";
import { linkHost } from "@/lib/courseMaterialsTree";

import { CourseStructure } from "./CourseStructure";
import { buildYouTubeEmbedUrl, getCourseMaterialVideoId } from "@/lib/youtube";
import { buildYouTubePlaylistUrl, parseYouTubePlaylistId, type PlaylistDetails } from "@/lib/youtubePlaylist";

interface CourseDetailProps {
  course: { courseCode?: string; courseTitle: string; credit?: string; topics?: Array<{ id: string; name: string }>; outline?: CourseOutlineChapter[] };
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

/** Each topic gets a colour by its position, used on its heading, its stripe and its tag in the player. */
const TOPIC_COLORS = ["#E9BC3A", "#E0835A", "#8FB8E8", "#7FC9A2", "#B9A4EA", "#F2A7C3", "#C9B27C", "#9AD0D6"];
const NO_TOPIC = "__none";

type TopicView = { id: string; name: string; color: string };
type TopicGroup<T> = { topic: TopicView | null; items: T[] };

/** Group items under the course's topics, in the topics' order; anything without a known topic goes last. */
function groupByTopic<T extends MaterialRow>(items: T[], topics: TopicView[]): TopicGroup<T>[] {
  if (topics.length === 0) return [{ topic: null, items }];
  const known = new Set(topics.map((topic) => topic.id));
  const groups: TopicGroup<T>[] = topics.map((topic) => ({ topic, items: items.filter((item) => item.topicId === topic.id) }));
  groups.push({ topic: null, items: items.filter((item) => !item.topicId || !known.has(item.topicId)) });
  return groups.filter((group) => group.items.length > 0);
}

function topicOf(item: MaterialRow, topics: TopicView[]) {
  return topics.find((topic) => topic.id === item.topicId) ?? null;
}

function TopicTag({ topic }: { topic: TopicView | null }) {
  if (!topic) return null;
  return (
    <span className="mr-2 inline-flex items-center rounded-full px-2.5 py-0.5 align-middle text-[10px] font-black uppercase tracking-[0.08em] text-[#1A1814]" style={{ background: topic.color }}>
      {topic.name}
    </span>
  );
}

/** The heading over a group in the dark side list. */
function ListTopicHeading({ group, show }: { group: TopicGroup<unknown>; show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center gap-2.5 px-1.5 pb-1.5 pt-3">
      <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: group.topic?.color ?? "#8F8671" }} />
      <span className="text-[11px] font-black uppercase tracking-[0.12em] text-[#F6EFDC]">{group.topic?.name ?? "Not in a topic"}</span>
      <span className="text-[11px] font-bold text-[#F6EFDC]/45">{group.items.length}</span>
      <span className="h-px flex-1 bg-[#3A3428]" />
    </div>
  );
}

/** The admin page where a material is edited. */
function adminMaterialsLink(departmentId: string) {
  return `/admin/course-materials/${encodeURIComponent(departmentId)}`;
}

function thumb(videoId: string) {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/mqdefault.jpg`;
}

/**
 * One course and its materials, one tab per type.
 * Videos and Playlists: a player with a list beside it. Everything else: a grid of tiles.
 */
export function CourseDetail({ course, materials, backLabel, onBack, bookmarks, toggleBookmark }: CourseDetailProps) {
  // Where a flagged video or playlist sits, for the admin inbox.
  const flagWhere = [course.courseCode, course.courseTitle].filter(Boolean).join(" · ") || "Course materials";
  const byTab = useMemo(() => {
    const map = new Map<TabKey, MaterialRow[]>();
    for (const tab of TABS) map.set(tab.key, materials.filter((m) => m.type === tab.type));
    return map;
  }, [materials]);
  const firstWithItems = TABS.find((tab) => (byTab.get(tab.key)?.length ?? 0) > 0)?.key ?? "videos";
  const [tab, setTab] = useState<TabKey>(firstWithItems);
  const [topicFilter, setTopicFilter] = useState<string>("all");
  const topics: TopicView[] = useMemo(
    () => (course.topics ?? []).map((topic, index) => ({ ...topic, color: TOPIC_COLORS[index % TOPIC_COLORS.length] })),
    [course.topics],
  );
  const tabItems = byTab.get(tab) ?? [];
  const knownTopic = (item: MaterialRow) => Boolean(item.topicId && topics.some((topic) => topic.id === item.topicId));
  const items =
    topicFilter === "all"
      ? tabItems
      : topicFilter === NO_TOPIC
        ? tabItems.filter((item) => !knownTopic(item))
        : tabItems.filter((item) => item.topicId === topicFilter);
  const looseCount = tabItems.filter((item) => !knownTopic(item)).length;
  const chips = [
    { id: "all", name: "All topics", color: "#1A1814", count: tabItems.length },
    ...topics.map((topic) => ({ ...topic, count: tabItems.filter((item) => item.topicId === topic.id).length })),
    ...(looseCount > 0 && looseCount < tabItems.length ? [{ id: NO_TOPIC, name: "Not in a topic", color: "#8F8671", count: looseCount }] : []),
  ];

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
      {course.credit ? (
        <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-full bg-[#1A1814] px-3.5 py-1.5 text-[13px] font-semibold text-[#F6EFDC]">
          <span className="text-[#E9BC3A]">Credit</span>
          <span className="min-w-0 truncate">{course.credit}</span>
        </p>
      ) : null}

      <CourseStructure outline={course.outline ?? []} />

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
              onClick={() => {
                setTab(item.key);
                setTopicFilter("all");
              }}
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

      {topics.length > 0 && tabItems.length > 0 && tab !== "playlists" ? (
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:flex-wrap md:overflow-visible">
          <span className="mr-1 shrink-0 text-[11px] font-black uppercase tracking-[0.14em] text-[#1A1814]/60">Topic</span>
          {chips.map((chip) => {
            const active = topicFilter === chip.id;
            return (
              <button
                key={chip.id}
                type="button"
                aria-pressed={active}
                disabled={chip.count === 0}
                onClick={() => setTopicFilter(chip.id)}
                className={`inline-flex min-h-[38px] shrink-0 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-[13px] font-extrabold transition disabled:cursor-not-allowed disabled:opacity-40 ${
                  active ? "border-[#1A1814] bg-[#1A1814] text-[#F6EFDC]" : "border-[#1A1814]/35 text-[#1A1814] hover:bg-[#1A1814]/[0.06]"
                }`}
              >
                {chip.id !== "all" ? <span className="h-2 w-2 rounded-full" style={{ background: chip.color }} /> : null}
                {chip.name}
                <span className="font-semibold opacity-65">{chip.count}</span>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="mt-6">
        {items.length === 0 ? (
          <div className="rounded-[20px] border-[1.5px] border-dashed border-[#1A1814]/30 bg-[#1A1814]/[0.06] p-7 text-[15px] font-semibold text-[#1A1814]/70">
            Nothing here yet for this course.
          </div>
        ) : tab === "videos" ? (
          <VideosPanel key={`videos-${topicFilter}`} videos={items} topics={topics} bookmarks={bookmarks} toggleBookmark={toggleBookmark} where={flagWhere} />
        ) : tab === "playlists" ? (
          <PlaylistsPanel key={`playlists-${topicFilter}`} playlists={items} topics={topics} bookmarks={bookmarks} toggleBookmark={toggleBookmark} where={flagWhere} />
        ) : (
          <TileGrid key={tab} items={items} topics={topics} bookmarks={bookmarks} toggleBookmark={toggleBookmark} />
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
  accent,
  onClick,
}: {
  accent?: string;
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
      style={accent ? { borderLeft: `3px solid ${accent}` } : undefined}
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

function VideosPanel({ videos: given, topics, bookmarks, toggleBookmark, where }: { videos: MaterialRow[]; topics: TopicView[]; bookmarks: string[]; toggleBookmark: (id: string) => void; where: string }) {
  // Play in the same order the list shows: grouped by topic.
  const groups = groupByTopic(given, topics);
  const videos = groups.flatMap((group) => group.items);
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
              {current ? <TopicTag topic={topicOf(current, topics)} /> : null}
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
              {current ? (
                <FlagButton
                  tone="dark"
                  target={{
                    type: "video",
                    key: `video:${current.id}`,
                    title: current.courseTitle,
                    location: `${where} · Videos · ${position + 1} of ${playable.length}`,
                    link: adminMaterialsLink(current.departmentId),
                  }}
                />
              ) : null}
            </div>
          </div>
        </>
      }
      list={
        <>
          <p className="px-1.5 pb-2 pt-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#F6EFDC]/55">Videos · {videos.length}</p>
          {groups.map((group) => (
            <div key={group.topic?.id ?? NO_TOPIC}>
              <ListTopicHeading group={group} show={topics.length > 0} />
              {group.items.map((video) => {
            const index = videos.indexOf(video);
            const off = video.available === false || !getCourseMaterialVideoId(video);
            return (
              <ListRow
                key={video.id}
                accent={topics.length > 0 ? group.topic?.color ?? "#5A4F3A" : undefined}
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
            </div>
          ))}
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
      if (!listId && (playlist.extraVideos?.length ?? 0) > 0) {
        // Built by hand from single videos: nothing to read from YouTube.
        setState((prev) => ({ ...prev, [playlist.id]: { status: "ready", data: { playlistId: "", title: playlist.courseTitle, channel: "", videos: [], source: "custom" } } }));
        continue;
      }
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

/* Lessons are solid red, worked examples solid blue. Only used inside an opened playlist. */
const LESSON_RED = "#C62828";
const WORKED_BLUE = "#1E5BC6";

type WatchVideo = { videoId: string; title: string; position: number; channel?: string; kind?: "lesson" | "worked"; minutes?: number };
type VideoFilter = "all" | "lesson" | "worked";

/** "Chapter 2: Force Systems" → { num: "2", name: "Force Systems" }. Anything else keeps its whole title. */
function chapterParts(title: string) {
  const match = title.match(/^\s*(?:chapter|ch\.?)\s*(\d+)\s*[:.\-–]\s*(.+)$/i);
  return match ? { num: match[1], name: match[2].trim() } : { num: null as string | null, name: title };
}

/** "2.2.1 Vector addition of forces · Case 2: Trig" → subtopic, its number and name, and the part after the dot. */
function videoParts(title: string) {
  const cut = title.indexOf(" · ");
  const sub = cut >= 0 ? title.slice(0, cut) : title;
  const rest = cut >= 0 ? title.slice(cut + 3) : "";
  const numbered = sub.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  return { sub, rest, num: numbered ? numbered[1] : null, name: numbered ? numbered[2] : sub };
}

function hoursAndMinutes(total: number) {
  const hours = Math.floor(total / 60);
  return hours ? `${hours} h ${total % 60} min` : `${total} min`;
}

function KindTag({ kind, long }: { kind?: "lesson" | "worked"; long?: boolean }) {
  if (!kind) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-[5px] font-black tracking-[0.04em] text-white ${long ? "px-2.5 py-1 text-[11px]" : "w-[62px] py-[3px] text-[10px]"}`}
      style={{ background: kind === "worked" ? WORKED_BLUE : LESSON_RED }}
    >
      {kind === "worked" ? (long ? "WORKED EXAMPLE" : "WORKED") : "LESSON"}
    </span>
  );
}

function PlaylistsPanel({ playlists: given, topics, bookmarks, toggleBookmark, where }: { playlists: MaterialRow[]; topics: TopicView[]; bookmarks: string[]; toggleBookmark: (id: string) => void; where: string }) {
  const ordered = groupByTopic(given, topics).flatMap((group) => group.items);
  const handBuilt = ordered.filter((playlist) => !parseYouTubePlaylistId(playlist.url));
  const fromYouTube = ordered.filter((playlist) => Boolean(parseYouTubePlaylistId(playlist.url)));
  const playlists = [...handBuilt, ...fromYouTube];
  const loaded = usePlaylists(playlists);
  const [openId, setOpenId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [filter, setFilter] = useState<VideoFilter>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const topRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLElement>(null);

  const visibleVideos = (entry: MaterialRow): WatchVideo[] => {
    const state = loaded[entry.id];
    if (state?.status !== "ready") return [];
    const hidden = new Set(entry.hiddenVideos ?? []);
    const own = state.data.videos.filter((video) => !hidden.has(video.videoId));
    const ownIds = new Set(own.map((video) => video.videoId));
    // Videos the administrator added on top of the playlist play after its own.
    const extras = (entry.extraVideos ?? [])
      .filter((video) => !ownIds.has(video.videoId))
      .map((video, i) => ({ videoId: video.videoId, title: video.title, position: own.length + i, channel: video.channel, kind: video.kind, minutes: video.minutes }));
    return [...own, ...extras];
  };

  const channelOf = (playlist: MaterialRow) => {
    const state = loaded[playlist.id];
    const provider = playlist.provider?.replace(/\s*-\s*YouTube$/i, "") ?? "";
    return state?.status === "ready" ? state.data.channel || provider : provider;
  };

  function openPlaylist(id: string, at = 0, play = false) {
    setOpenId(id);
    setIndex(at);
    setStarted(play);
    setFilter("all");
    setExpanded({});
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  const open = playlists.find((playlist) => playlist.id === openId) ?? null;

  /* ── Landing: one card per playlist ── */
  if (!open) {
    const chapterHeading = handBuilt.some((playlist) => chapterParts(playlist.courseTitle).num) ? "Chapters" : "Playlists";
    return (
      <div ref={topRef} className="@container flex flex-col gap-8">
        {handBuilt.length > 0 ? (
          <section>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[20px] font-black text-[#1A1814]">{chapterHeading}</h2>
              <span className="text-[13px] font-semibold text-[#1A1814]/65">Every video is named after the subtopic it covers.</span>
            </div>
            <div className="grid grid-cols-1 gap-3.5 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4">
              {handBuilt.map((playlist) => {
                const { num, name } = chapterParts(playlist.courseTitle);
                const videos = visibleVideos(playlist);
                const minutes = videos.reduce((sum, video) => sum + (video.minutes ?? 0), 0);
                const worked = videos.filter((video) => video.kind === "worked").length;
                const lessons = videos.filter((video) => video.kind === "lesson").length;
                const off = playlist.available === false;
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={off}
                    onClick={() => openPlaylist(playlist.id)}
                    className="flex min-h-[150px] flex-col overflow-hidden rounded-[18px] bg-[#1A1814] text-left text-[#F6EFDC] shadow-[0_2px_12px_rgba(0,0,0,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="flex flex-1 flex-col gap-2.5 px-4 pb-3.5 pt-4">
                    <span className="flex items-baseline justify-between gap-3">
                      {num ? <span className="text-[40px] font-black leading-[0.9] tracking-[-0.03em] text-[#E9BC3A]">{num}</span> : <ListVideo className="h-7 w-7 text-[#E9BC3A]" />}
                      <span className="text-right text-[11px] font-bold text-[#F6EFDC]/55">
                        {videos.length} videos{minutes ? ` · ${hoursAndMinutes(minutes)}` : ""}
                      </span>
                    </span>
                    <span className="text-[16px] font-black leading-tight">{name}</span>
                    <span className="mt-auto flex items-center gap-2 border-t border-[#2E2A22] pt-2.5">
                      <span className="text-[11px] font-bold text-[#F6EFDC]/60">
                        {off ? "Not available at the moment" : lessons || worked ? `${lessons} lessons · ${worked} worked examples` : channelOf(playlist)}
                      </span>
                      <span className="flex-1" />
                      {!off ? <span className="text-[12px] font-black text-[#E9BC3A]">Open →</span> : null}
                    </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        {fromYouTube.length > 0 ? (
          <section>
            <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-[20px] font-black text-[#1A1814]">{handBuilt.length ? "Full courses by channel" : "Playlists"}</h2>
              <span className="text-[13px] font-semibold text-[#1A1814]/65">Whole YouTube series, for watching start to finish.</span>
            </div>
            <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-3 @5xl:grid-cols-5">
              {fromYouTube.map((playlist) => {
                const state = loaded[playlist.id];
                const videos = visibleVideos(playlist);
                const off = playlist.available === false;
                return (
                  <button
                    key={playlist.id}
                    type="button"
                    disabled={off}
                    onClick={() => openPlaylist(playlist.id)}
                    className="flex flex-col gap-2 overflow-hidden rounded-[14px] bg-[#1A1814] pb-3 pt-2 text-left text-[#F6EFDC] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <span className="relative mx-2 block aspect-video overflow-hidden rounded-lg bg-[#2B261D]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {videos[0] ? <img src={thumb(videos[0].videoId)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" /> : null}
                      <span className="absolute inset-y-0 right-0 flex w-[42px] flex-col items-center justify-center gap-0.5 bg-black/75 text-[11px] font-extrabold">
                        <ListVideo className="h-4 w-4" />
                        {state?.status === "ready" ? videos.length : "…"}
                      </span>
                    </span>
                    <span className="line-clamp-2 px-3 text-[13px] font-extrabold leading-tight">{playlist.courseTitle}</span>
                    <span className="px-3 text-[11px] text-[#F6EFDC]/55">{off ? "Not available at the moment" : channelOf(playlist)}</span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  /* ── Watching: the cards move to a strip on top, player and outline below ── */
  const openState = loaded[open.id];
  const videos = visibleVideos(open);
  const matches = (video: WatchVideo) => filter === "all" || video.kind === filter;
  const current = videos[index] ?? videos[0];
  const step = (by: 1 | -1) => {
    if (!videos.length) return;
    for (let n = 1; n <= videos.length; n += 1) {
      const at = (index + by * n + videos.length * n) % videos.length;
      if (matches(videos[at])) {
        setIndex(at);
        setStarted(true);
        return;
      }
    }
  };
  const nextAt = (() => {
    for (let n = 1; n < videos.length; n += 1) {
      const at = (index + n) % videos.length;
      if (matches(videos[at])) return at;
    }
    return -1;
  })();
  const hasKinds = videos.some((video) => video.kind);
  const structured = videos.some((video) => videoParts(video.title).num);
  const openTitle = chapterParts(open.courseTitle);
  const openChannel = channelOf(open);
  const listId = parseYouTubePlaylistId(open.url);
  const youtubeLink = listId ? buildYouTubePlaylistUrl(listId) : open.url;
  const totalMinutes = videos.reduce((sum, video) => sum + (video.minutes ?? 0), 0);
  const workedCount = videos.filter((video) => video.kind === "worked").length;
  const label = (video: WatchVideo) => {
    const parts = videoParts(video.title);
    if (!structured) return video.title;
    return parts.rest && parts.rest !== "Worked example" ? parts.rest : parts.name;
  };
  const currentParts = current ? videoParts(current.title) : null;

  // Consecutive videos that share a subtopic make one group in the outline.
  const groups: Array<{ key: string; num: string | null; name: string; items: Array<{ video: WatchVideo; at: number }> }> = [];
  videos.forEach((video, at) => {
    const parts = videoParts(video.title);
    const key = structured ? parts.sub : "all";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push({ video, at });
    else groups.push({ key, num: structured ? parts.num : null, name: structured ? parts.name : "", items: [{ video, at }] });
  });
  const currentKey = structured && currentParts ? currentParts.sub : "all";

  return (
    <div ref={topRef} className="scroll-mt-4">
      <div role="tablist" aria-label="Playlists" className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => setOpenId(null)}
          aria-label="All playlists"
          title="All playlists"
          className="flex min-h-[60px] w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A1814]/[0.12] text-[#1A1814] transition hover:bg-[#1A1814]/[0.2]"
        >
          <LayoutGrid className="h-5 w-5" />
        </button>
        {playlists.map((playlist) => {
          const on = playlist.id === open.id;
          const parts = chapterParts(playlist.courseTitle);
          return (
            <button
              key={playlist.id}
              type="button"
              role="tab"
              aria-selected={on}
              disabled={playlist.available === false}
              onClick={() => openPlaylist(playlist.id)}
              className={`flex min-h-[58px] min-w-[112px] flex-1 flex-col gap-[3px] overflow-hidden rounded-xl pb-2 pt-2.5 text-left transition disabled:opacity-40 ${on ? "bg-[#1A1814] text-[#F6EFDC]" : "bg-[#1A1814]/10 text-[#1A1814] hover:bg-[#1A1814]/[0.16]"}`}
            >
              <span className={`px-2.5 text-[17px] font-black leading-none ${on ? "text-[#E9BC3A]" : "text-[#1A1814]/55"}`}>{parts.num ?? "▶"}</span>
              <span className="line-clamp-2 px-2.5 text-[11px] font-extrabold leading-tight">{parts.num ? parts.name : playlist.courseTitle}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start">
        <section ref={playerRef} aria-label="Player" className="min-w-0 flex-1 scroll-mt-4 rounded-[22px] bg-[#1A1814] p-3.5 text-[#F6EFDC] shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
          {openState?.status === "error" ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-[14px] border border-[#3A3428] bg-[#221F19] p-6 text-center">
              <p className="text-[14px] text-[#F6EFDC]/75">{openState.message}</p>
              <a href={youtubeLink} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[14px] font-extrabold text-[#F6EFDC]">
                Open on YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <Stage videoId={current?.videoId} title={current?.title ?? open.courseTitle} autoplay={started} onStart={() => setStarted(true)} />
          )}
          <div className="px-1.5 pb-1 pt-4">
            <p className="text-[12px] font-extrabold text-[#E9BC3A]">
              {openTitle.num ? `Chapter ${openTitle.num}` : open.courseTitle}
              {structured && currentParts ? ` · ${currentParts.sub}` : ""}
            </p>
            <h2 className="mt-1.5 text-[22px] font-black leading-tight">{current ? label(current) : open.courseTitle}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2.5">
              <KindTag kind={current?.kind} long />
              <span className="text-[14px] text-[#F6EFDC]/68">
                {current?.channel || openChannel ? `Video by ${current?.channel || openChannel}` : ""}
                {current?.minutes ? ` · ${current.minutes} min` : ""}
                {videos.length ? ` · ${index + 1} of ${videos.length}` : ""}
              </span>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => step(-1)} disabled={videos.length < 2} className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-[#5A4F3A] px-4 text-[13px] font-extrabold transition hover:bg-[#F6EFDC]/5 disabled:opacity-40">
                ← Previous
              </button>
              <button type="button" onClick={() => step(1)} disabled={videos.length < 2} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#8F6500] px-5 text-[13px] font-extrabold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-40">
                Next video <SkipForward className="h-4 w-4" />
              </button>
              <SaveButton saved={bookmarks.includes(open.id)} onClick={() => toggleBookmark(open.id)} label={open.courseTitle} />
              <FlagButton
                tone="dark"
                scopes={[
                  ...(current
                    ? [{
                        label: "This video",
                        target: {
                          type: "video" as const,
                          key: `video:${open.id}:${current.videoId}`,
                          title: current.title,
                          location: `${where} · ${open.courseTitle} · video ${index + 1} of ${videos.length}`,
                          link: adminMaterialsLink(open.departmentId),
                        },
                      }]
                    : []),
                  {
                    label: "Whole playlist",
                    target: {
                      type: "playlist" as const,
                      key: `playlist:${open.id}`,
                      title: open.courseTitle,
                      location: `${where} · ${videos.length} videos`,
                      link: adminMaterialsLink(open.departmentId),
                    },
                  },
                ]}
              />
              <a href={youtubeLink} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-bold text-[#E9BC3A] hover:underline">
                On YouTube <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
            {nextAt >= 0 ? (
              <div className="mt-4 flex items-baseline gap-2.5 border-t border-[#3A3428] pt-3.5">
                <span className="shrink-0 text-[11px] font-black tracking-[0.12em] text-[#F6EFDC]/50">UP NEXT</span>
                <span className="truncate text-[13px] font-bold text-[#F6EFDC]/85">
                  {structured
                    ? label(videos[nextAt]) === videoParts(videos[nextAt].title).name
                      ? videoParts(videos[nextAt].title).sub
                      : `${videoParts(videos[nextAt].title).sub} · ${label(videos[nextAt])}`
                    : label(videos[nextAt])}
                  {videos[nextAt].channel ? ` — ${videos[nextAt].channel}` : ""}
                </span>
              </div>
            ) : null}
          </div>
        </section>

        <aside aria-label="Playlist outline" className="flex w-full shrink-0 flex-col overflow-hidden rounded-[22px] bg-[#1A1814] text-[#F6EFDC] shadow-[0_2px_14px_rgba(0,0,0,0.22)] lg:max-h-[720px] lg:w-[400px]">
          <div className="border-b border-[#3A3428] px-4 pb-3 pt-4">
            <p className="text-[11px] font-black tracking-[0.12em] text-[#E9BC3A]">{openTitle.num ? `CHAPTER ${openTitle.num}` : "PLAYLIST"}</p>
            <p className="mt-1 text-[19px] font-black leading-tight">{openTitle.name}</p>
            <p className="mt-1 text-[12px] text-[#F6EFDC]/60">
              {videos.length} videos{totalMinutes ? ` · ${hoursAndMinutes(totalMinutes)}` : ""}
              {hasKinds ? ` · ${workedCount} worked examples` : openChannel ? ` · ${openChannel}` : ""}
            </p>
            {openState?.status === "ready" && openState.data.source === "feed" ? (
              <p className="mt-1 text-[11px] text-[#F6EFDC]/45">Showing the newest {videos.length}. The full list is on YouTube.</p>
            ) : null}
            {hasKinds ? (
              <div role="group" aria-label="Show" className="mt-3 grid grid-cols-3 gap-1 rounded-[10px] bg-[#26231C] p-1">
                {(
                  [
                    ["all", "All"],
                    ["lesson", "Lessons"],
                    ["worked", "Worked examples"],
                  ] as const
                ).map(([key, text]) => {
                  const on = filter === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setFilter(key)}
                      style={on && key !== "all" ? { background: key === "worked" ? WORKED_BLUE : LESSON_RED } : undefined}
                      className={`h-8 rounded-[7px] text-[12px] font-extrabold transition ${on ? (key === "all" ? "bg-[#F6EFDC] text-[#1A1814]" : "text-white") : "text-[#F6EFDC]/70 hover:text-[#F6EFDC]"}`}
                    >
                      {text}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 pt-1.5 [scrollbar-color:#3A3428_transparent] [scrollbar-width:thin]">
            {openState?.status === "loading" ? <p className="px-2 py-4 text-[13px] text-[#F6EFDC]/60">Loading the playlist…</p> : null}
            {groups.map((group) => {
              const rows = group.items.filter(({ video }) => matches(video));
              if (!rows.length) return null;
              const isOpen = !structured || (expanded[group.key] ?? group.key === currentKey);
              const here = group.key === currentKey;
              return (
                <div key={group.key + group.items[0].at} className={structured ? "border-b border-[#2E2A22]" : ""}>
                  {structured ? (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setExpanded((prev) => ({ ...prev, [group.key]: !isOpen }))}
                      className="flex min-h-[44px] w-full items-center gap-2.5 px-1.5 py-2.5 text-left"
                    >
                      {group.num ? (
                        <span className={`shrink-0 rounded-md px-1.5 py-[3px] text-[11px] font-black ${here ? "bg-[#E9BC3A] text-[#1A1814]" : "bg-[#3A3428] text-[#F6EFDC]/85"}`}>{group.num}</span>
                      ) : null}
                      <span className="min-w-0 flex-1 text-[14px] font-extrabold leading-tight">{group.name}</span>
                      <span className="shrink-0 text-[11px] font-bold text-[#F6EFDC]/50">{rows.length}</span>
                      <span aria-hidden="true" className="w-3 text-[12px] text-[#F6EFDC]/50">{isOpen ? "▾" : "▸"}</span>
                    </button>
                  ) : null}
                  {isOpen ? (
                    <div className="pb-2">
                      {rows.map(({ video, at }) => {
                        const on = at === index;
                        return (
                          <button
                            key={`${video.videoId}-${at}`}
                            type="button"
                            aria-current={on ? "true" : undefined}
                            onClick={() => {
                              setIndex(at);
                              setStarted(true);
                              // On a phone the list sits under the player: bring the player back into view.
                              if (window.innerWidth < 1024) playerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-[10px] py-1.5 pl-2 pr-1.5 text-left transition ${on ? "bg-[#E9BC3A]/[0.14]" : "hover:bg-[#F6EFDC]/[0.05]"}`}
                          >
                            <span className={`w-5 shrink-0 text-right text-[11px] font-extrabold ${on ? "text-[#E9BC3A]" : "text-[#F6EFDC]/40"}`}>{on ? "▶" : at + 1}</span>
                            <span className="relative aspect-video w-[80px] shrink-0 overflow-hidden rounded-md bg-[#2B261D]">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={thumb(video.videoId)} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-[13px] font-extrabold leading-tight">{label(video)}</span>
                              <span className="mt-0.5 block truncate text-[11px] text-[#F6EFDC]/55">
                                {video.channel ?? openChannel}
                                {video.minutes ? ` · ${video.minutes} min` : ""}
                              </span>
                            </span>
                            <KindTag kind={video.kind} />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </div>
  );
}

/* ─── Tiles (slides, PDFs, past questions, links) ──────────────────────── */

const TILE_LOOK: Record<string, { icon: ReactNode; bg: string; fg: string; badge: string }> = {
  "Lecture Slides": { icon: <Presentation className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#F0C84A]", fg: "text-[#1A1814]", badge: "Slides" },
  "PDF Document": { icon: <FileText className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#F6EFDC]", fg: "text-[#1A1814]", badge: "PDF" },
  "Past Questions": { icon: <FileQuestion className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#D9CCF4]", fg: "text-[#2A1A5E]", badge: "Past questions" },
  "External Link": { icon: <Link2 className="h-9 w-9" strokeWidth={1.6} />, bg: "bg-[#8F6500]", fg: "text-[#F6EFDC]", badge: "Link" },
};

function TileGrid({ items, topics, bookmarks, toggleBookmark }: { items: MaterialRow[]; topics: TopicView[]; bookmarks: string[]; toggleBookmark: (id: string) => void }) {
  const groups = groupByTopic(items, topics);
  return (
    <div className="flex flex-col gap-7">
      {groups.map((group) => (
        <section key={group.topic?.id ?? NO_TOPIC}>
          {topics.length > 0 ? (
            <div className="mb-3 flex items-center gap-2.5">
              <span className="h-3 w-3 rounded-[3px]" style={{ background: group.topic?.color ?? "#8F8671" }} />
              <h2 className="text-[18px] font-black text-[#1A1814]">{group.topic?.name ?? "Not in a topic"}</h2>
              <span className="text-[13px] font-bold text-[#1A1814]/55">{group.items.length}</span>
              <span className="h-[1.5px] flex-1 bg-[#1A1814]/[0.18]" />
            </div>
          ) : null}
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {group.items.map((item) => {
        const look = TILE_LOOK[item.type] ?? TILE_LOOK["External Link"];
        const off = item.available === false;
        const saved = bookmarks.includes(item.id);
        return (
          <article
            key={item.id}
            style={topics.length > 0 ? { borderTop: `4px solid ${group.topic?.color ?? "#8F8671"}` } : undefined}
            className={`flex flex-col gap-3 rounded-[18px] bg-[#1A1814] p-2.5 pb-3.5 shadow-[0_2px_14px_rgba(0,0,0,0.18)] ${off ? "opacity-55" : ""}`}
          >
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
        </section>
      ))}
    </div>
  );
}
