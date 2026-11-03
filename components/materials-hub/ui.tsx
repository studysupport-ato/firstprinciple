"use client";

import type { CSSProperties, ReactNode } from "react";
import { HUB_FONT } from "@/lib/site/materialsHub";

export const INK = "#1A1814";
export const CREAM = "#F6EFDC";
export const GOLD = "#E9BC3A";
export const GOLD_LIGHT = "#F0C84A";
export const BROWN = "#8F6500";
export const SHEET = "#FFFDF8";
export const MUTED = "#8A8478";
export const SOFT = "#F3EEE2";
export const ROW_LINE = "rgba(246,239,220,.07)";
export const YT_RED = "#FF0033";

export const hubFont: CSSProperties = { fontFamily: HUB_FONT };

export const goldGround: CSSProperties = {
  backgroundColor: GOLD,
  backgroundImage:
    "linear-gradient(rgba(26,24,20,.045) 1px, transparent 1px), linear-gradient(90deg, rgba(26,24,20,.045) 1px, transparent 1px), linear-gradient(160deg, #F3CF5A 0%, #E9BC3A 50%, #D9AC30 100%)",
  backgroundSize: "64px 64px, 64px 64px, 100% 100%",
};

export const panelShadow = "0 14px 32px -14px rgba(26,24,20,.55)";

export function Panel({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ borderRadius: 24, background: INK, overflow: "hidden", boxShadow: panelShadow, ...style }}>{children}</div>;
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(26,24,20,.6)", ...style }}>{children}</p>;
}

export function Pill({ children, light }: { children: ReactNode; light?: boolean }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 28, padding: "0 11px", borderRadius: 999, background: light ? SOFT : INK, color: light ? INK : CREAM, fontSize: 12, fontWeight: 800, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

export function RoundChevron() {
  return (
    <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, background: "#2A251C", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(246,239,220,.6)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
    </span>
  );
}

export function Sheet({ open, onClose, children, label, maxHeight }: { open: boolean; onClose?: () => void; children: ReactNode; label: string; maxHeight?: string }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label={label} style={{ position: "fixed", inset: 0, zIndex: 90, display: "flex", alignItems: "flex-end", justifyContent: "center", ...hubFont }}>
      <button type="button" aria-label="Close" onClick={onClose} className="hub-fade" style={{ position: "absolute", inset: 0, border: 0, padding: 0, background: "rgba(14,13,11,.55)", cursor: onClose ? "pointer" : "default" }} />
      <div className="hub-sheet" style={{ position: "relative", width: "100%", maxWidth: 520, maxHeight: maxHeight ?? "88dvh", display: "flex", flexDirection: "column", background: SHEET, borderRadius: "30px 30px 0 0", boxShadow: "0 -20px 50px rgba(0,0,0,.25)", paddingBottom: "env(safe-area-inset-bottom, 0px)", overflow: "hidden" }}>
        <span aria-hidden style={{ width: 40, height: 5, borderRadius: 999, background: "#E4DFD3", margin: "10px auto 0", flexShrink: 0 }} />
        {children}
      </div>
    </div>
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
.hub-scroll{scrollbar-width:none}.hub-scroll::-webkit-scrollbar{display:none}
@media (prefers-reduced-motion: reduce){.hub-row,.hub-sheet,.hub-fade{animation:none}}
`}</style>
  );
}
