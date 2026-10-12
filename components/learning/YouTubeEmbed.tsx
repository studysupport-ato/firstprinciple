"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { buildYouTubeEmbedUrl, getYouTubeThumbnailUrl } from "@/lib/youtube";

/**
 * Shared YouTube embed — thumbnail/card first, iframe only after user activates.
 * Renders only a controlled youtube-nocookie embed derived from the validated videoId.
 */
export function YouTubeEmbed({ videoId, title, className = "" }: { videoId: string; title: string; className?: string }) {
  const [active, setActive] = useState(false);
  if (active) {
    return (
      <div className={`relative aspect-video w-full overflow-hidden rounded-2xl bg-black ${className}`}>
        <iframe
          src={buildYouTubeEmbedUrl(videoId)}
          title={title}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={`Play video: ${title}`}
      className={`group relative block aspect-video w-full overflow-hidden rounded-2xl bg-black text-left ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={getYouTubeThumbnailUrl(videoId)} alt={`Thumbnail for ${title}`} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90 transition group-hover:opacity-100" />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#FFC700] text-black shadow-lg transition group-hover:scale-105">
          <Play className="h-6 w-6" fill="currentColor" />
        </span>
      </span>
      <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white">YouTube</span>
    </button>
  );
}
