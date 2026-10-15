"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, LayoutGrid, Maximize2, Pause, Play, X, ZoomIn, ZoomOut } from "lucide-react";

import type { VisualizerBlock as VisualizerBlockData } from "@/lib/content/types/lesson";
import { BOARD_FONT_STYLE } from "./boardFonts";

const DEFAULT_HEIGHT = 420;
const BOARD_MIN_HEIGHT = 480;
const MIN_HEIGHT = 280;
const MAX_HEIGHT = 900;
const MAX_MOBILE_BOARD_HEIGHT = 1400;
const LOAD_TIMEOUT = 12000;
// Height of a picture-only board card: the screen minus the lesson header, progress bar and step buttons.
const PICTURE_CARD_HEIGHT = "clamp(340px, calc(100dvh - 250px), 720px)";

// A "board" is a visualizer written to fill the whole learning space. Its source carries this marker.
export const BOARD_MARKER = "data-b2b-board";

export function isBoardSource(source: string | undefined) {
  return typeof source === "string" && source.includes(BOARD_MARKER);
}

// A "canvas" is a visualizer drawn straight onto the lesson page: no blue print, no card, no caption.
// It follows the page's light or dark mode and sizes itself to its content. Its source carries this marker.
export const CANVAS_MARKER = "data-b2b-canvas";

export function isCanvasSource(source: string | undefined) {
  return typeof source === "string" && source.includes(CANVAS_MARKER);
}

const CANVAS_SCRIPT = `<script>
(function () {
  function setMode(dark) { document.documentElement.setAttribute('data-mode', dark ? 'dark' : 'light'); }
  setMode(false);
  window.addEventListener('message', function (event) {
    if (event.source !== window.parent || !event.data || event.data.source !== 'b2b-canvas-theme') return;
    setMode(event.data.dark === true);
  });
  var last = 0;
  function report() {
    var root = document.querySelector('[${CANVAS_MARKER}]');
    if (!root) return;
    var height = Math.ceil(root.getBoundingClientRect().bottom + 4);
    if (Math.abs(height - last) > 1) { last = height; window.parent.postMessage({ source: 'b2b-canvas-height', height: height }, '*'); }
  }
  window.addEventListener('load', report);
  window.addEventListener('resize', report);
  if (window.ResizeObserver) new ResizeObserver(report).observe(document.body);
})();
</script>`;

function visualizerHeight(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, Math.round(value))) : DEFAULT_HEIGHT;
}

// Blue-print look for animated boards (".v" players): the page and the board share one grid.
// Only colours change; the board's own markup, text and animation are untouched.
const BLUEPRINT_STYLE = `<style>
.v { background-color: #14305C !important; background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px) !important; background-size: 28px 28px !important; color: #fff !important; }
.v .v-tag, .v .v-title, .v .v-why, .v .v-why b, .v .v-trk .c em { color: #fff !important; }
.v .v-trk i { background: rgba(255,255,255,.25) !important; }
.v .v-trk .d i { background: rgba(255,199,0,.6) !important; }
.v .v-trk .c i { background: #FFC700 !important; }
.v .v-btn { background: transparent !important; color: #fff !important; border-color: #fff !important; }
.v .v-btn.v-go { background: #FFC700 !important; color: #14181F !important; border-color: #FFC700 !important; }
.v .nh-edge { stroke: #fff !important; }
.v .nh-edge.nh-path { stroke: #FFC700 !important; }
.v .nh-hint { color: #cdd5e4 !important; }
/* the lesson page already shows progress, so the boards' own progress bars are hidden */
.v .v-trk, #lb .lb-prog, #lb-prog, .g-trk { display: none !important; }
.g { padding-bottom: 12px !important; border-top: 0 !important; }
.v .nh-node:hover .nh-box, .v .nh-node.nh-sel .nh-box, .v .nh-node:focus-visible .nh-box { stroke: #fff !important; }
.v .nh-node.nh-dark:hover .nh-box, .v .nh-node.nh-dark.nh-sel .nh-box { stroke: #FFC700 !important; }
</style>`;

// End-of-lesson check boards keep their own questions and behaviour; only the purple becomes green.
const CHECK_GREEN_STYLE = `<style>
#ck { background-color: #0F3D2E !important; background-image: linear-gradient(rgba(255,255,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.07) 1px, transparent 1px) !important; background-size: 32px 32px !important; }
#ck .bar i { background: rgba(255,255,255,.22) !important; }
#ck .bar i.ok { background: #7BE0A0 !important; } #ck .bar i.miss { background: #FF8A8E !important; } #ck .bar i.now { background: #FFC700 !important; }
#ck .meta, #ck .tier { color: #CFE8DC !important; }
#ck .hint, #ck .done { color: #0F3D2E !important; }
#ck .btn { color: #0F3D2E !important; }
#ck .btn.ghost { color: #fff !important; }
</style>`;

// Tells the lesson page the colour the visualizer is painted with right now, so a page that is
// only this visualizer can match it (boards change colour as they move between modes).
const COLOR_REPORTER = `<script>
(function () {
  function painted() {
    var first = document.getElementById('first-principles-visualizer-error');
    var candidates = [document.getElementById('lb'), document.getElementById('ck'), document.querySelector('[data-b2b-board]'), document.querySelector('.v'), first ? first.nextElementSibling : null, document.body];
    for (var i = 0; i < candidates.length; i++) {
      var el = candidates[i];
      if (!el || el === first) continue;
      var colour = getComputedStyle(el).backgroundColor;
      if (colour && colour !== 'transparent' && colour !== 'rgba(0, 0, 0, 0)') return colour;
    }
    return null;
  }
  var last = null, timer = null;
  function report() { var colour = painted(); if (colour && colour !== last) { last = colour; window.parent.postMessage({ source: 'b2b-board-color', color: colour }, '*'); } }
  function soon() { clearTimeout(timer); timer = setTimeout(report, 60); }
  window.addEventListener('load', function () {
    report();
    new MutationObserver(soon).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-mode', 'class', 'style', 'data-theme'] });
    document.addEventListener('transitionend', soon, true);
  });
})();
</script>`;

// Shorter animation timing for boards: pictures move on sooner, so it is clear they play by themselves.
// Each pair is [text in the board script, replacement]. A board without these snippets is left as it is.
const BOARD_TIMING_PATCHES: Array<[string, string]> = [
  [
    "function dur() { return Math.min(9000, 2200 + String(fr[fi].t || '').split(' ').length * 230); }",
    "function dur() { var d = Math.min(3400, 1300 + String(fr[fi].t || '').split(' ').length * 70); try { window.dispatchEvent(new CustomEvent('b2b-frame', { detail: d })); } catch (e) {} return d; }",
  ],
  ["timer = setTimeout(function () { go(at + 1); schedule(); }, 2200 + words * 170);", "timer = setTimeout(function () { go(at + 1); schedule(); }, 1500 + words * 90);"],
  ["timer = setTimeout(schedule, 600);", "timer = setTimeout(schedule, 380);"],
  ["setTimeout(render, first ? 40 : 560);", "setTimeout(render, first ? 40 : 320);"],
  ["animation: lbdraw .9s ease both;", "animation: lbdraw .55s ease both;"],
];

function patchBoardTiming(source: string) {
  return BOARD_TIMING_PATCHES.reduce((text, [from, to]) => text.split(from).join(to), source);
}

// Picture-only boards (a board in the right-hand card): the lesson text carries the words, so the
// card shows the picture, a title line and one control bar (Back, Play, progress, Next) that always
// sits inside the card. Back and Next step through the picture's frames first, then the board's lines.
const PICTURE_ONLY_STYLE = `<style>
html.b2b-board-picture, html.b2b-board-picture body { height: 100%; }
html.b2b-board-picture body { background: #12335A !important; }
html.b2b-board-picture #lb {
  display: block !important; position: relative !important; height: 100vh !important; min-height: 0 !important; overflow: hidden !important;
  background-color: #12335A !important;
  background-image: linear-gradient(rgba(234,242,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(234,242,255,.06) 1px, transparent 1px) !important;
  background-size: 26px 26px !important;
}
html.b2b-board-picture #lb > .lb-topic,
html.b2b-board-picture #lb > .b4,
html.b2b-board-picture #lb > .lb-prog,
html.b2b-board-picture #lb > .lb-tools,
html.b2b-board-picture #lb > .lb-ctl,
html.b2b-board-picture #lb .lb-main > #lb-vp,
html.b2b-board-picture #lb .lb-main > #lb-cap,
html.b2b-board-picture #lb .lb-pbar,
html.b2b-board-picture #lb .lb-pcap,
html.b2b-board-picture #lb .lb-pz { display: none !important; }
html.b2b-board-picture #lb .lb-main,
html.b2b-board-picture #lb .lb-main.lb-side {
  position: absolute !important; inset: 44px 0 62px 0 !important; display: flex !important; align-items: center !important; justify-content: center !important;
  padding: 4px 12px !important; margin: 0 !important; overflow: hidden !important; min-height: 0 !important; height: auto !important;
  grid-template-columns: none !important; grid-template-rows: none !important;
}
html.b2b-board-picture #lb .lb-main > #lb-pic {
  display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; height: 100% !important;
  max-width: none !important; margin: 0 !important; padding: 0 !important; min-height: 0 !important; border: 0 !important; background: none !important;
}
html.b2b-board-picture #lb .lb-main > #lb-pic::before { display: none !important; }
/* A story part switches the board's own zoom on. Inside the card that zoom is a full-window layer that
   covered the control bar and let the picture spill out, so here the picture stays in its place. */
html.b2b-board-picture:not(.b2b-board-fullscreen) #lb .lb-main > #lb-pic.lb-zoom {
  position: static !important; inset: auto !important; z-index: auto !important; grid-template-columns: none !important; grid-template-rows: none !important; gap: 0 !important;
}
html.b2b-board-picture #lb .lb-main > #lb-pic svg { overflow: hidden !important; grid-column: auto !important; grid-row: auto !important; }
html.b2b-board-picture #lb .lb-main > #lb-pic svg { width: 100% !important; height: 100% !important; max-width: 100% !important; max-height: 100% !important; margin: 0 !important; }
#b2b-head, #b2b-bar { position: fixed; left: 0; right: 0; z-index: 30; display: flex; align-items: center; gap: 10px; font-family: "Segoe UI", system-ui, -apple-system, Roboto, "Helvetica Neue", Arial, sans-serif; color: #EAF1FA; }
#b2b-head { top: 0; height: 44px; padding: 0 16px; font-size: 11.5px; font-weight: 700; letter-spacing: .09em; text-transform: uppercase; color: #9FB4CE; }
#b2b-head .t { flex: 1; min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
#b2b-head .n { font-variant-numeric: tabular-nums; letter-spacing: .03em; }
#b2b-bar { bottom: 0; height: 62px; padding: 0 12px; background: #0E2A4A; border-top: 1px solid rgba(255,255,255,.08); }
#b2b-bar button { font: inherit; font-size: 14.5px; font-weight: 700; height: 40px; padding: 0 15px; border-radius: 10px; border: 1px solid rgba(255,255,255,.24); background: transparent; color: #EAF1FA; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; white-space: nowrap; }
#b2b-bar button:disabled { opacity: .35; cursor: default; }
#b2b-bar button:focus-visible { outline: 3px solid #8FC3FF; outline-offset: 2px; }
#b2b-bar .play { width: 40px; padding: 0; justify-content: center; font-size: 13px; }
#b2b-bar .next { margin-left: auto; background: #F5C84B; border-color: #F5C84B; color: #1A1400; }
#b2b-bar .dots { display: flex; gap: 6px; margin-left: auto; align-items: center; }
#b2b-bar .dots i { width: 7px; height: 7px; border-radius: 50%; background: rgba(255,255,255,.25); transition: background .2s; }
#b2b-bar .dots i.on { background: #F5C84B; }
#b2b-tick { position: absolute; left: 0; top: -1px; height: 3px; width: 100%; transform-origin: left center; transform: scaleX(0); background: #F5C84B; opacity: 0; }
#b2b-tick.run { opacity: .9; animation: b2b-tick var(--d, 2000ms) linear forwards; }
@keyframes b2b-tick { from { transform: scaleX(0); } to { transform: scaleX(1); } }
/* A question on the board shows as a panel over the picture until it is answered. */
html.b2b-board-picture.b2b-quiz #lb .lb-main > #lb-vp {
  display: block !important; position: fixed !important; left: 10px !important; right: 10px !important; top: auto !important; bottom: 72px !important;
  z-index: 40 !important; width: auto !important; height: auto !important; max-height: calc(100% - 130px) !important; overflow: auto !important;
  padding: 14px 16px !important; border-radius: 14px !important; background: #0B2240 !important; border: 1px solid rgba(245,200,75,.45) !important; box-shadow: 0 10px 30px rgba(0,0,0,.35) !important;
}
html.b2b-board-picture.b2b-quiz #lb-vp .lb-wall { transform: none !important; width: auto !important; height: auto !important; min-height: 0 !important; padding: 0 !important; background: none !important; }
html.b2b-board-picture.b2b-quiz #lb-vp .lb-wall > *:not(:has(.lb-quiz:not([hidden]))) { display: none !important; }
html.b2b-board-picture.b2b-quiz #lb-vp .lb-st:not(:has(.lb-quiz:not([hidden]))) { display: none !important; }
html.b2b-board-picture.b2b-quiz #lb-vp .lb-quiz p { font-size: 17px !important; }
html.b2b-board-picture.b2b-quiz #lb-vp .lb-opt { font-size: 15px !important; padding: 8px 14px !important; }
@media (max-width: 360px) { #b2b-bar button { padding: 0 11px; font-size: 13.5px; } #b2b-bar .dots { display: none; } }
@media (prefers-reduced-motion: reduce) { #b2b-tick.run { animation: none; opacity: 0; } }
</style>
<script>
(function () {
  document.documentElement.classList.add('b2b-board-picture');
  function $(id) { return document.getElementById(id); }
  function pbarButtons() {
    var list = Array.prototype.slice.call(document.querySelectorAll('#lb-pic .lb-pbar .lb-pb'));
    function find(re) { return list.filter(function (b) { return re.test(b.textContent || ''); })[0] || null; }
    var shown = list.length && list[0].style.display !== 'none';
    return { shown: !!shown, back: find(/back/i), play: find(/play|pause/i), next: document.querySelector('#lb-pic .lb-pgo'), count: document.querySelector('#lb-pic .lb-pcnt') };
  }
  function boardEnd() { var b = $('lb-next'); return !b || b.disabled || /all boards/i.test(b.textContent || ''); }
  function usable(b) { return !!b && !b.disabled; }
  // The board's own "All boards" step is never reached from the card.
  document.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('#lb-next') : null;
    if (b && /all boards/i.test(b.textContent || '')) { e.stopPropagation(); e.preventDefault(); }
  }, true);
  window.addEventListener('message', function (e) {
    if (e.data && e.data.source === 'b2b-board-controls' && e.data.action === 'next' && boardEnd()) e.stopImmediatePropagation();
  }, true);
  window.addEventListener('load', function () {
    var lb = $('lb'), pic = $('lb-pic');
    if (!lb || $('b2b-bar')) return;
    var head = document.createElement('div'); head.id = 'b2b-head';
    head.innerHTML = '<span class="t"></span><span class="n"></span>';
    var bar = document.createElement('div'); bar.id = 'b2b-bar';
    bar.innerHTML = '<span id="b2b-tick"></span><button type="button" class="back" aria-label="Back">‹ Back</button>'
      + '<button type="button" class="play" aria-label="Play">▶</button><span class="dots" aria-hidden="true"></span>'
      + '<button type="button" class="next" aria-label="Next">Next ›</button>';
    document.body.appendChild(head); document.body.appendChild(bar);
    var tEl = head.querySelector('.t'), nEl = head.querySelector('.n'), tick = $('b2b-tick'),
        bBack = bar.querySelector('.back'), bPlay = bar.querySelector('.play'), bNext = bar.querySelector('.next'), dots = bar.querySelector('.dots');
    function playing() { var p = pbarButtons().play; return !!p && /pause/i.test(p.textContent || ''); }
    function set(el, text) { if (el.textContent !== text) el.textContent = text; }
    function stopTick() { tick.classList.remove('run'); }
    function sync() {
      var pb = pbarButtons();
      var label = (pic && pic.getAttribute('data-label')) || (($('lb-title') || {}).textContent || '');
      set(tEl, label.replace(/^\\s*picture\\s*[·:-]\\s*/i, ''));
      var m = pb.shown && pb.count ? /(\\d+)\\s*\\/\\s*(\\d+)/.exec(pb.count.textContent || '') : null;
      var cur = m ? +m[1] : 1, total = m ? +m[2] : 1;
      set(nEl, total > 1 ? cur + ' / ' + total : '');
      if (dots.childElementCount !== Math.min(total, 12)) { dots.innerHTML = ''; for (var i = 0; i < Math.min(total, 12); i++) dots.appendChild(document.createElement('i')); }
      Array.prototype.forEach.call(dots.children, function (d, i) { d.classList.toggle('on', i < cur); });
      dots.style.display = total > 1 ? '' : 'none';
      bPlay.style.display = pb.shown && total > 1 ? '' : 'none';
      var on = playing();
      set(bPlay, on ? '❚❚' : '▶');
      bPlay.setAttribute('aria-label', on ? 'Pause' : 'Play');
      if (!on) stopTick();
      document.documentElement.classList.toggle('b2b-quiz', !!document.querySelector('#lb-vp .lb-quiz:not([hidden])'));
      bBack.disabled = !(pb.shown && usable(pb.back)) && !usable($('lb-back'));
      bNext.disabled = !(pb.shown && usable(pb.next)) && boardEnd();
    }
    bNext.addEventListener('click', function () {
      var pb = pbarButtons();
      if (pb.shown && usable(pb.next)) pb.next.click();
      else if (!boardEnd()) $('lb-next').click();
      setTimeout(sync, 30);
    });
    bBack.addEventListener('click', function () {
      var pb = pbarButtons();
      if (pb.shown && usable(pb.back)) pb.back.click();
      else if (usable($('lb-back'))) $('lb-back').click();
      setTimeout(sync, 30);
    });
    bPlay.addEventListener('click', function () { var p = pbarButtons().play; if (p) p.click(); setTimeout(sync, 30); });
    window.addEventListener('b2b-frame', function (e) {
      tick.classList.remove('run'); void tick.offsetWidth;
      tick.style.setProperty('--d', (e.detail || 2000) + 'ms'); tick.classList.add('run');
    });
    new MutationObserver(sync).observe(lb, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'style', 'data-label', 'hidden'] });
    sync();
  });
})();
</script>`;

// Hand-built boards (not the standard line board, player or check) are drawn for a wide frame. In a
// shorter frame, such as the right-hand card, their buttons fell below the bottom edge. This shrinks
// the whole board until everything, buttons included, fits.
const CUSTOM_BOARD_FIT = `<script>
(function () {
  var busy = false, board = null, seen = '';
  function size() { return board ? board.offsetWidth + 'x' + board.offsetHeight : ''; }
  function fit() {
    if (busy || document.documentElement.classList.contains('b2b-board-fullscreen')) return;
    busy = true;
    var body = document.body, root = document.documentElement;
    body.style.transform = '';
    body.style.transformOrigin = '';
    body.style.overflow = '';
    body.style.height = '';
    var have = window.innerHeight;
    var need = Math.max(body.scrollHeight, root.scrollHeight, board ? board.getBoundingClientRect().bottom + window.scrollY : 0);
    if (have > 0 && need > have + 1) {
      // Scaling does not change the board's layout, so one measurement gives the right size.
      body.style.overflow = 'visible';
      body.style.height = need + 'px';
      body.style.transformOrigin = 'top center';
      body.style.transform = 'scale(' + Math.max(0.45, (have - 2) / need) + ')';
    }
    seen = size();
    busy = false;
  }
  var timer = null;
  function soon() { clearTimeout(timer); timer = setTimeout(fit, 40); }
  window.addEventListener('load', function () {
    board = document.querySelector('[data-b2b-board]') || document.body;
    fit();
    window.addEventListener('resize', soon);
    // Refit when the board itself grows or shrinks (new rows, a new mode), not on its own refit.
    if (window.ResizeObserver) new ResizeObserver(function () { if (size() !== seen) soon(); }).observe(board);
    setTimeout(fit, 300);
  });
})();
</script>`;

function isCustomBoard(source: string) {
  return isBoardSource(source) && !/id=["']?(lb|ck)\b/.test(source) && !/class=["'][^"']*\bv\b/.test(source);
}

function buildSourceDocument(source: string, blueprint = false, pictureOnly = false) {
  const mobileBoardStyles = isBoardSource(source)
    ? `<style>
@media (max-width: 767px) {
  #lb .lb-topic { padding: 60px 16px 0 !important; }
  #lb .lb-tools { top: 8px !important; right: 8px !important; }
  #lb .lb-vp { touch-action: none !important; }
  #lb .lb-main.lb-side {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: 280px auto !important;
    align-content: start !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    overscroll-behavior: contain;
  }
  #lb .lb-main.lb-side > #lb-vp {
    grid-column: 1 !important;
    grid-row: 1 !important;
    width: 100% !important;
    min-width: 0 !important;
    min-height: 280px !important;
    height: 280px !important;
  }
  #lb .lb-main.lb-side > #lb-pic:not(.lb-zoom) {
    grid-column: 1 !important;
    grid-row: 2 !important;
    align-self: stretch !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: 100% !important;
    margin: 0 !important;
  }
  #lb .lb-main.lb-side > #lb-pic.lb-zoom {
    grid-template-columns: minmax(0, 1fr) !important;
    grid-template-rows: auto minmax(0, 1fr) auto auto !important;
    column-gap: 0 !important;
    row-gap: 8px !important;
  }
  #lb .lb-main.lb-side > #lb-pic.lb-zoom svg {
    grid-column: 1 !important;
    grid-row: 2 !important;
    width: 100% !important;
    height: 100% !important;
    max-height: none !important;
  }
  #lb .lb-main.lb-side > #lb-pic.lb-zoom .lb-pcap {
    grid-column: 1 !important;
    grid-row: 3 !important;
    font-size: 14px !important;
    text-align: center !important;
  }
  #lb .lb-main.lb-side > #lb-pic.lb-zoom .lb-pbar {
    grid-column: 1 !important;
    grid-row: 4 !important;
    justify-content: center !important;
    margin: 0 !important;
  }
  #lb .lb-main.lb-side > #lb-pic.lb-zoom .lb-pz {
    margin-left: 0 !important;
  }
  #lb .lb-main.lb-side > #lb-cap { grid-column: 1 !important; }
  #lb .lb-main.lb-side .lb-pic:not(.lb-zoom) svg {
    max-height: min(260px, 32vh) !important;
  }
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
  var picture = document.getElementById('lb-pic');
  var pictureBar = picture?.querySelector('.lb-pbar');
  var pictureButtons = pictureBar ? Array.from(pictureBar.querySelectorAll('.lb-pb')) : [];
  var pictureBack = pictureButtons.find(function (button) { return /back/i.test(button.textContent || ''); });
  var picturePlay = pictureButtons.find(function (button) { return /play|pause/i.test(button.textContent || ''); });
  var pictureNext = pictureBar?.querySelector('.lb-pgo');
  var hasPictureSequence = Boolean(picture && !picture.hidden && pictureBar?.querySelector('.lb-pcnt'));
  var title = document.querySelector('#lb .lb-topic h1')?.textContent?.trim()
    || heading?.querySelector('b')?.textContent?.replace(/^BOARD\\s+\\d+\\s*[·:-]\\s*/i, '').trim();
  var progressText = heading?.querySelector('span')?.textContent || '';
  var progress = progressText.match(/(\\d+)\\s+OF\\s+(\\d+)/i);
  var pictureProgress = pictureBar?.querySelector('.lb-pcnt')?.textContent?.match(/(\\d+)\\s*\\/\\s*(\\d+)/);
  var playButton = document.getElementById('lb-play');
  var nextButton = document.getElementById('lb-next');
  var previousButton = document.getElementById('lb-back');
  window.parent.postMessage({
    source: 'b2b-board-state',
    title: title || '',
    hasPicture: hasPictureSequence,
    current: pictureProgress ? Number(pictureProgress[1]) : progress ? Number(progress[1]) : 1,
    total: pictureProgress ? Number(pictureProgress[2]) : progress ? Number(progress[2]) : 1,
    playing: hasPictureSequence ? /pause/i.test(picturePlay?.textContent || '') : playButton?.getAttribute('aria-label') === 'Pause',
    canNext: hasPictureSequence ? Boolean(pictureNext && !pictureNext.disabled) : Boolean(nextButton && !nextButton.disabled),
    canPrevious: hasPictureSequence ? Boolean(pictureBack && !pictureBack.disabled) : Boolean(previousButton && !previousButton.disabled),
    nextLabel: (hasPictureSequence ? pictureNext?.textContent : nextButton?.textContent)?.trim() || 'Next'
  }, '*');
}
function reportBoardLayout() {
  if (!window.matchMedia('(max-width: 767px)').matches) return;
  var root = document.getElementById('lb');
  var main = root?.querySelector('.lb-main.lb-side');
  var picture = document.getElementById('lb-pic');
  if (!root || !main || !picture || picture.hidden) return;
  var rootTop = root.getBoundingClientRect().top;
  var contentBottom = Array.from(main.children).reduce(function (bottom, child) {
    return child.getClientRects().length ? Math.max(bottom, child.getBoundingClientRect().bottom - rootTop) : bottom;
  }, 0);
  var mainStyle = getComputedStyle(main);
  var controls = root.querySelector('.lb-ctl');
  var controlsStyle = controls ? getComputedStyle(controls) : null;
  var mainPadding = parseFloat(mainStyle.paddingTop) + parseFloat(mainStyle.paddingBottom);
  var controlsReserve = controls ? controls.offsetHeight + Math.max(0, parseFloat(controlsStyle?.bottom || '0')) : 0;
  var requiredHeight = Math.ceil(contentBottom + Math.max(mainPadding, controlsReserve) + 16);
  if (Math.abs(requiredHeight - root.clientHeight) > 1) {
    window.parent.postMessage({ source: 'b2b-board-layout', height: requiredHeight }, '*');
    if (boardLayoutReportRetries < 10) {
      boardLayoutReportRetries += 1;
      window.setTimeout(scheduleBoardLayoutReport, 100);
    } else {
      boardLayoutReportRetries = 0;
    }
  } else {
    boardLayoutReportRetries = 0;
  }
}
var boardLayoutReportScheduled = false;
var boardLayoutReportRetries = 0;
function scheduleBoardLayoutReport() {
  if (boardLayoutReportScheduled) return;
  boardLayoutReportScheduled = true;
  window.setTimeout(function () {
    boardLayoutReportScheduled = false;
    reportBoardLayout();
  }, 0);
}
window.addEventListener('load', function () {
  var boardMain = document.querySelector('#lb .lb-main');
  var playButton = document.getElementById('lb-play');
  var controls = document.querySelector('#lb .lb-ctl');
  var picture = document.getElementById('lb-pic');
  var pictureZoomButton = picture?.querySelector('.lb-pz');
  if (boardMain) new MutationObserver(function () {
    reportBoardState();
    scheduleBoardLayoutReport();
  }).observe(boardMain, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'disabled', 'aria-label'] });
  if (playButton) new MutationObserver(reportBoardState).observe(playButton, { attributes: true, attributeFilter: ['aria-label'] });
  if (controls) new MutationObserver(reportBoardState).observe(controls, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['disabled', 'aria-label'] });
  if (pictureZoomButton) {
    pictureZoomButton.addEventListener('click', function () {
      setTimeout(function () {
        if (picture?.classList.contains('lb-zoom') && !document.documentElement.classList.contains('b2b-board-fullscreen')) {
          document.documentElement.dataset.b2bFullscreenChangedPictureZoom = 'true';
          window.parent.postMessage({ source: 'b2b-board-request', action: 'fullscreen' }, '*');
        }
      }, 0);
    });
  }
  reportBoardState();
  scheduleBoardLayoutReport();
});
window.addEventListener('resize', scheduleBoardLayoutReport);
window.addEventListener('message', function (event) {
  if (event.source !== window.parent) return;
  if (event.data?.source !== 'b2b-board-controls') return;
  if (event.data.action === 'measure-layout') scheduleBoardLayoutReport();
  else if (event.data.action === 'next') document.getElementById('lb-next')?.click();
  else if (event.data.action === 'previous') document.getElementById('lb-back')?.click();
  else if (event.data.action === 'all') document.getElementById('lb-all')?.click();
  else if (event.data.action === 'play') document.getElementById('lb-play')?.click();
  else if (event.data.action === 'picture-next') document.querySelector('#lb-pic .lb-pgo')?.click();
  else if (event.data.action === 'picture-back') {
    var pictureBack = Array.from(document.querySelectorAll('#lb-pic .lb-pbar .lb-pb')).find(function (button) { return /back/i.test(button.textContent || ''); });
    pictureBack?.click();
  } else if (event.data.action === 'picture-play') {
    var picturePlay = Array.from(document.querySelectorAll('#lb-pic .lb-pbar .lb-pb')).find(function (button) { return /play|pause/i.test(button.textContent || ''); });
    picturePlay?.click();
  } else if (event.data.action === 'picture-zoom') document.querySelector('#lb-pic .lb-pz')?.click();
  else if (event.data.action === 'zoom-in') document.getElementById('lb-zi')?.click();
  else if (event.data.action === 'zoom-out') document.getElementById('lb-zo')?.click();
  else if (event.data.action === 'fullscreen') {
    document.documentElement.classList.add('b2b-board-fullscreen');
    var picture = document.getElementById('lb-pic');
    if (picture && !picture.classList.contains('lb-zoom')) {
      picture.classList.add('lb-zoom');
      var zoomButton = picture.querySelector('.lb-pz');
      if (zoomButton) zoomButton.textContent = '✕ Close zoom';
      document.documentElement.dataset.b2bFullscreenChangedPictureZoom = 'true';
    }
    var themeButton = document.getElementById('lb-thm');
    if (themeButton?.textContent?.includes('Dark page')) {
      themeButton.click();
      document.documentElement.dataset.b2bFullscreenChangedTheme = 'true';
    }
  } else if (event.data.action === 'exit-fullscreen') {
    document.documentElement.classList.remove('b2b-board-fullscreen');
    if (document.documentElement.dataset.b2bFullscreenChangedPictureZoom === 'true') {
      var picture = document.getElementById('lb-pic');
      if (picture?.classList.contains('lb-zoom')) {
        picture.classList.remove('lb-zoom');
        var zoomButton = picture.querySelector('.lb-pz');
        if (zoomButton) zoomButton.textContent = '⤢ Zoom in';
      }
      delete document.documentElement.dataset.b2bFullscreenChangedPictureZoom;
    }
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
html.b2b-board-fullscreen #lb .lb-main.lb-side {
  display: block !important;
  overflow: hidden !important;
  padding: 0 !important;
}
html.b2b-board-fullscreen #lb .lb-main.lb-side > #lb-vp { display: none !important; }
html.b2b-board-fullscreen #lb .lb-pic.lb-zoom {
  position: fixed !important;
  inset: 0 !important;
  z-index: 80 !important;
  display: grid !important;
  grid-template-columns: minmax(0, 1fr) !important;
  grid-template-rows: auto minmax(0, 1fr) auto !important;
  gap: 8px !important;
  width: 100vw !important;
  height: 100dvh !important;
  max-width: none !important;
  margin: 0 !important;
  padding: calc(58px + env(safe-area-inset-top)) 16px calc(100px + env(safe-area-inset-bottom)) !important;
  overflow: hidden !important;
  border: 0 !important;
  border-radius: 0 !important;
  background-color: #12335A !important;
  background-image: linear-gradient(rgba(234,242,255,.07) 1px, transparent 1px), linear-gradient(90deg, rgba(234,242,255,.07) 1px, transparent 1px) !important;
  background-size: 24px 24px !important;
}
html.b2b-board-fullscreen #lb .lb-pic.lb-zoom::before {
  position: static !important;
  grid-column: 1 !important;
  grid-row: 1 !important;
  align-self: center !important;
  font-size: 12px !important;
}
html.b2b-board-fullscreen #lb .lb-pic.lb-zoom svg {
  grid-column: 1 !important;
  grid-row: 2 !important;
  align-self: center !important;
  width: 100% !important;
  height: 100% !important;
  max-width: min(100%, 64vh) !important;
  max-height: min(100%, 64vh) !important;
  margin: 0 auto !important;
}
html.b2b-board-fullscreen #lb .lb-pic.lb-zoom .lb-pcap {
  display: block !important;
  grid-column: 1 !important;
  grid-row: 3 !important;
  align-self: center !important;
  margin: 0 !important;
  font-size: clamp(14px, 4vw, 20px) !important;
  line-height: 1.45 !important;
  text-align: center !important;
}
html.b2b-board-fullscreen #lb .lb-pic.lb-zoom .lb-pbar { display: none !important; }
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
${isBoardSource(source) ? patchBoardTiming(source) : source}
${isBoardSource(source) ? BOARD_FONT_STYLE : ""}
${mobileBoardStyles}
${isCanvasSource(source) ? CANVAS_SCRIPT : ""}
${pictureOnly && isBoardSource(source) ? PICTURE_ONLY_STYLE : ""}
${blueprint && !isCanvasSource(source) ? (source.includes("data-b2b-check") ? CHECK_GREEN_STYLE : BLUEPRINT_STYLE) : ""}
${isCustomBoard(source) ? CUSTOM_BOARD_FIT : ""}
${isCanvasSource(source) ? "" : COLOR_REPORTER}
</body>
</html>`;
}

export function VisualizerBlock({
  source,
  title = "Custom visualizer",
  height,
  fit = false,
  fill = false,
  pictureOnly = false,
  onFullscreenChange,
}: VisualizerBlockData & { fill?: boolean; pictureOnly?: boolean; onFullscreenChange?: (open: boolean) => void }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mobileBoardHeight, setMobileBoardHeight] = useState(0);
  const [boardState, setBoardState] = useState({
    title,
    current: 1,
    total: 1,
    playing: false,
    hasPicture: false,
    canNext: true,
    canPrevious: false,
    nextLabel: "Next",
  });
  // The iframe is only created in the browser. A server-rendered iframe can finish loading before React
  // attaches onLoad, which left the first step stuck on "Loading visualizer...".
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const iframeSource = useMemo(() => buildSourceDocument(source, fit, pictureOnly), [source, fit, pictureOnly]);
  const requestedHeight = visualizerHeight(height);
  const [viewportHeight, setViewportHeight] = useState(800);
  useEffect(() => {
    const update = () => setViewportHeight(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  // fit: a board expands to the height of the screen it is on.
  const fitHeight = Math.max(420, viewportHeight - 160);
  const frameHeight = fill && isBoardSource(source)
    ? (fit ? fitHeight : Math.max(BOARD_MIN_HEIGHT, requestedHeight))
    : requestedHeight;
  const embeddedFrameHeight = Math.max(frameHeight, mobileBoardHeight);
  const canvas = isCanvasSource(source);
  // A picture-only board in the right-hand card: sized to the screen so its control bar is always in view.
  const pictureCard = pictureOnly && isBoardSource(source);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const timeoutRef = useRef<number | undefined>(undefined);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const sendBoardAction = (action: "previous" | "all" | "next" | "play" | "zoom-in" | "zoom-out" | "fullscreen" | "exit-fullscreen" | "picture-next" | "picture-back" | "picture-play" | "picture-zoom" | "measure-layout") => {
    iframeRef.current?.contentWindow?.postMessage({ source: "b2b-board-controls", action }, "*");
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
        if (event.data?.source === "b2b-board-color") {
          if (typeof event.data.color === "string" && /^rgba?\([\d.,\s]+\)$/.test(event.data.color)) {
            window.dispatchEvent(new CustomEvent("b2b-visualizer-color", { detail: event.data.color }));
          }
          return;
        }
        if (event.data?.source === "b2b-canvas-height") {
          const reported = event.data.height;
          if (canvas && Number.isFinite(reported)) setCanvasHeight(Math.min(MAX_MOBILE_BOARD_HEIGHT, Math.max(120, Math.round(reported))));
          return;
        }
        if (event.data?.source === "b2b-board-layout") {
          if (!fill || !isBoardSource(source)) return;
          const reportedHeight = event.data.height;
          if (
            Number.isInteger(reportedHeight)
            && reportedHeight >= frameHeight
            && reportedHeight <= MAX_MOBILE_BOARD_HEIGHT
            && window.matchMedia("(max-width: 767px)").matches
          ) {
            setMobileBoardHeight(reportedHeight > frameHeight ? reportedHeight : 0);
          } else if (
            Number.isInteger(reportedHeight)
            && reportedHeight < frameHeight
            && window.matchMedia("(max-width: 767px)").matches
          ) {
            setMobileBoardHeight(0);
          }
          return;
        }
        if (event.data?.source === "b2b-board-request" && event.data.action === "fullscreen") {
          setIsFullscreen(true);
          return;
        }
        if (event.data?.source !== "b2b-board-state") return;
        setBoardState({
          title: typeof event.data.title === "string" && event.data.title ? event.data.title : title,
          current: Number.isInteger(event.data.current) ? event.data.current : 1,
          total: Number.isInteger(event.data.total) ? event.data.total : 1,
          playing: event.data.playing === true,
          hasPicture: event.data.hasPicture === true,
          canNext: event.data.canNext !== false,
          canPrevious: event.data.canPrevious === true,
          nextLabel: typeof event.data.nextLabel === "string" && event.data.nextLabel ? event.data.nextLabel : "Next",
        });
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [canvas, fill, frameHeight, source, title]);

  // A canvas follows the lesson page's theme: tell it whether the page is dark, now and whenever it changes.
  useEffect(() => {
    if (!canvas || status !== "ready") return;
    const themed = iframeRef.current?.closest("[data-lesson-theme]") ?? null;
    const send = () => {
      const theme = themed?.getAttribute("data-lesson-theme") ?? "paper";
      iframeRef.current?.contentWindow?.postMessage({ source: "b2b-canvas-theme", dark: theme !== "paper" }, "*");
    };
    send();
    if (!themed) return;
    const observer = new MutationObserver(send);
    observer.observe(themed, { attributes: true, attributeFilter: ["data-lesson-theme"] });
    return () => observer.disconnect();
  }, [canvas, status]);

  useEffect(() => {
    setMobileBoardHeight(0);
  }, [iframeSource]);

  useEffect(() => {
    const resetDesktopBoardHeight = () => {
      if (!window.matchMedia("(max-width: 767px)").matches) setMobileBoardHeight(0);
    };
    window.addEventListener("resize", resetDesktopBoardHeight);
    return () => window.removeEventListener("resize", resetDesktopBoardHeight);
  }, []);

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
    window.setTimeout(() => sendBoardAction("measure-layout"), 0);
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
    <div className={`absolute inset-0 z-10 flex items-center justify-center p-6 text-center ${fill || fit ? "bg-[#12335A]" : "bg-white"}`}>
      <p className={`max-w-sm text-xs leading-5 ${fill || fit ? "text-[#9DB7D6]" : "text-[#666666]"}`}>
        {status === "error" ? "This visualizer could not be loaded. Please ask an administrator to check its code." : "Loading visualizer..."}
      </p>
    </div>
  ) : null;

  // Canvas mode: drawn straight on the lesson page, no card and no caption.
  if (canvas) {
    return (
      <div className="lesson-visualizer-canvas relative w-full" style={{ height: canvasHeight || requestedHeight }}>
        {status !== "ready" ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center">
            <p className="max-w-sm text-xs leading-5 opacity-70">
              {status === "error" ? "This visualizer could not be loaded. Please ask an administrator to check its code." : "Loading visualizer..."}
            </p>
          </div>
        ) : null}
        {frame}
      </div>
    );
  }

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
          className={isFullscreen ? "absolute inset-0 overflow-hidden bg-[#12335A]" : pictureCard ? "lesson-picture-card relative w-full overflow-hidden rounded-2xl bg-[#12335A] shadow-[0_10px_30px_rgba(10,25,45,0.25)]" : (fit ? "relative w-full overflow-hidden bg-transparent" : "relative w-full overflow-hidden rounded-xl bg-[#12335A]")}
          style={isFullscreen ? undefined : { height: pictureCard ? PICTURE_CARD_HEIGHT : embeddedFrameHeight }}
        >
          {overlay}
          {frame}
        </div>
        {isFullscreen && (
          <>
            <header className="absolute inset-x-0 top-0 z-20 flex min-h-12 items-center gap-2 border-b border-white/10 bg-[#142F55]/90 px-3 pt-[env(safe-area-inset-top)] text-white backdrop-blur-sm">
              {boardState.hasPicture ? (
                <>
                  <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                    {boardState.current} / {boardState.total}
                  </span>
                  <span className="flex-1" />
                </>
              ) : (
                <>
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
                </>
              )}
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
                aria-label={boardState.hasPicture ? "Previous picture frame" : "Back one board"}
                disabled={status !== "ready" || !boardState.canPrevious}
                onClick={() => sendBoardAction(boardState.hasPicture ? "picture-back" : "previous")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center rounded-full border border-white/70 px-3 text-xs font-semibold disabled:opacity-40 sm:max-w-32"
              >
                ‹ Back
              </button>
              <button
                type="button"
                aria-label={boardState.playing
                  ? boardState.hasPicture ? "Pause picture playback" : "Pause board playback"
                  : boardState.hasPicture ? "Play picture automatically" : "Play board automatically"}
                disabled={status !== "ready"}
                onClick={() => sendBoardAction(boardState.hasPicture ? "picture-play" : "play")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full border border-white/70 px-3 text-xs font-semibold disabled:opacity-40 sm:max-w-32"
              >
                {boardState.playing ? <Pause size={14} /> : <Play size={14} />}
                {boardState.playing ? "Pause" : "Play"}
              </button>
              <button
                type="button"
                aria-label={boardState.hasPicture ? "Next picture frame" : "Next board"}
                disabled={status !== "ready" || !boardState.canNext}
                onClick={() => sendBoardAction(boardState.hasPicture ? "picture-next" : "next")}
                className="flex min-h-10 min-w-0 flex-1 items-center justify-center gap-1 rounded-full bg-[#F0BC21] px-3 text-xs font-semibold text-[#18243A] disabled:opacity-40 sm:max-w-32"
              >
                {boardState.nextLabel.length > 18 ? "Continue" : boardState.nextLabel.replace(/[→›]$/, "").trim()} <ArrowRight size={14} />
              </button>
            </nav>
          </>
        )}
        {!isFullscreen && !fit && !pictureCard && isBoardSource(source) ? (
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
            {pictureOnly ? null : <button
              type="button"
              aria-label="Show all boards"
              disabled={status !== "ready"}
              onClick={() => sendBoardAction("all")}
              className="inline-flex h-10 min-w-20 items-center justify-center rounded-full border border-[#BDB8AE] bg-white px-4 text-xs font-semibold text-[#25231F] shadow-sm disabled:opacity-50"
            >
              All boards
            </button>}
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

  // Fit mode: no card chrome; the visualizer fills the height of the screen it is on.
  if (fit) {
    return (
      <div
        className="lesson-visualizer-fit relative w-full overflow-hidden rounded-2xl border border-white/25"
        style={{ height: "max(420px, calc(100dvh - 160px))" }}
      >
        {overlay}
        {frame}
      </div>
    );
  }

  return (
    <figure className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <div className="relative w-full" style={{ height: embeddedFrameHeight }}>
        {overlay}
        {frame}
      </div>
      <figcaption className="border-t border-[#E5E5E5] px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#666666]">
        Custom visualizer
      </figcaption>
    </figure>
  );
}
