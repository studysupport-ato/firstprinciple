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

const WORKER_SRC = "/pdfjs/pdf.worker-6.3.289.min.mjs";

export function isPdfItem(item: DriveItem) {
  return item.mimeType === "application/pdf" || /\.pdf$/i.test(item.name);
}

export function SlideDeck({ item, title, onPage }: { item: DriveItem; title: string; onPage?: (page: number, total: number) => void }) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [failed, setFailed] = useState(!isPdfItem(item));
  const [ratio, setRatio] = useState(16 / 9);
  const [page, setPage] = useState(1);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isPdfItem(item)) return;
    let cancelled = false;
    let loading: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = WORKER_SRC;
        const task = pdfjs.getDocument({ url: driveMediaUrl(item.id) });
        loading = task;
        const d = await task.promise;
        if (cancelled) return;
        const first = await d.getPage(1);
        const vp = first.getViewport({ scale: 1 });
        setRatio(vp.width / vp.height);
        setDoc(d);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      void loading?.destroy();
    };
  }, [item]);

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
    return <iframe title={title} src={drivePreviewUrl(item.id)} allow="autoplay" style={{ flex: 1, minHeight: 0, width: "100%", border: 0, background: "#211D17", display: "block" }} />;
  }

  if (!doc) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 14, color: "rgba(246,239,220,.7)", fontSize: 14, fontWeight: 700 }}>
        <span className="deck-spin" style={{ width: 34, height: 34, borderRadius: 999, border: "3px solid rgba(233,188,58,.25)", borderTopColor: GOLD }} />
        Opening slides…
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
          <div key={n} style={{ flex: "0 0 100%", height: "100%", scrollSnapAlign: "start", display: "flex", alignItems: "center", justifyContent: "center", padding: "16px 12px" }}>
            <PageCanvas doc={doc} n={n} ratio={ratio} render={Math.abs(n - page) <= 2} />
          </div>
        ))}
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
            style={{ flexShrink: 0, height: 62, width: Math.round(62 * ratio), padding: 0, border: 0, borderRadius: 6, overflow: "hidden", background: "#fff", cursor: "pointer", outline: n === page ? `3px solid ${GOLD}` : "none", outlineOffset: 2, opacity: n === page ? 1 : 0.55 }}
          >
            <Thumb doc={doc} n={n} root={thumbsRef} />
          </button>
        ))}
      </div>
    </div>
  );
}

function PageCanvas({ doc, n, ratio, render }: { doc: PDFDocumentProxy; n: number; ratio: number; render: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    if (!render || drawn) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<unknown> } | null = null;
    (async () => {
      try {
        const p = await doc.getPage(n);
        const box = boxRef.current;
        const canvas = canvasRef.current;
        if (cancelled || !box || !canvas) return;
        const base = p.getViewport({ scale: 1 });
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const scale = (Math.max(box.clientWidth, 320) / base.width) * dpr;
        const vp = p.getViewport({ scale });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        task = p.render({ canvas, viewport: vp });
        await task.promise;
        if (!cancelled) setDrawn(true);
      } catch {
        /* cancelled or unreadable page */
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, n, render, drawn]);

  return (
    <div ref={boxRef} style={{ position: "relative", width: "100%", maxWidth: 1100, maxHeight: "100%", aspectRatio: String(ratio), background: "#fff", borderRadius: 8, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,.5)" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      {!drawn ? <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#8A8478", fontSize: 13, fontWeight: 700 }}>Slide {n}</span> : null}
    </div>
  );
}

function Thumb({ doc, n, root }: { doc: PDFDocumentProxy; n: number; root: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setVisible(true), { root: root.current, rootMargin: "0px 300px" });
    io.observe(el);
    return () => io.disconnect();
  }, [root, visible]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await doc.getPage(n);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const base = p.getViewport({ scale: 1 });
        const vp = p.getViewport({ scale: 124 / base.height });
        canvas.width = Math.floor(vp.width);
        canvas.height = Math.floor(vp.height);
        await p.render({ canvas, viewport: vp }).promise;
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, doc, n]);

  return <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block", background: "#fff", color: CREAM }} />;
}
