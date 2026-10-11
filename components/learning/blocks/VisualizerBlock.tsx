"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LayoutGrid, Maximize2, Pause, Play, X, ZoomIn, ZoomOut } from "lucide-react";

import type { VisualizerBlock as VisualizerBlockData } from "@/lib/content/types/lesson";

const DEFAULT_HEIGHT = 420;
const BOARD_MIN_HEIGHT = 480;
const MIN_HEIGHT = 280;
const MAX_HEIGHT = 900;
const LOAD_TIMEOUT = 12000;

// A "board" is a visualizer written to fill the whole learning space. Its source carries this marker.
export const BOARD_MARKER = "data-b2b-board";

export function isBoardSource(source: string | undefined) {
  return typeof source === "string" && source.includes(BOARD_MARKER);
}

function visualizerHeight(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value))) : DEFAULT_HEIGHT;
}

function buildSourceDocument(source: string) {
  const mobileBoardStyles = isBoardSource(source)
    ? `<style>
@media (max-width: 767px) {
  #lb .lb-topic { padding: 60px 16px 0 !important; }
  #lb .lb-tools { top: 8px !important; right: 8px !important; }
  #lb .lb-vp { touch-action: none !important; }
  #lb .lb-vp .lb-lines {
    touch-action: none !important;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
  }
}
</style>
<script>
document.querySelectorAll('#lb .lb-lines').forEach(function (lines) {
  ['pointerdown', 'pointermove', 'pointerup', 'pointercancel'].forEach(function (eventName) {
    lines.addEventListener(eventName, function (event) {
      if (window.matchMedia('(max-width: 767px)').matches) event.stopPropagation();
    });
  });
});
var activeLines = null;
var previousTouchY = 0;
document.addEventListener('touchstart', function (event) {
  if (!window.matchMedia('(max-width: 767px)').matches || !event.touches.length) return;
  var target = event.target instanceof Element ? event.target : null;
  activeLines = target ? target.closest('#lb .lb-lines') : null;
  previousTouchY = event.touches[0].clientY;
}, { capture: true, passive: true });
document.addEventListener('touchmove', function (event) {
  if (!activeLines || !event.touches.length) return;
  var touchY = event.touches[0].clientY;
  activeLines.scrollTop -= touchY - previousTouchY;
  previousTouchY = touchY;
  if (event.cancelable) event.preventDefault();
  event.stopPropagation();
}, { capture: true, passive: false });
function clearActiveLines() { activeLines = null; }
document.addEventListener('touchend', clearActiveLines, { capture: true, passive: true });
document.addEventListener('touchcancel', clearActiveLines, { capture: true, passive: true });
function reportBoardState() {
  var heading = document.querySelector('#lb-vp .lb-bh');
  var title = document.querySelector('#lb .lb-topic h1')?.textContent?.trim()
    || heading?.querySelector('b')?.textContent?.replace(/^BOARD\\s+\\d+\\s*[·:-]\\s*/i, '').trim();
  var progressText = heading?.querySelector('span')?.textContent || '';
  var progress = progressText.match(/(\\d+)\\s+OF\\s+(\\d+)/i);
  var playButton = document.getElementById('lb-play');
  var nextButton = document.getElementById('lb-next');
  var previousButton = document.getElementById('lb-back');
  window.parent.postMessage({
    source: 'b2b-board-state',
    title: title || '',
    current: progress ? Number(progress[1]) : 1,
    total: progress ? Number(progress[2]) : 1,
    playing: playButton?.getAttribute('aria-label') === 'Pause',
    canNext: Boolean(nextButton && !nextButton.disabled),
    canPrevious: Boolean(previousButton && !previousButton.disabled),
    nextLabel: nextButton?.textContent?.trim() || 'Next'
  }, '*');
}
window.addEventListener('load', function () {
  var boardMain = document.querySelector('#lb-main');
  var playButton = document.getElementById('lb-play');
  var controls = document.querySelector('#lb .lb-ctl');
  if (boardMain) new MutationObserver(reportBoardState).observe(boardMain, { subtree: true, childList: true, characterData: true });
  if (playButton) new MutationObserver(reportBoardState).observe(playButton, { attributes: true, attributeFilter: ['aria-label'] });
  if (controls) new MutationObserver(reportBoardState).observe(controls, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-label'] });
  reportBoardState();
});
window.addEventListener('message', function (event) {
  if (event.source !== window.parent) return;
  if (event.data?.source !== 'b2b-board-controls') return;
  if (event.data.action === 'next') document.getElementById('lb-next')?.click();
  else if (event.data.action === 'previous') document.getElementById('lb-back')?.click();
  else if (event.data.action === 'all') document.getElementById('lb-all')?.click();
  else if (event.data.action === 'play') document.getElementById('lb-play')?.click();
  else if (event.data.action === 'zoom-in') document.getElementById('lb-zi')?.click();
  else if (event.data.action === 'zoom-out') document.getElementById('lb-zo')?.click();
  else if (event.data.action === 'fullscreen') {
    document.documentElement.classList.add('b2b-board-fullscreen');
    var themeButton = document.getElementById('lb-thm');
    if (themeButton?.textContent?.includes('Dark page')) {
      themeButton.click();
      document.documentElement.dataset.b2bFullscreenChangedTheme = 'true';
    }
  } else if (event.data.action === 'exit-fullscreen') {
    document.documentElement.classList.remove('b2b-board-fullscreen');
    if (document.documentElement.dataset.b2bFullscreenChangedTheme === 'true') {
      document.getElementById('lb-thm')?.click();
      delete document.documentElement.dataset.b2bFullscreenChangedTheme;
    }
  }
});
</script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none';">
<style>
html, body { margin: 0; min-height: 100%; overflow: hidden; background: transparent; }
*, *::before, *::after { box-sizing: border-box; }
html.b2b-board-fullscreen, html.b2b-board-fullscreen body { width: 100%; height: 100%; overflow: hidden; }
html.b2b-board-fullscreen body {
  background-color: #16345a !important;
  background-image: linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px) !important;
  background-size: 24px 24px !important;
}
html.b2b-board-fullscreen #lb { height: 100dvh !important; min-height: 0 !important; grid-template-rows: 0 0 minmax(0, 1fr) !important; background: transparent !important; }
html.b2b-board-fullscreen #lb > .lb-topic,
html.b2b-board-fullscreen #lb > .b4 { visibility: hidden !important; pointer-events: none !important; }
html.b2b-board-fullscreen #lb > .lb-tools,
html.b2b-board-fullscreen #lb > .lb-ctl { display: none !important; }
html.b2b-board-fullscreen #lb > .lb-main,
html.b2b-board-fullscreen #lb .lb-vp,
html.b2b-board-fullscreen #lb .lb-wall { min-height: 0 !important; background-color: transparent !important; }
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
${mobileBoardStyles}
</body>
</html>`;
}

export function VisualizerBlock({
  source,
  title = "Custom visualizer",
  height,
  fill = false,
  onFullscreenChange,
}: VisualizerBlockData & { fill?: boolean; onFullscreenChange?: (open: boolean) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [boardState, setBoardState] = useState({
    title,
    current: 1,
    total: 1,
    playing: false,
    canNext: true,
    canPrevious: false,
    nextLabel: "Next",
  });
  // The iframe is only created in the browser. A server-rendered iframe can finish loading before React
  // attaches onLoad, which left the first step stuck on "Loading visualizer...".
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const iframeSource = useMemo(() => buildSourceDocument(source), [source]);
  const requestedHeight = visualizerHeight(height);
  const frameHeight = fill && isBoardSource(source)
    ? Math.max(BOARD_MIN_HEIGHT, requestedHeight)
    : requestedHeight;
  const timeoutRef = useRef<number | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sendBoardAction = (action: "previous" | "all" | "next" | "play" | "zoom-in" | "zoom-out" | "fullscreen" | "exit-fullscreen") => {
    iframeRef.current?.contentWindow?.postMessage({ source: "b2b-board-controls", action }, "*");
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.source !== "b2b-board-state") return;
      setBoardState({
        title: typeof event.data.title === "string" && event.data.title ? event.data.title : title,
        current: Number.isInteger(event.data.current) ? event.data.current : 1,
        total: Number.isInteger(event.data.total) ? event.data.total : 1,
        playing: event.data.playing === true,
        canNext: event.data.canNext !== false,
        canPrevious: event.data.canPrevious === true,
        nextLabel: typeof event.data.nextLabel === "string" && event.data.nextLabel ? event.data.nextLabel : "Next",
      });
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [title]);

  useEffect(() => {
    if (!isFullscreen) return;
    onFullscreenChange?.(true);
    sendBoardAction("fullscreen");
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsFullscreen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      sendBoardAction("exit-fullscreen");
      onFullscreenChange?.(false);
    };
  }, [isFullscreen, onFullscreenChange]);

  const markReady = () => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    window.performance.mark("b2b-visualizer-iframe-onload");
    setStatus("ready");
  };

  useEffect(() => {
    setStatus("loading");
    if (timeoutRef.current !== undefined) window.clearTimeout(timeoutRef.current);
    // The timeout is a fallback for a document that never finishes loading.
    // It is cleared by the iframe load event, so it can never overwrite a
    // visualizer that already rendered.
    timeoutRef.current = window.setTimeout(() => setStatus("error"), LOAD_TIMEOUT);
    return () => {
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
      }
    };
  }, [iframeSource]);

  const frame = mounted ? (
    <iframe
      title={title}
      srcDoc={iframeSource}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      ref={iframeRef}
      className="h-full w-full border-0"
      onLoad={markReady}
    />
  ) : null;

  const overlay = status !== "ready" ? (
    <div className={`absolute inset-0 z-10 flex items-center justify-center p-6 text-center ${fill ? "bg-[#12335A]" : "bg-white"}`}>
      <p className={`max-w-sm text-xs leading-5 ${fill ? "text-[#9DB7D6]" : "text-[#666666]"}`}>
        {status === "error" ? "This visualizer could not be loaded. Please ask an administrator to check its code." : "Loading visualizer..."}
      </p>
    </div>
  ) : null;

  // Board mode: no card, no caption. The board takes all the space its parent gives it.
  if (fill) {
    return (
      <div
        role={isFullscreen ? "dialog" : undefined}
        aria-modal={isFullscreen || undefined}
        aria-label={isFullscreen ? `${boardState.title} board` : undefined}
        className={isFullscreen ? "fixed inset-0 z-[100] overflow-hidden bg-[#142F55]" : "w-full"}
      >
        <div
          className={isFullscreen ? "absolute inset-0 overflow-hidden bg-[#12335A]" : "relative w-full overflow-hidden rounded-xl bg-[#12335A]"}
          style={isFullscreen ? undefined : { height: frameHeight }}
        >
          {overlay}
          {frame}
        </div>
        {isFullscreen && (
          <>
            <header className="absolute inset-x-0 top-0 z-20 flex min-h-12 items-center gap-2 border-b border-white/10 bg-[#142F55]/90 px-3 pt-[env(safe-area-inset-top)] text-white backdrop-blur-sm">
              <div className="min-w-0 flex-1 truncate font-serif text-sm font-semibold">{boardState.title}</div>
              <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                {boardState.current} / {boardState.total}
              </span>
              <button
                type="button"
                aria-label="Show all boards"
                onClick={() => sendBoardAction("all")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
              >
                <LayoutGrid size={17} />
              </button>
              <button
                type="button"
                aria-label="Zoom out on board"
                onClick={() => sendBoardAction("zoom-out")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
              >
                <ZoomOut size={17} />
              </button>
              <button
                type="button"
                aria-label="Zoom in on board"
                onClick={() => sendBoardAction("zoom-in")}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/10"
              >
                <ZoomIn size={17} />
              </button>
              <button
                type="button"
                aria-label="Close full-screen board"
                onClick={() => setIsFullscreen(false)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </header>
            <nav aria-label="Board navigation" className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-2 bg-gradient-to-t from-[#0D203B]/95 via-[#0D203B]/85 to-transparent px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-9 text-white sm:gap-3 sm:px-6">
              <button
                type="button"
                aria-label="Back one board"
                disabled={status !== "ready" || !boardState.canPrevious}
                onClick={() => sendBoardAction("previous")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/70 px-3 text-xs font-semibold disabled:opacity-40 sm:max-w-32"
              >
                ‹ Back
              </button>
              <button
                type="button"
                aria-label={boardState.playing ? "Pause board playback" : "Play board automatically"}
                disabled={status !== "ready"}
                onClick={() => sendBoardAction("play")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/70 px-3 text-xs font-semibold disabled:opacity-40 sm:max-w-32"
              >
                {boardState.playing ? <Pause size={14} /> : <Play size={14} />}
                {boardState.playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                aria-label="Next board"
                disabled={status !== "ready" || !boardState.canNext}
                onClick={() => sendBoardAction("next")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#F0BC21] px-3 text-xs font-semibold text-[#18243A] disabled:opacity-40 sm:max-w-32"
              >
                {boardState.nextLabel.length > 18 ? "Continue" : boardState.nextLabel.replace(/[→›]$/, "").trim()} <ArrowRight size={14} />
              </button>
            </nav>
          </>
        )}
        {!isFullscreen && isBoardSource(source) ? (
          <div className="flex items-center justify-between gap-1 px-1 py-2">
            <button
              type="button"
              aria-label="Back one board"
              disabled={status !== "ready"}
              onClick={() => sendBoardAction("previous")}
              className="inline-flex h-10 min-w-16 items-center justify-center rounded-full border border-[#BDB8AE] bg-white px-4 text-xs font-semibold text-[#25231F] shadow-sm disabled:opacity-50"
            >
              ‹ Back
            </button>
            <button
              type="button"
              aria-label="Show all boards"
              disabled={status !== "ready"}
              onClick={() => sendBoardAction("all")}
              className="inline-flex h-10 min-w-20 items-center justify-center rounded-full border border-[#BDB8AE] bg-white px-4 text-xs font-semibold text-[#25231F] shadow-sm disabled:opacity-50"
            >
              All boards
            </button>
            <button
              type="button"
              aria-label="Open board full screen"
              disabled={status !== "ready"}
              onClick={() => setIsFullscreen(true)}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#BDB8AE] bg-white text-[#25231F] shadow-sm disabled:opacity-50"
            >
              <Maximize2 size={16} />
            </button>
            <button
              type="button"
              aria-label="Next board"
              disabled={status !== "ready"}
              onClick={() => sendBoardAction("next")}
              className="inline-flex h-10 min-w-16 items-center justify-center gap-1 rounded-full bg-[#111111] px-4 text-xs font-semibold text-white shadow-sm disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <div className="relative w-full" style={{ height: frameHeight }}>
        {overlay}
        {frame}
      </div>
      <figcaption className="border-t border-[#E5E5E5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
        Custom visualizer
      </figcaption>
    </figure>
  );
}
