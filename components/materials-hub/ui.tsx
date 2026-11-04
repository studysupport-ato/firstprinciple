"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { HUB_FONT } from "@/lib/site/materialsHub";
import { DepartmentDrawing } from "@/components/course-materials/DepartmentDrawing";

export const INK = "#1A1814";
export const CREAM = "#F6EFDC";
export const GOLD = "#E9BC3A";
export const GOLD_LIGHT = "#F0C84A";
export const BROWN = "#8F6500";
export const SHEET = "#FFFDF8";
export const MUTED = "#8A8478";
export const SOFT = "#F3EEE2";
export const ROW_LINE = "rgba(233,188,58,.12)";
export const GOLD_EDGE = "1px solid rgba(233,188,58,.3)";
export const YT_RED = "#FF0033";

export const hubFont: CSSProperties = { fontFamily: HUB_FONT };

/** Back buttons: big, dark and easy to hit with a thumb. */
export const backButtonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  minHeight: 50,
  maxWidth: "100%",
  padding: "0 20px 0 14px",
  border: 0,
  borderRadius: 999,
  background: INK,
  color: GOLD,
  fontFamily: "inherit",
  fontSize: 16,
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
  boxShadow: "0 10px 22px -12px rgba(26,24,20,.6)",
};
export const backLabelStyle: CSSProperties = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };

/** The site's gold sweep (globals.css --gold-sweep) under a faint dark grid. */
export const goldGround: CSSProperties = {
  backgroundColor: GOLD,
  backgroundImage:
    "linear-gradient(rgba(26,24,20,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(26,24,20,.05) 1px, transparent 1px), var(--gold-sweep, linear-gradient(135deg, #D8A01C 0%, #F2D57D 38%, #E9BC3A 68%, #D19F1A 100%))",
  backgroundSize: "48px 48px, 48px 48px, 100% 100%",
};

/** Polished gold: code tiles, year/semester tags, Download all, book covers. */
export const goldPlate: CSSProperties = {
  background: "linear-gradient(135deg, #C8901A 0%, #F6DC8A 34%, #E9BC3A 58%, #B9840F 100%)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,.55), inset 0 -1px 0 rgba(120,80,0,.35)",
  color: INK,
};

export const panelShadow = "0 16px 34px -16px rgba(26,24,20,.62)";

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ borderRadius: 24, background: INK, overflow: "hidden", boxShadow: panelShadow, border: GOLD_EDGE, ...style }}>{children}</div>;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(26,24,20,.6)", ...style }}>{children}</p>;
}

export function Pill({ children, light, gold }: { children: ReactNode; light?: boolean; gold?: boolean }) {
  const look: CSSProperties = gold ? goldPlate : { background: light ? SOFT : INK, color: light ? INK : CREAM };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap", ...look }}>
      {children}
    </span>
  );
}

/**
 * Dark card on a gold blueprint grid with the programme's line drawing on the
 * right, as on the department cards of the Course Materials page. Text stays
 * clear of the drawing.
 */
export function BlueprintCard({ department, children, compact, style }: { department?: string; children: ReactNode; compact?: boolean; style?: CSSProperties }) {
  return (
    <div style={{ position: "relative", overflow: "hidden", borderRadius: 26, background: INK, border: GOLD_EDGE, boxShadow: panelShadow, padding: compact ? "18px 18px 16px" : 20, color: CREAM, ...style }}>
      <span aria-hidden style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(#E9BC3A 1px, transparent 1px), linear-gradient(90deg, #E9BC3A 1px, transparent 1px)", backgroundSize: "24px 24px", opacity: 0.08, pointerEvents: "none" }} />
      {department ? (
        <DepartmentDrawing
          name={department}
          style={{ position: "absolute", right: compact ? -22 : -26, ...(compact ? { top: 8 } : { bottom: -8 }), width: compact ? 150 : 170, height: compact ? 94 : 106, color: CREAM, opacity: compact ? 0.45 : 0.5, pointerEvents: "none" }}
        />
      ) : null}
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

export function RoundChevron() {
  return (
    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(233,188,58,.45)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </span>
  );
}

/**
 * Renders on top of the whole page (attached to <body>), so a full-screen
 * overlay is never boxed in by the page layout around it.
 */
export function Overlay({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

export const OVERLAY_Z = 2147483000;

export function Sheet({ open, onClose, children, label, maxHeight }: { open: boolean; onClose?: () => void; children: ReactNode; label: string; maxHeight?: string }) {
  if (!open) return null;
  return (
    <Overlay>
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, display: "flex", alignItems: "flex-end", justifyContent: "center", ...hubFont }}>
      <button type="button" aria-label="Close" onClick={onClose} className="hub-fade" style={{ position: "absolute", inset: 0, border: 0, padding: 0, background: "rgba(14,13,11,.55)", cursor: onClose ? "pointer" : "default" }} />
      <div className="hub-sheet" style={{ position: "relative", width: "100%", maxWidth: 520, maxHeight: maxHeight ?? "88dvh", display: "flex", flexDirection: "column", background: SHEET, borderRadius: "30px 30px 0 0", boxShadow: "0 -20px 50px rgba(0,0,0,.25)", paddingBottom: "env(safe-area-inset-bottom, 0px)", overflow: "hidden" }}>
        <span aria-hidden style={{ width: 40, height: 5, borderRadius: 999, background: "#E4DFD3", margin: "10px auto 0", flexShrink: 0 }} />
        {children}
      </div>
    </div>
    </Overlay>
  );
}

/** Keyframes for sheets and rows (scoped class names). */
export function HubStyles() {
  return (
    <style>{`
@keyframes hubUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
@keyframes hubSheet{from{transform:translateY(100%)}to{transform:none}}
@keyframes hubFade{from{opacity:0}to{opacity:1}}
.hub-row{animation:hubUp .42s cubic-bezier(.22,1,.36,1) both}
.hub-sheet{animation:hubSheet .45s cubic-bezier(.22,1,.36,1) both}
.hub-fade{animation:hubFade .3s ease both}
.hub-tap{transition:background-color .15s ease, transform .15s ease}
.hub-tap:active{transform:scale(.985)}
.hub-dark-row:hover{background:#221F19}
.hub-plate{transition:filter .15s ease}.hub-plate:hover{filter:brightness(1.06)}
.hub-scroll{scrollbar-width:none}.hub-scroll::-webkit-scrollbar{display:none}
@media (prefers-reduced-motion: reduce){.hub-row,.hub-sheet,.hub-fade{animation:none}}
`}</style>
  );
}
