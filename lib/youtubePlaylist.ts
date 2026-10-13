/**
 * YouTube playlists: parse a playlist id from a link, and (server side only) read a playlist's videos.
 *
 * Reading uses the YouTube Data API when YOUTUBE_API_KEY is set (the whole playlist, in YouTube's order).
 * Without the key it falls back to YouTube's public feed, which only lists the newest 15 videos.
 */

export const YOUTUBE_PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{12,64}$/;

export interface PlaylistVideo {
  videoId: string;
  title: string;
  position: number;
}

export interface PlaylistDetails {
  playlistId: string;
  title: string;
  channel: string;
  videos: PlaylistVideo[];
  /** "api" = full playlist; "feed" = newest 15 only (no API key configured). */
  source: "api" | "feed";
}

/** Accepts a playlist link (youtube.com/playlist?list=…, or a watch link that carries &list=…) or a bare playlist id. */
export function parseYouTubePlaylistId(value: string | undefined | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return undefined;
  if (/^(PL|UU|OL|LL|FL|RD)[A-Za-z0-9_-]{10,62}$/.test(trimmed)) return trimmed;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (!(host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be")) return undefined;
  const list = url.searchParams.get("list") ?? "";
  return YOUTUBE_PLAYLIST_ID_PATTERN.test(list) ? list : undefined;
}

export function buildYouTubePlaylistUrl(playlistId: string) {
  return `https://www.youtube.com/playlist?list=${playlistId}`;
}

/** Plays the whole playlist in one embedded player, starting at a given position (0-based). */
export function buildYouTubePlaylistEmbedUrl(playlistId: string, index = 0) {
  return `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&index=${index}&rel=0`;
}

const REVALIDATE_SECONDS = 60 * 60;
const MAX_VIDEOS = 300;
const UNPLAYABLE = new Set(["Deleted video", "Private video"]);

function decodeXml(text: string) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

async function fetchFromApi(playlistId: string, key: string): Promise<PlaylistDetails> {
  const base = "https://www.googleapis.com/youtube/v3";
  const metaResponse = await fetch(`${base}/playlists?part=snippet&id=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(key)}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!metaResponse.ok) throw new Error(`YouTube returned ${metaResponse.status} for the playlist.`);
  const meta = (await metaResponse.json()) as { items?: Array<{ snippet?: { title?: string; channelTitle?: string } }> };
  const snippet = meta.items?.[0]?.snippet;
  if (!snippet) throw new Error("That playlist was not found. It may be private.");

  const videos: PlaylistVideo[] = [];
  let pageToken = "";
  do {
    const itemsResponse = await fetch(
      `${base}/playlistItems?part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}&key=${encodeURIComponent(key)}${pageToken ? `&pageToken=${pageToken}` : ""}`,
      { next: { revalidate: REVALIDATE_SECONDS } },
    );
    if (!itemsResponse.ok) throw new Error(`YouTube returned ${itemsResponse.status} for the playlist's videos.`);
    const page = (await itemsResponse.json()) as {
      nextPageToken?: string;
      items?: Array<{ snippet?: { title?: string; position?: number; resourceId?: { videoId?: string } } }>;
    };
    for (const item of page.items ?? []) {
      const videoId = item.snippet?.resourceId?.videoId;
      const title = item.snippet?.title ?? "";
      if (!videoId || UNPLAYABLE.has(title)) continue;
      videos.push({ videoId, title, position: item.snippet?.position ?? videos.length });
    }
    pageToken = page.nextPageToken ?? "";
  } while (pageToken && videos.length < MAX_VIDEOS);

  return { playlistId, title: snippet.title ?? "Playlist", channel: snippet.channelTitle ?? "", videos, source: "api" };
}

async function fetchFromFeed(playlistId: string): Promise<PlaylistDetails> {
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error(response.status === 404 ? "That playlist was not found. It may be private." : `YouTube returned ${response.status} for the playlist.`);
  const xml = await response.text();
  const head = xml.split("<entry>")[0] ?? "";
  const title = decodeXml(head.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Playlist");
  const channel = decodeXml(head.match(/<author>\s*<name>([\s\S]*?)<\/name>/)?.[1] ?? "");
  const videos: PlaylistVideo[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const videoId = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/)?.[1]?.trim();
    const videoTitle = decodeXml(entry.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "");
    if (videoId) videos.push({ videoId, title: videoTitle, position: videos.length });
  }
  return { playlistId, title, channel, videos, source: "feed" };
}

/** Server only: the playlist's title, channel and playable videos in YouTube's order (cached for an hour). */
export async function fetchYouTubePlaylist(playlistId: string): Promise<PlaylistDetails> {
  if (!YOUTUBE_PLAYLIST_ID_PATTERN.test(playlistId)) throw new Error("That is not a valid playlist id.");
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (key) {
    try {
      return await fetchFromApi(playlistId, key);
    } catch (error) {
      console.warn("[Back2Basics with Kwamina] YouTube Data API failed, falling back to the public feed", error);
    }
  }
  return fetchFromFeed(playlistId);
}

/** Server only: one video's title, for adding a single video to a playlist (cached for an hour). */
export async function fetchYouTubeVideoTitle(videoId: string): Promise<string> {
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (key) {
    try {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(videoId)}&key=${encodeURIComponent(key)}`, { next: { revalidate: REVALIDATE_SECONDS } });
      if (response.ok) {
        const body = (await response.json()) as { items?: Array<{ snippet?: { title?: string } }> };
        const title = body.items?.[0]?.snippet?.title;
        if (title) return title;
        throw new Error("That video was not found. It may be private or deleted.");
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("That video")) throw error;
      console.warn("[Back2Basics with Kwamina] YouTube Data API failed for a video, falling back to oEmbed", error);
    }
  }
  const watch = `https://www.youtube.com/watch?v=${videoId}`;
  const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watch)}&format=json`, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!response.ok) throw new Error("That video was not found. It may be private or deleted.");
  const body = (await response.json()) as { title?: string };
  return body.title ?? "Video";
}
