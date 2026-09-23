"use client";

import { useEffect, useMemo, useState } from "react";

import type { VisualizerBlock as VisualizerBlockData } from "@/lib/content/types/lesson";

const DEFAULT_HEIGHT = 420;
const MIN_HEIGHT = 280;
const MAX_HEIGHT = 900;
const LOAD_TIMEOUT = 12000;

function visualizerHeight(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value))) : DEFAULT_HEIGHT;
}

function buildSourceDocument(source: string) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';">
<style>
html, body { margin: 0; min-height: 100%; overflow: hidden; background: transparent; }
*, *::before, *::after { box-sizing: border-box; }
#first-principles-visualizer-error { display: none; padding: 1rem; color: #7f1d1d; background: #fef2f2; font: 14px/1.5 system-ui, sans-serif; }
</style>
<script>
window.addEventListener('error', function () {
  var fallback = document.getElementById('first-principles-visualizer-error');
  if (fallback) fallback.style.display = 'block';
});
</script>
</head>
<body>
<div id="first-principles-visualizer-error">This visualizer could not render. Please ask an administrator to check its code.</div>
${source}
</body>
</html>`;
}

export function VisualizerBlock({ source, title = "Custom visualizer", height }: VisualizerBlockData) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const iframeSource = useMemo(() => buildSourceDocument(source), [source]);
  const frameHeight = visualizerHeight(height);

  useEffect(() => {
    setStatus("loading");
    const timer = window.setTimeout(() => setStatus("error"), LOAD_TIMEOUT);
    return () => window.clearTimeout(timer);
  }, [iframeSource]);

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <div className="relative w-full" style={{ height: frameHeight }}>
        {status !== "ready" ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white p-6 text-center">
            <p className="max-w-sm text-xs leading-5 text-[#666666]">
              {status === "error" ? "This visualizer could not be loaded. Please ask an administrator to check its code." : "Loading visualizer..."}
            </p>
          </div>
        ) : null}
        <iframe
          title={title}
          srcDoc={iframeSource}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          className="h-full w-full border-0"
          onLoad={() => setStatus("ready")}
        />
      </div>
      <figcaption className="border-t border-[#E5E5E5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
        Custom visualizer
      </figcaption>
    </figure>
  );
}
