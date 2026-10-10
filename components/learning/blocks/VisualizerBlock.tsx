"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";

import type { VisualizerBlock as VisualizerBlockData } from "@/lib/content/types/lesson";

const DEFAULT_HEIGHT = 420;
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
var boardConfig = null;
var finalQuestionRequired = false;
var cfgScript = Array.from(document.scripts).find(function (script) {
  var text = script.textContent || '';
  var start = text.indexOf('var CFG = ');
  return start >= 0 && text[start + 'var CFG = '.length] === '{';
});
if (cfgScript) {
  try {
    var cfgText = cfgScript.textContent || '';
    var cfgStart = cfgText.indexOf('var CFG = ');
    var objectStart = cfgText.indexOf('{', cfgStart);
    var objectEnd = -1;
    var depth = 0;
    var inString = false;
    var escaped = false;
    for (var i = objectStart; objectStart >= 0 && i < cfgText.length; i++) {
      var character = cfgText[i];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === '\\\\') escaped = true;
        else if (character === '"') inString = false;
      } else if (character === '"') inString = true;
      else if (character === '{') depth++;
      else if (character === '}' && --depth === 0) {
        objectEnd = i + 1;
        break;
      }
    }
    if (objectStart < 0 || objectEnd < 0) throw new Error('The board configuration is incomplete.');
    boardConfig = JSON.parse(cfgText.slice(objectStart, objectEnd));
    var finalPart = boardConfig.parts[boardConfig.parts.length - 1];
    var finalStep = finalPart && finalPart.steps[finalPart.steps.length - 1];
    finalQuestionRequired = Boolean(finalStep && finalStep.quiz);
  } catch (error) {
    console.error('[lesson board] Could not read final-question requirement; lesson continuation remains locked.', error);
  }
}
var lastQuestionReport = null;
function reportQuestionRequirement(force) {
  if (!finalQuestionRequired) {
    if (!force && lastQuestionReport === 'not-required') return;
    lastQuestionReport = 'not-required';
    window.parent.postMessage({ source: 'b2b-board-question', required: false, answered: false }, '*');
    return;
  }
  var lastPart = boardConfig && boardConfig.parts[boardConfig.parts.length - 1];
  var lastStepIndex = lastPart ? lastPart.steps.length - 1 : -1;
  var finalQuiz = document.querySelector('#lb .lb-quiz[data-s="' + lastStepIndex + '"]');
  var answered = Boolean(finalQuiz && finalQuiz.querySelector('.lb-opt.lb-yes'));
  var report = answered ? 'answered' : 'unanswered';
  if (!force && lastQuestionReport === report) return;
  lastQuestionReport = report;
  window.parent.postMessage({ source: 'b2b-board-question', required: true, answered: answered }, '*');
}
reportQuestionRequirement(true);
new MutationObserver(function () { reportQuestionRequirement(false); }).observe(document.body, {
  attributes: true,
  attributeFilter: ['class', 'hidden'],
  childList: true,
  subtree: true
});
window.addEventListener('message', function (event) {
  if (event.source !== window.parent) return;
  if (event.data?.source === 'b2b-board-controls' && event.data.action === 'next') {
    document.getElementById('lb-next')?.click();
  } else if (event.data?.source === 'b2b-board-question' && event.data.action === 'status') {
    reportQuestionRequirement(true);
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

export function VisualizerBlock({ source, title = "Custom visualizer", height, fill = false, onQuestionRequirementChange }: VisualizerBlockData & { fill?: boolean; onQuestionRequirementChange?: (required: boolean, answered: boolean) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  // The iframe is only created in the browser. A server-rendered iframe can finish loading before React
  // attaches onLoad, which left the first step stuck on "Loading visualizer...".
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const iframeSource = useMemo(() => buildSourceDocument(source), [source]);
  const frameHeight = visualizerHeight(height);
  const timeoutRef = useRef<number | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sendNextBoard = () => iframeRef.current?.contentWindow?.postMessage({ source: "b2b-board-controls", action: "next" }, "*");

  useEffect(() => {
    if (!onQuestionRequirementChange) return;
    const reportQuestionChange = onQuestionRequirementChange;
    function handleBoardMessage(event: MessageEvent) {
      if (event.source !== iframeRef.current?.contentWindow || event.data?.source !== "b2b-board-question") return;
      reportQuestionChange(event.data.required === true, event.data.answered === true);
    }
    window.addEventListener("message", handleBoardMessage);
    return () => window.removeEventListener("message", handleBoardMessage);
  }, [onQuestionRequirementChange]);

  const markReady = () => {
    if (timeoutRef.current !== undefined) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }
    setStatus("ready");
    iframeRef.current?.contentWindow?.postMessage({ source: "b2b-board-question", action: "status" }, "*");
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
        <div className="relative h-full w-full bg-[#12335A]">
          {overlay}
          {frame}
          {isBoardSource(source) ? (
            <button
              type="button"
              aria-label="Next board"
              disabled={status !== "ready"}
              onClick={sendNextBoard}
              className="absolute left-3 top-3 z-20 inline-flex h-10 items-center gap-2 rounded-full bg-[#111111]/95 px-4 text-sm font-semibold text-white shadow-lg disabled:opacity-50 md:hidden"
            >
              Next <ArrowRight size={16} />
            </button>
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
