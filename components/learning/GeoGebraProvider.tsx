"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

import type { GeoGebraInteractiveConfig } from "@/lib/content/types/lesson";
import {
  GEOGEBRA_DEFAULT_HEIGHT,
  GEOGEBRA_MIN_HEIGHT,
  getGeoGebraFailureDetail,
  resolveGeoGebraEmbed,
  type GeoGebraEmbedFailureReason,
} from "@/lib/content/resourcePresentation";

type LoadStatus = "loading" | "ready" | "stalled";

function heightFor(config: GeoGebraInteractiveConfig) {
  const value = typeof config.height === "number" ? config.height : Number(config.height);
  return Number.isFinite(value) && value >= GEOGEBRA_MIN_HEIGHT ? Math.round(value) : GEOGEBRA_DEFAULT_HEIGHT;
}

function failureCopy(reason: GeoGebraEmbedFailureReason, detail?: string) {
  const title =
    reason === "invalid-material-id" ? "GeoGebra activity not found" : reason === "invalid-app-name" ? "Unsupported GeoGebra app" : "GeoGebra resource not configured";
  return { title, body: getGeoGebraFailureDetail(reason, detail) };
}

/**
 * Renders a GeoGebra activity or calculator inside the lesson.
 *
 * GeoGebra is embedded through its documented iframe endpoints:
 * `https://www.geogebra.org/m/<materialId>?embed` for an activity and
 * `https://www.geogebra.org/<appName>?embed` for a calculator. The old
 * `/apps/<appName>` path is GeoGebra's script codebase, not an embeddable page,
 * and it responds with `403 Forbidden`.
 */
export function GeoGebraProvider({ config, title, adminHint = false }: { config: GeoGebraInteractiveConfig; title?: string; adminHint?: boolean }) {
  const resolution = useMemo(() => resolveGeoGebraEmbed(config), [config]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [stalled, setStalled] = useState(false);

  const src = resolution.ok ? resolution.src : undefined;

  useEffect(() => {
    if (!src) return;
    setStatus("loading");
    setStalled(false);
    const timer = window.setTimeout(() => setStalled(true), 12000);
    return () => window.clearTimeout(timer);
  }, [src]);

  // A resource that is not configured correctly must never render a broken
  // iframe (or leak GeoGebra's own raw error page into the lesson).
  if (!resolution.ok) {
    const copy = failureCopy(resolution.reason, resolution.detail);
    return (
      <div className="rounded-2xl border border-dashed border-[#E5E5E5] bg-[#F7F7F8] p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#B45309] shadow-[0_1px_3px_rgba(17,17,17,0.08)]">
            <AlertTriangle size={16} />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-[#111111]">{copy.title}</p>
            <p className="text-xs leading-5 text-[#666666]">{copy.body}</p>
            {adminHint ? (
              <p className="pt-1 text-[11px] font-medium uppercase tracking-[0.16em] text-[#999999]">Admin &rarr; Resources &rarr; GeoGebra</p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <div className="relative w-full" style={{ height: heightFor(config) }}>
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5E5] border-t-[#2563EB]" aria-hidden />
              <span className="text-xs font-medium text-[#666666]">Loading GeoGebra...</span>
            </div>
          </div>
        ) : null}
        <iframe
          src={resolution.src}
          title={title ?? (resolution.kind === "material" ? `GeoGebra activity ${resolution.materialId}` : `GeoGebra ${resolution.appName}`)}
          className="h-full w-full border-0"
          allowFullScreen
          allow="fullscreen; clipboard-write"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => setStatus("ready")}
        />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E5] bg-[#FAFAFA] px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
          GeoGebra - {resolution.kind === "material" ? "Activity" : resolution.appName}
        </span>
        <a
          href={resolution.kind === "material" ? `https://www.geogebra.org/m/${encodeURIComponent(resolution.materialId)}` : `https://www.geogebra.org/${resolution.appName}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#2563EB] underline-offset-4 hover:underline"
        >
          Open in GeoGebra <ExternalLink size={11} />
        </a>
      </figcaption>
      {stalled && status !== "ready" ? (
        <p className="border-t border-[#E5E5E5] px-4 py-2 text-[11px] leading-5 text-[#999999]">
          GeoGebra is taking longer than usual. If it stays blank, check that the material id is published and that the browser is not blocking third-party frames.
        </p>
      ) : null}
    </figure>
  );
}

