"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, X } from "lucide-react";
import { INK, GOLD } from "./ui";

const src = (id: string, w: number) => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w${w}`;

/** A week's preview photos in a mosaic; tap one to see it large. */
export function WeekGallery({ previews, title, pixiesetUrl }: { previews: string[]; title: string; pixiesetUrl: string | null }) {
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % previews.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + previews.length) % previews.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, previews.length]);

  return (
    <>
      {previews.length ? (
        <div className="sk-grid" style={{ marginTop: 10 }}>
          {previews.slice(0, 7).map((id, i) => (
            <button key={id} type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1} from ${title}`} style={{ position: "relative", border: 0, padding: 0, borderRadius: 14, overflow: "hidden", background: "#E9E2CF", cursor: "zoom-in", minHeight: 0 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src(id, i === 0 ? 1000 : 500)} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            </button>
          ))}
        </div>
      ) : null}
      {pixiesetUrl ? (
        <a href={pixiesetUrl} target="_blank" rel="noopener noreferrer" style={{ marginTop: 10, display: "inline-flex", alignItems: "center", gap: 8, minHeight: 44, padding: "0 18px", borderRadius: 999, background: INK, color: GOLD, fontSize: 14, fontWeight: 900, textDecoration: "none" }}>
          View full gallery on Pixieset <ExternalLink size={15} strokeWidth={2.6} />
        </a>
      ) : null}
      {open !== null ? (
        <div role="dialog" aria-modal="true" aria-label={title} onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, zIndex: 2147483000, background: "rgba(10,9,8,.92)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src(previews[open], 2000)} alt="" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "100%", maxHeight: "86dvh", borderRadius: 12, objectFit: "contain" }} />
          <button type="button" aria-label="Close" onClick={() => setOpen(null)} style={{ position: "absolute", top: 14, right: 14, width: 46, height: 46, borderRadius: 999, border: 0, background: "rgba(255,255,255,.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={22} /></button>
          {previews.length > 1 ? (
            <>
              <button type="button" aria-label="Previous photo" onClick={(e) => { e.stopPropagation(); setOpen((open - 1 + previews.length) % previews.length); }} style={{ position: "absolute", left: 10, top: "50%", width: 46, height: 46, marginTop: -23, borderRadius: 999, border: 0, background: "rgba(255,255,255,.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronLeft size={24} /></button>
              <button type="button" aria-label="Next photo" onClick={(e) => { e.stopPropagation(); setOpen((open + 1) % previews.length); }} style={{ position: "absolute", right: 10, top: "50%", width: 46, height: 46, marginTop: -23, borderRadius: 999, border: 0, background: "rgba(255,255,255,.15)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><ChevronRight size={24} /></button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
