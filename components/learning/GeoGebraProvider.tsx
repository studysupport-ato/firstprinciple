"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ExternalLink } from "lucide-react";

import type { GeoGebraInteractiveConfig } from "@/lib/content/types/lesson";
import {
  GEOGEBRA_DEFAULT_HEIGHT,
  GEOGEBRA_MIN_HEIGHT,
  getGeoGebraFailureDetail,
  isGeoGebraAppName,
  resolveGeoGebraEmbed,
  type GeoGebraEmbedFailureReason,
} from "@/lib/content/resourcePresentation";

type LoadStatus = "loading" | "ready" | "error";

type GeoGebraApi = { remove?: () => void };
type GeoGebraApplet = { inject: (containerId: string) => void };
type GeoGebraAppletOptions = {
  appName: string;
  material_id?: string;
  id: string;
  width: number;
  height: number;
  scaleContainerClass: string;
  showToolBar?: boolean;
  showAlgebraInput?: boolean;
  showMenuBar?: boolean;
  showResetIcon?: boolean;
  appletOnLoad: (api: GeoGebraApi) => void;
};

declare global {
  interface Window {
    GGBApplet?: new (options: GeoGebraAppletOptions, prerelease?: boolean) => GeoGebraApplet;
  }
}

let geoGebraScriptPromise: Promise<void> | undefined;

function loadGeoGebraScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("GeoGebra is only available in the browser."));
  if (window.GGBApplet) return Promise.resolve();
  if (geoGebraScriptPromise) return geoGebraScriptPromise;

  geoGebraScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.geogebra.org/apps/deployggb.js"]');
    const script = existing ?? document.createElement("script");
    const fail = () => {
      geoGebraScriptPromise = undefined;
      reject(new Error("GeoGebra script failed to load."));
    };

    script.addEventListener("load", () => (window.GGBApplet ? resolve() : fail()), { once: true });
    script.addEventListener("error", fail, { once: true });
    if (!existing) {
      script.src = "https://www.geogebra.org/apps/deployggb.js";
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return geoGebraScriptPromise;
}

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
 * Renders a GeoGebra activity or calculator through the official Apps Embedding API.
 */
export function GeoGebraProvider({ config, title, adminHint = false }: { config: GeoGebraInteractiveConfig; title?: string; adminHint?: boolean }) {
  const resolution = useMemo(() => resolveGeoGebraEmbed(config), [config]);
  const containerId = `geogebra-${useId().replace(/:/g, "")}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!resolution.ok || !containerRef.current) return;

    let active = true;
    let api: GeoGebraApi | undefined;
    let timer: number | undefined;
    setStatus("loading");
    setError(null);

    const materialId = resolution.kind === "material" ? resolution.materialId : undefined;
    const configuredAppName = isGeoGebraAppName(config.appName) ? config.appName : "graphing";
    const appName = materialId && config.showNotes ? "notes" : resolution.kind === "material" ? configuredAppName : resolution.appName;
    const height = heightFor(config);

    void loadGeoGebraScript()
      .then(() => {
        if (!active || !containerRef.current || !window.GGBApplet) throw new Error("GeoGebra applet is unavailable.");

        const applet = new window.GGBApplet(
          {
            appName,
            ...(materialId ? { material_id: materialId } : {}),
            id: containerId,
            width: 800,
            height,
            scaleContainerClass: "geogebra-responsive-container",
            showToolBar: config.showToolbar,
            showAlgebraInput: config.showAlgebraInput,
            showMenuBar: config.showMenuBar,
            showResetIcon: config.showResetIcon,
            appletOnLoad: (loadedApi) => {
              if (!active) return;
              api = loadedApi;
              if (timer !== undefined) window.clearTimeout(timer);
              setStatus("ready");
            },
          },
          true,
        );

        applet.inject(containerId);
        timer = window.setTimeout(() => {
          if (!active) return;
          setError("GeoGebra couldn't be loaded. Please refresh the page and try again.");
          setStatus("error");
        }, 30000);
      })
      .catch(() => {
        if (!active) return;
        setError("GeoGebra couldn't be loaded. Please refresh the page and try again.");
        setStatus("error");
      });

    return () => {
      active = false;
      if (timer !== undefined) window.clearTimeout(timer);
      api?.remove?.();
      if (containerRef.current) containerRef.current.replaceChildren();
    };
  }, [config, containerId, resolution]);

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
      <div className="geogebra-responsive-container relative w-full overflow-hidden" style={{ aspectRatio: `800 / ${heightFor(config)}` }}>
        {status !== "ready" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white">
            <div className="flex flex-col items-center gap-3">
              {status === "error" ? <AlertTriangle size={20} className="text-[#B45309]" /> : <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5E5E5] border-t-[#FFBE00]" aria-hidden />}
              <span className="text-xs font-medium text-[#666666]">{status === "error" ? error : "Loading GeoGebra..."}</span>
            </div>
          </div>
        ) : null}
        <div id={containerId} ref={containerRef} className="h-full w-full" aria-label={title ?? "GeoGebra interactive"} />
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E5E5E5] bg-transparent px-4 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
          GeoGebra - {resolution.kind === "material" ? "Activity" : resolution.appName}
        </span>
        <a
          href={resolution.kind === "material" ? `https://www.geogebra.org/m/${encodeURIComponent(resolution.materialId)}` : `https://www.geogebra.org/${resolution.appName}`}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#111111] underline-offset-4 hover:underline"
        >
          Open in GeoGebra <ExternalLink size={11} />
        </a>
      </figcaption>
    </figure>
  );
}

