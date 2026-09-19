import type { GeoGebraInteractiveConfig } from "./types/lesson";
import type { GeoGebraResourceData, YouTubeResourceData } from "./types/resource";

export function getYouTubeThumbnailUrl(data: Pick<YouTubeResourceData, "videoId" | "thumbnail">) {
  return data.thumbnail?.url ?? (data.videoId ? `https://img.youtube.com/vi/${encodeURIComponent(data.videoId)}/hqdefault.jpg` : undefined);
}

export function getYouTubeSourceLabel(sourceType: YouTubeResourceData["sourceType"]) {
  return sourceType === "ato" ? "Ato's Tutorial" : "Recommended";
}

/**
 * GeoGebra app names that are served as embeddable calculators.
 *
 * IMPORTANT - this is the root cause of the 403 the lesson preview used to show:
 * `https://www.geogebra.org/apps/<appName>` is GeoGebra's *script codebase* path
 * (it serves deployggb.js) and is NOT an embeddable page; requesting it inside an
 * iframe returns `403 Forbidden`. The embeddable form of a calculator is
 * `https://www.geogebra.org/<appName>?embed`, and a specific activity is embedded
 * via `https://www.geogebra.org/m/<materialId>?embed`. The legacy
 * `https://www.geogebra.org/material/iframe/id/<id>` endpoint now returns
 * `410 Gone` for every id and must not be used either.
 */
export const GEOGEBRA_APP_NAMES = ["graphing", "geometry", "3d", "classic"] as const;
export type GeoGebraAppName = (typeof GEOGEBRA_APP_NAMES)[number];

/** GeoGebra material ids are short slugs, e.g. "RHYH3UQ8". */
export const GEOGEBRA_MATERIAL_ID_PATTERN = /^[A-Za-z0-9_-]{4,}$/;

export const GEOGEBRA_DEFAULT_HEIGHT = 420;
export const GEOGEBRA_MIN_HEIGHT = 280;

export type GeoGebraEmbedFailureReason = "not-configured" | "invalid-material-id" | "invalid-app-name";

export type GeoGebraEmbedResolution =
  | { ok: true; kind: "material"; materialId: string; src: string }
  | { ok: true; kind: "app"; appName: GeoGebraAppName; src: string }
  | { ok: false; reason: GeoGebraEmbedFailureReason; detail?: string };

export function isGeoGebraAppName(value: unknown): value is GeoGebraAppName {
  return typeof value === "string" && (GEOGEBRA_APP_NAMES as readonly string[]).includes(value);
}

/**
 * Extracts a GeoGebra material id from any of the URL shapes an administrator
 * might paste into the "Source URL" field, so pasting an activity link is as
 * valid as typing the id directly.
 *
 * Recognised: `/m/<id>`, `/material/show/id/<id>`, `/material/iframe/id/<id>`,
 * `/m/<id>#material/<id>`, `/classic/<id>`, or a bare id. A plain calculator URL
 * such as `https://www.geogebra.org/graphing` yields `undefined` because it
 * carries no material.
 */
export function parseGeoGebraMaterialId(value: string | undefined | null): string | undefined {
  const trimmed = typeof value === "string" ? value.trim() : "";
  if (!trimmed) return undefined;

  let path = trimmed;
  let host = "";
  try {
    const url = new URL(trimmed);
    host = url.hostname.toLowerCase();
    path = `${url.pathname}${url.hash}`;
  } catch {
    // Not a URL: fall through and treat the raw value as a candidate id.
    host = "geogebra.org";
  }

  if (host && !host.endsWith("geogebra.org")) return undefined;

  const match =
    path.match(/\/m\/([A-Za-z0-9_-]+)/) ??
    path.match(/\/material\/(?:show|iframe)\/id\/([A-Za-z0-9_-]+)/) ??
    path.match(/\/classic\/([A-Za-z0-9_-]+)/) ??
    path.match(/^\/?([A-Za-z0-9_-]{4,})$/);
  const candidate = (match?.[1] ?? "").trim();

  return GEOGEBRA_MATERIAL_ID_PATTERN.test(candidate) ? candidate : undefined;
}

/** Human-facing wording for each "cannot embed" reason. */
export function getGeoGebraFailureDetail(reason: GeoGebraEmbedFailureReason, detail?: string): string {
  switch (reason) {
    case "invalid-material-id":
      return `"${detail ?? ""}" is not a valid GeoGebra material ID. Copy the short code from the activity URL, for example the RHYH3UQ8 in geogebra.org/m/RHYH3UQ8.`;
    case "invalid-app-name":
      return `"${detail ?? ""}" is not a GeoGebra app. Choose one of ${GEOGEBRA_APP_NAMES.join(", ")}.`;
    case "not-configured":
    default:
      return "No GeoGebra material ID or calculator app has been set for this resource, so there is nothing to embed yet.";
  }
}

function embedQuery(config: GeoGebraInteractiveConfig, materialId?: string) {
  const params = new URLSearchParams({
    lang: "en",
    embed: "true",
    showToolBar: String(config.showToolbar ?? false),
    showAlgebraInput: String(config.showAlgebraInput ?? false),
    showMenuBar: String(config.showMenuBar ?? false),
    showResetIcon: String(config.showResetIcon ?? true),
  });

  if (materialId) params.set("materialId", materialId);
  return params.toString();
}

/**
 * Resolves a GeoGebra config to an actually embeddable URL.
 *
 * There is deliberately NO silent fallback to a generic calculator: an
 * incomplete config resolves to an explicit failure so the UI can render an
 * intentional "not configured" state instead of a broken iframe (which is how
 * the raw GeoGebra 403 page used to leak into the lesson preview). This resolver
 * is the single source of truth shared by rendering, resource validation, and the
 * admin editor.
 */
export function resolveGeoGebraEmbed(config: GeoGebraInteractiveConfig | null | undefined): GeoGebraEmbedResolution {
  const materialId = typeof config?.materialId === "string" ? config.materialId.trim() : "";

  if (materialId) {
    if (!GEOGEBRA_MATERIAL_ID_PATTERN.test(materialId)) return { ok: false, reason: "invalid-material-id", detail: materialId };

    // IMPORTANT: For a real GeoGebra activity/material, the embeddable route is the
    // calculator app route (for example `graphing`) with `materialId=<id>` attached.
    // The public `/m/<id>` route renders the entire GeoGebra site shell, which is not
    // the embedded lesson experience we want. This preserves the material identity while
    // using the actual app-first embed mechanism that supports iframe embedding.
    const appName = config?.appName && isGeoGebraAppName(config.appName) ? config.appName : "graphing";
    const query = embedQuery(config ?? {}, materialId);
    return { ok: true, kind: "material", materialId, src: `https://www.geogebra.org/${appName}?${query}` };
  }

  // `appName` is typed as a union, but persisted/JSONB data can hold anything,
  // including "" - so the runtime value is widened before checking.
  const appName = config?.appName as GeoGebraInteractiveConfig["appName"] | "" | undefined;
  if (appName === undefined || appName === null || appName === "") return { ok: false, reason: "not-configured" };
  if (!isGeoGebraAppName(appName)) return { ok: false, reason: "invalid-app-name", detail: String(appName) };

  return { ok: true, kind: "app", appName, src: `https://www.geogebra.org/${appName}?${embedQuery(config ?? {})}` };
}

/**
 * Normalises a `GeoGebraResourceData` into the single config object that
 * `GeoGebraProvider` expects.
 *
 * The resource model can carry the material id in three places - `config.materialId`,
 * the top-level `materialId`, or inside `sourceUrl` - so all three are folded into
 * one config rather than letting any of them be silently dropped.
 */
export function getGeoGebraEmbedConfig(data: GeoGebraResourceData): GeoGebraInteractiveConfig {
  const config = data.config ?? {};

  return {
    ...config,
    visualizer: "geogebra",
    materialId: config.materialId ?? data.materialId ?? parseGeoGebraMaterialId(data.sourceUrl),
    appName: config.appName ?? data.appName,
  };
}

/** Human label describing what a configured GeoGebra resource embeds. */
export function getGeoGebraSourceLabel(data: GeoGebraResourceData) {
  const config = getGeoGebraEmbedConfig(data);
  if (config.materialId) return "GeoGebra activity";
  return config.appName ? `GeoGebra ${config.appName}` : "GeoGebra";
}