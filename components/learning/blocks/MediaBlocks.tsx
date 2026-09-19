"use client";

import type { ImageBlock as ImageBlockData, VideoBlock as VideoBlockData } from "@/lib/content/types/lesson";
import { assetUrl, getAssetById } from "@/lib/content/assets";

export function ImageBlock({ assetId, src, alt, caption }: ImageBlockData) {
  const asset = assetId ? getAssetById(assetId) : undefined;
  return <figure className="space-y-2"><img src={assetUrl(assetId, src)} alt={alt || asset?.altText || ""} className="h-auto w-full rounded-2xl border border-[#E5E5E5]" />{caption ? <figcaption className="font-sans text-xs text-[#666666]">{caption}</figcaption> : null}</figure>;
}

export function VideoBlock({ assetId, src, title }: VideoBlockData) {
  const asset = assetId ? getAssetById(assetId) : undefined;
  const poster = typeof asset?.metadata?.poster === "string" && asset.metadata.poster ? asset.metadata.poster : undefined;
  const duration = typeof asset?.duration === "number" ? asset.duration : undefined;
  const durationLabel =
    duration !== undefined ? `${Math.floor(duration / 60)}:${String(Math.round(duration % 60)).padStart(2, "0")}` : undefined;
  return (
    <div className="space-y-2">
      <video src={assetUrl(assetId, src)} title={title} controls poster={poster} className="w-full rounded-2xl border border-[#E5E5E5]" />
      <p className="font-sans text-xs text-[#666666]">
        {title}
        {durationLabel ? <span className="text-[#999999]"> · {durationLabel}</span> : null}
      </p>
    </div>
  );
}
