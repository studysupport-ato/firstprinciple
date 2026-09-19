"use client";

import { useMemo, useState } from "react";
import type { GeoGebraInteractiveConfig } from "@/lib/content/types/lesson";

function getGeoGebraUrl(config: GeoGebraInteractiveConfig) {
  const appName = config.appName ?? "graphing";
  const params = new URLSearchParams({
    lang: "en",
    border: "0",
    showToolBar: String(config.showToolbar ?? false),
    showAlgebraInput: String(config.showAlgebraInput ?? false),
    showMenuBar: String(config.showMenuBar ?? false),
    showResetIcon: String(config.showResetIcon ?? true),
  });

  if (config.materialId) {
    return `https://www.geogebra.org/material/iframe/id/${encodeURIComponent(config.materialId)}?${params.toString()}`;
  }

  return `https://www.geogebra.org/apps/${appName}?${params.toString()}`;
}

export function GeoGebraProvider({ config }: { config: GeoGebraInteractiveConfig }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const src = useMemo(() => getGeoGebraUrl(config), [config]);

  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">GeoGebra</span>
        <span className="font-sans text-[10px] text-[#666666]">
          {config.materialId ? "Embedded activity" : "Interactive graph"}
        </span>
      </div>

      {status === "loading" && (
        <div className="mb-3 flex h-[200px] items-center justify-center rounded-2xl border border-[#E5E5E5] bg-[#FAFAFA] font-sans text-xs uppercase tracking-[0.18em] text-[#666666]">
          Loading GeoGebra…
        </div>
      )}

      {status === "error" && (
        <div className="mb-3 rounded-2xl border border-[#F4C7C7] bg-[#FFF5F5] p-4 font-sans text-sm text-[#7A1F1F]">
          GeoGebra could not load for this lesson. Please try again or use a different material.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
        <iframe
          title="GeoGebra interactive visualization"
          src={src}
          className="block w-full border-0"
          style={{ height: config.height ?? 420, minHeight: 280 }}
          allowFullScreen
          loading="lazy"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}
