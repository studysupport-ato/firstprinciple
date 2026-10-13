import type { NextRequest } from "next/server";

import { parseYouTubeVideoId } from "@/lib/youtube";
import { fetchYouTubeVideoTitle } from "@/lib/youtubePlaylist";

/** GET /api/youtube/video?v=<video link or id> → { videoId, title }. Used when adding a video to a playlist. */
export async function GET(request: NextRequest) {
  const videoId = parseYouTubeVideoId(request.nextUrl.searchParams.get("v"));
  if (!videoId) return Response.json({ error: "Paste a YouTube video link." }, { status: 400 });
  try {
    const title = await fetchYouTubeVideoTitle(videoId);
    return Response.json({ videoId, title }, { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "That video could not be read." }, { status: 502 });
  }
}
