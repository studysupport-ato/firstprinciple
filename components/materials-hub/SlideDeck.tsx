"use client";

/**
 * Slides that swipe sideways, drawn with PDF.js straight from Google Drive.
 * Falls back to Google's own preview when the file is not a PDF or can't be read.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { driveMediaUrl, drivePreviewUrl, type DriveItem } from "@/lib/site/materialsHub";
import { CREAM, GOLD, INK, goldPlate } from "./ui";

// The "legacy" build also runs on older phones (older iPhone Safari can’t run the modern build).
const WORKER_SRC = "/pdfjs/pdf.worker-legacy-6.3.289.min.mjs";

export function isPdfItem(item: DriveItem) {
  return item.mimeType === "application/pdf" || /\.pdf$/i.test(item.name);
}

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");
let libPromise: Promise<PdfJs> | null = null;
function loadLib() {
  libPromise ??= import("pdfjs-dist/legacy/build/pdf.mjs").then((pdfjs) => {
    pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
    return pdfjs;
  });
  return libPromise;
}

// Opened files stay in memory for the visit, so going back to a deck is instant.
const docs = new Map<string, { promise: Promise<PDFDocumentProxy>; progress: number; listeners: Set<(p: number) => void> }>();
function openDoc(id: string) {
  let entry = docs.get(id);
  if (!entry) {
    const listeners = new Set<(p: number) => void>();
    const created: { promise: Promise<PDFDocumentProxy>; progress: number; listeners: Set<(p: number) => void> } = { promise: Promise.resolve(null as unknown as PDFDocumentProxy), progress: 0, listeners };
    created.promise = loadLib().then((pdfjs) => {
      const load = (simple: boolean) => {
        // Second try: one plain download (no partial requests), which some phones need.
        const task = pdfjs.getDocument(simple ? { url: driveMediaUrl(id), disableRange: true, disableStream: true } : { url: driveMediaUrl(id), disableAutoFetch: true, rangeChunkSize: 1048576 });
        task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
          if (!total) return;
          created.progress = Math.min(99, Math.round((loaded / total) * 100));
          listeners.forEach((fn) => fn(created.progress));
        };
        return task.promise;
      };
      return load(false).catch(() => load(true));
    });
    created.promise.catch(() => docs.delete(id));
    entry = created;
    docs.set(id, entry);
    if (docs.size > 6) {
      const oldest = docs.keys().next().value as string;
      void docs.get(oldest)?.promise.then((d) => d.cleanup()).catch(() => undefined);
      docs.delete(oldest);
    }
  }
  return entry;
}

/** Warm up the slide viewer (and optionally start fetching one file) before it is opened. */
export function preloadSlides(fileId?: string) {
  if (typeof window === "undefined") return;
  void loadLib().catch(() => undefined);
  if (fileId) void openDoc(fileId).promise.catch(() => undefined);
}

// Draws pages one at a time so the slide on screen is never waiting behind thumbnails.
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const run = queue.then(job, job);
  queue = run.catch(() => undefined);
  return run;
}

export function SlideDeck({ item, title, onPage }: { item: DriveItem; title: string; onPage?: (page: number, total: number) => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(!isPdfItem(item));
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [firstDrawn, setFirstDrawn] = useState(false);
  const [slot, setSlot] = useState({ w: 0, h: 0 });
  // 1 = fit (whole slide, or page width for portrait pages); larger values zoom in.
  const [zoom, setZoom] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPdfItem(item)) return;
    let cancelled = false;
    const entry = openDoc(item.id);
    setProgress(entry.progress);
    const listen = (p: number) => !cancelled && setProgress(p);
    entry.listeners.add(listen);
    entry.promise.then(
      (d) => !cancelled && setDoc(d),
      () => !cancelled && setFailed(true),
    );
    return () => {
      cancelled = true;
      entry.listeners.delete(listen);
    };
  }, [item.id, item]);

  // The space one slide can fill, so each page keeps its own shape.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const measure = () => setSlot({ w: Math.max(0, track.clientWidth - 24), h: Math.max(0, track.clientHeight - 32) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [doc]);

  const total = doc?.numPages ?? 0;

  useEffect(() => {
    if (total) onPage?.(page, total);
  }, [page, total, onPage]);

  const goTo = useCallback(
    (n: number) => {
      const track = trackRef.current;
      if (!track || !total) return;
      const target = Math.max(1, Math.min(total, n));
      track.scrollTo({ left: (target - 1) * track.clientWidth, behavior: "smooth" });
    },
    [total],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(page + 1);
      if (e.key === "ArrowLeft") goTo(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, page]);

  // Keep the current thumbnail in view.
  useEffect(() => {
    const strip = thumbsRef.current;
    const thumb = strip?.querySelector<HTMLElement>(`[data-thumb="${page}"]`);
    if (strip && thumb) strip.scrollTo({ left: thumb.offsetLeft - strip.clientWidth / 2 + thumb.clientWidth / 2, behavior: "smooth" });
  }, [page]);

  if (failed) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        <iframe title={title} src={drivePreviewUrl(item.id)} allow="autoplay" style={{ flex: 1, minHeight: 0, width: "100%", border: 0, background: "#211D17", display: "block" }} />
        <a href={`https://drive.google.com/file/d/${item.id}/view`} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, height: 52, background: INK, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, textDecoration: "none", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          Page not loading? Open in Google Drive
        </a>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "rgba(246,239,220,.7)", fontSize: 14, fontWeight: 700 }}>
        <span className="deck-spin" style={{ width: 34, height: 34, borderRadius: 999, border: "3px solid rgba(233,188,58,.25)", borderTopColor: GOLD }} />
        {progress > 0 ? `Opening slides… ${progress}%` : "Opening slides…"}
        <style>{`.deck-spin{animation:deckSpin .8s linear infinite}@keyframes deckSpin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const pages = Array.from({ length: total }, (_, i) => i + 1);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
      <style>{`
.deck-track{scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain}
.deck-track::-webkit-scrollbar,.deck-thumbs::-webkit-scrollbar{display:none}
.deck-thumbs{scrollbar-width:none}
.deck-arrow{display:none}
.deck-cell{display:flex}
.deck-cell > div{margin:auto}
.deck-zoom{position:absolute;right:14px;top:10px;z-index:3;display:flex;gap:6px}
.deck-zoom button{height:38px;min-width:38px;padding:0 12px;border-radius:999px;border:1px solid rgba(233,188,58,.5);background:rgba(26,23,18,.88);color:#E9BC3A;font:inherit;font-size:15px;font-weight:900;cursor:pointer}
.deck-zoom button:disabled{opacity:.35;cursor:default}
@media (min-width:768px){.deck-arrow{display:flex}}
`}</style>
      <div
        ref={trackRef}
        className="deck-track"
        onScroll={(e) => {
          const t = e.currentTarget;
          const n = Math.round(t.scrollLeft / Math.max(1, t.clientWidth)) + 1;
          if (n !== page) setPage(n);
        }}
        style={{ flex: 1, minHeight: 0, display: "flex", overflowX: "auto", overflowY: "hidden" }}
      >
        {pages.map((n) => (
          <div key={n} className="deck-cell" style={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start", overflow: "auto", padding: "16px 12px" }}>
            <PageCanvas doc={doc} n={n} slot={slot} zoom={zoom} render={n === page || (firstDrawn && Math.abs(n - page) <= 2)} onDrawn={n === 1 ? () => setFirstDrawn(true) : undefined} />
          </div>
        ))}
      </div>

      <div className="deck-zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(1, Math.round((z - 0.5) * 2) / 2))} disabled={zoom <= 1}>−</button>
        <button type="button" aria-label="Fit to screen" onClick={() => setZoom(1)} disabled={zoom === 1}>{Math.round(zoom * 100)}%</button>
        <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3}>+</button>
      </div>

      <button type="button" className="deck-arrow" aria-label="Previous slide" onClick={() => goTo(page - 1)} disabled={page <= 1} style={{ position: "absolute", left: 18, top: "calc(50% - 58px)", width: 54, height: 54, borderRadius: 999, border: "1px solid rgba(233,188,58,.5)", background: INK, color: GOLD, alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page <= 1 ? 0.35 : 1 }}>
        <ChevronLeft size={26} strokeWidth={2.6} />
      </button>
      <button type="button" className="deck-arrow" aria-label="Next slide" onClick={() => goTo(page + 1)} disabled={page >= total} style={{ position: "absolute", right: 18, top: "calc(50% - 58px)", width: 54, height: 54, borderRadius: 999, border: 0, ...goldPlate, alignItems: "center", justifyContent: "center", cursor: "pointer", opacity: page >= total ? 0.35 : 1 }}>
        <ChevronRight size={26} strokeWidth={2.6} />
      </button>

      <div ref={thumbsRef} className="deck-thumbs" style={{ flexShrink: 0, height: 92, background: INK, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", paddingBottom: "env(safe-area-inset-bottom, 0px)", overflowX: "auto", position: "relative" }}>
        {pages.map((n) => (
          <button
            key={n}
            type="button"
            data-thumb={n}
            aria-label={`Slide ${n}`}
            onClick={() => goTo(n)}
            style={{ flexShrink: 0, height: 62, width: 86, padding: 0, border: 0, borderRadius: 6, overflow: "hidden", background: "#fff", cursor: "pointer", outline: n === page ? `3px solid ${GOLD}` : "none", outlineOffset: 2, opacity: n === page ? 1 : 0.55 }}
          >
            <Thumb doc={doc} n={n} root={thumbsRef} enabled={firstDrawn} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PageCanvas({ doc, n, slot, zoom, render, onDrawn }: { doc: PDFDocumentProxy; n: number; slot: { w: number; h: number }; zoom: number; render: boolean; onDrawn?: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const drawnFor = useRef("");
  const onDrawnRef = useRef(onDrawn);
  onDrawnRef.current = onDrawn;

  useEffect(() => {
    if (!render || !slot.w || !slot.h) return;
    const key = `${slot.w}x${slot.h}@${zoom}`;
    if (drawnFor.current === key) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    void enqueue(async () => {
      try {
        if (cancelled) return;
        const p = await doc.getPage(n);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const base = p.getViewport({ scale: 1 });
        // Slides (landscape) fit the screen. Book and note pages (portrait) fit the width, up to a
        // comfortable reading width, and scroll down, so their text is large enough to read.
        const portrait = base.height > base.width * 1.1;
        const fit = (portrait ? Math.min(slot.w, 900) / base.width : Math.min(slot.w / base.width, slot.h / base.height)) * zoom;
        const w = Math.floor(base.width * fit);
        const h = Math.floor(base.height * fit);
        // Draw with extra pixels so small print stays sharp, but keep the canvas within what phones can hold.
        const want = Math.max(1.5, Math.min(window.devicePixelRatio || 1, 3));
        const cap = Math.sqrt(16_000_000 / Math.max(1, w * h));
        const vp = p.getViewport({ scale: fit * Math.min(want, cap) });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        task = p.render({ canvas, viewport: vp });
        await task.promise;
        if (cancelled) return;
        setSize({ w, h });
        drawnFor.current = key;
        onDrawnRef.current?.();
      } catch {
        /* cancelled or unreadable page */
      }
    });
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, n, render, slot.w, slot.h, zoom]);

  return (
    <div style={{ position: "relative", width: size?.w ?? Math.min(slot.w, 640), height: size?.h ?? Math.min(slot.h, 360), background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,.5)", flexShrink: 0 }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {!size ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8A8478", fontSize: 13, fontWeight: 700 }}>Slide {n}</span> : null}
    </div>
  );
}

function Thumb({ doc, n, root, enabled }: { doc: PDFDocumentProxy; n: number; root: React.RefObject<HTMLDivElement | null>; enabled: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || visible || !enabled) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { root: root.current, rootMargin: "0px 300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root, visible, enabled]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    void enqueue(async () => {
      try {
        if (cancelled) return;
        const p = await doc.getPage(n);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const base = p.getViewport({ scale: 1 });
        const vp = p.getViewport({ scale: Math.min(172 / base.width, 124 / base.height) });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        await p.render({ canvas, viewport: vp }).promise;
      } catch {
        /* ignore */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [visible, doc, n]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", objectFit: "contain", background: "#fff", color: CREAM }} />;
}
