"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";

export interface GalleryVideo {
  id: string;
  title: string;
}

const YOUTUBE_ID = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([A-Za-z0-9_-]{11})/;

/**
 * One video per line. Format: `https://youtube.com/watch?v=ID` or `link | custom title`.
 * Returns an empty list when no line holds a YouTube link (then the block falls back to a plain file player).
 */
export function parseYouTubeLinks(src: string): GalleryVideo[] {
  const out: GalleryVideo[] = [];
  for (const raw of (src || "").split(/\r?\n/)) {
    const [link, ...rest] = raw.split("|");
    const match = (link || "").trim().match(YOUTUBE_ID);
    if (match) out.push({ id: match[1], title: rest.join("|").trim() });
  }
  return out;
}

const backdrop: CSSProperties = {
  backgroundColor: "#3B1019",
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),radial-gradient(80% 70% at 50% 0%,#52182A 0%,rgba(59,16,25,0) 70%)",
  backgroundSize: "32px 32px,32px 32px,100% 100%",
};
const serif = '"STIX Two Text","Times New Roman",Georgia,serif';
const sans = "Inter,system-ui,sans-serif";

function Rail({ children, onScrollIndex, count }: { children: ReactNode; onScrollIndex?: (index: number) => void; count: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, moved: false, startX: 0, startLeft: 0 });

  const report = useCallback(() => {
    const el = ref.current;
    if (!el || !onScrollIndex) return;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (atEnd) return onScrollIndex(count - 1);
    const cards = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((card, i) => {
      const d = Math.abs(card.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    onScrollIndex(best);
  }, [count, onScrollIndex]);

  useEffect(() => {
    report();
  }, [report]);

  const onDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || !ref.current) return;
    drag.current = { down: true, moved: false, startX: e.clientX, startLeft: ref.current.scrollLeft };
  };
  const onMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d.down || !ref.current) return;
    const dx = e.clientX - d.startX;
    if (Math.abs(dx) > 5) {
      d.moved = true;
      ref.current.style.scrollSnapType = "none";
    }
    if (d.moved) ref.current.scrollLeft = d.startLeft - dx;
  };
  const onUp = () => {
    if (!drag.current.down) return;
    drag.current.down = false;
    if (ref.current) ref.current.style.scrollSnapType = "";
  };

  return (
    <div
      ref={ref}
      onScroll={report}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onClickCapture={(e) => {
        if (drag.current.moved) {
          e.stopPropagation();
          e.preventDefault();
          drag.current.moved = false;
        }
      }}
      className="flex cursor-grab gap-4 overflow-x-auto px-0.5 pb-3 pt-1 [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {children}
    </div>
  );
}

function Thumb({ video, index, total, selected, mini, onPick }: { video: GalleryVideo; index: number; total: number; selected: boolean; mini?: boolean; onPick: () => void }) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Play ${video.title}`}
      className="shrink-0 snap-start overflow-hidden rounded-[14px] bg-[#2A0A11] text-left text-white transition-opacity duration-300"
      style={{
        flexBasis: mini ? "min(210px,56%)" : "min(360px,80%)",
        opacity: mini && !selected ? 0.5 : 1,
        boxShadow: selected
          ? "inset 0 0 0 2px rgba(255,255,255,.45),0 12px 28px rgba(0,0,0,.32)"
          : "inset 0 0 0 1px rgba(255,255,255,.08),0 12px 28px rgba(0,0,0,.32)",
      }}
    >
      <span className="relative block aspect-video overflow-hidden bg-[#22080F]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`} alt="" loading="lazy" draggable={false} className="h-full w-full object-cover opacity-80" />
        <span className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(42,10,17,0) 40%,rgba(42,10,17,.75))" }} />
        <span className={`absolute flex items-center justify-center rounded-full bg-white/90 ${mini ? "bottom-2 right-2 h-[30px] w-[30px]" : "bottom-3 right-3 h-11 w-11"}`}>
          <svg width={mini ? 13 : 18} height={mini ? 13 : 18} viewBox="0 0 24 24" fill="#2A0A11" aria-hidden="true" style={{ marginLeft: 2 }}>
            <path d="M8 5l12 7-12 7z" />
          </svg>
        </span>
      </span>
      <span className={`block ${mini ? "px-[11px] pb-[11px] pt-[9px]" : "px-3.5 pb-3.5 pt-3"}`}>
        <span className="block text-[11px] font-semibold tracking-[0.1em]" style={{ fontFamily: sans, color: "rgba(255,236,214,.58)" }}>
          VIDEO {index + 1} OF {total}
        </span>
        <span className={`mt-1 block font-bold leading-[1.22] ${mini ? "text-sm" : "text-lg"}`} style={{ fontFamily: serif }}>
          {video.title}
        </span>
      </span>
    </button>
  );
}

export function VideoGallery({ heading, videos }: { heading?: string; videos: GalleryVideo[] }) {
  const [selected, setSelected] = useState<number>(videos.length === 1 ? 0 : -1);
  const [segment, setSegment] = useState(0);
  const [fetched, setFetched] = useState<Record<string, string>>({});

  // Real titles for links that were pasted without one.
  useEffect(() => {
    let alive = true;
    videos.forEach((v) => {
      if (v.title || fetched[v.id]) return;
      fetch(`https://noembed.com/embed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${v.id}`)}`)
        .then((r) => r.json())
        .then((j: { title?: string }) => {
          if (alive && j?.title) setFetched((prev) => ({ ...prev, [v.id]: j.title as string }));
        })
        .catch(() => undefined);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos]);

  const items = videos.map((v, i) => ({ ...v, title: v.title || fetched[v.id] || `Video ${i + 1}` }));
  const many = items.length > 1;
  const current = selected >= 0 ? items[selected] : undefined;

  return (
    <section className="overflow-hidden rounded-[18px] px-5 pb-6 pt-6 text-white sm:px-7" style={{ ...backdrop, fontFamily: serif }}>
      <h3
        onClick={() => {
          if (many && selected >= 0) setSelected(-1);
        }}
        className={`mb-4 text-[clamp(20px,3.2vw,30px)] font-medium italic leading-tight ${many && selected >= 0 ? "cursor-pointer" : ""}`}
        style={{ color: "rgba(255,236,214,.78)" }}
      >
        <b className="font-bold" style={{ color: "#FFC700" }}>Video</b>
        {heading ? <> {"—"} {"“"}{heading}{"”"}</> : null}
      </h3>

      {current ? (
        <div>
          <div className="overflow-hidden rounded-[14px] bg-black" style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,.1),0 16px 36px rgba(0,0,0,.4)" }}>
            <div className="relative aspect-video bg-black">
              <iframe
                key={current.id}
                src={`https://www.youtube-nocookie.com/embed/${current.id}?autoplay=${many ? 1 : 0}&rel=0&modestbranding=1&playsinline=1`}
                title={current.title}
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <div className="bg-[#2A0A11] px-3.5 pb-3.5 pt-3">
              <span className="block text-[11px] font-semibold tracking-[0.1em]" style={{ fontFamily: sans, color: "rgba(255,236,214,.58)" }}>
                VIDEO {selected + 1}{many ? ` OF ${items.length}` : ""}
              </span>
              <span className="mt-1 block text-lg font-bold leading-[1.22]">{current.title}</span>
            </div>
          </div>
          {many ? (
            <div className="mt-3.5">
              <Rail count={items.length}>
                {items.map((v, i) => (
                  <Thumb key={v.id + i} video={v} index={i} total={items.length} selected={i === selected} mini onPick={() => setSelected(i)} />
                ))}
              </Rail>
            </div>
          ) : null}
        </div>
      ) : (
        <div>
          <Rail count={items.length} onScrollIndex={setSegment}>
            {items.map((v, i) => (
              <Thumb key={v.id + i} video={v} index={i} total={items.length} selected={false} onPick={() => setSelected(i)} />
            ))}
          </Rail>
          <div className="mt-1.5 flex gap-2" aria-hidden="true">
            {items.map((v, i) => (
              <i key={v.id + i} className="block h-1 max-w-20 flex-1 rounded-sm transition-colors" style={{ background: i === segment ? "#FFC700" : "rgba(255,255,255,.18)" }} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
