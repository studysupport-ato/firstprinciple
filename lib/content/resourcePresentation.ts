import type { YouTubeResourceData } from "./types/resource";

export function getYouTubeThumbnailUrl(data: Pick<YouTubeResourceData, "videoId" | "thumbnail">) {
  return data.thumbnail?.url ?? (data.videoId ? `https://img.youtube.com/vi/${encodeURIComponent(data.videoId)}/hqdefault.jpg` : undefined);
}

export function getYouTubeSourceLabel(sourceType: YouTubeResourceData["sourceType"]) {
  return sourceType === "ato" ? "Ato's Tutorial" : "Recommended";
}
