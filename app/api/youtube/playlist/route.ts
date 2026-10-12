import type { NextRequest } from "next/server";

import { fetchYouTubePlaylist, parseYouTubePlaylistId } from "@/lib/youtubePlaylist";

/**
 * GET /api/youtube/playlist?list=<playlist link or id>
 * Returns the playlist's title, channel and videos. Public data only; the YouTube key never leaves the server.
 */
export async function GET(request: NextRequest) {
  const playlistId = parseYouTubePlaylistId(request.nextUrl.searchParams.get("list"));
  if (!playlistId) {
    return Response.json({ error: "Paste a YouTube playlist link (it contains list=…)." }, { status: 400 });
  }
  try {
    const playlist = await fetchYouTubePlaylist(playlistId);
    return Response.json(playlist, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The playlist could not be read.";
    return Response.json({ error: message }, { status: 502 });
  }
}
