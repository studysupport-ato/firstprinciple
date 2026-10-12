/** Shared YouTube helpers — metadata only. No video bytes, no uploads, no API. */

export const YOUTUBE_VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function parseYouTubeVideoId(value: string | undefined | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return undefined;
  // Bare ID (Ato may paste just the 11-char id).
  if (YOUTUBE_VIDEO_ID_PATTERN.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  // youtu.be/VIDEO_ID
  if (host === "youtu.be") {
    const candidate = url.pathname.split("/").filter(Boolean)[0] ?? "";
    return YOUTUBE_VIDEO_ID_PATTERN.test(candidate) ? candidate : undefined;
  }
  // youtube.com / youtube-nocookie.com / m.youtube.com / music.youtube.com
  if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtube-nocookie.com" || host.endsWith(".youtube-nocookie.com")) {
    const v = url.searchParams.get("v") ?? "";
    if (YOUTUBE_VIDEO_ID_PATTERN.test(v)) return v;
    const segments = url.pathname.split("/").filter(Boolean);
    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    const embedIndex = segments.findIndex((s) => ["embed", "shorts", "live", "v"].includes(s.toLowerCase()));
    if (embedIndex >= 0) {
      const candidate = segments[embedIndex + 1] ?? "";
      if (YOUTUBE_VIDEO_ID_PATTERN.test(candidate)) return candidate;
    }
  }
  return undefined;
}

export function buildYouTubeWatchUrl(videoId: string) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Privacy-enhanced, controlled embed derived only from the validated video ID. */
export function buildYouTubeEmbedUrl(videoId: string) {
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`;
}

export function getYouTubeThumbnailUrl(videoId: string) {
  return `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`;
}

export function getCourseMaterialVideoId(entry: { kind?: string; url: string; provider?: string }) {
  return parseYouTubeVideoId(entry.provider) ?? parseYouTubeVideoId(entry.url);
}
