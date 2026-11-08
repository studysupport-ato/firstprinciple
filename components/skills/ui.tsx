import type { CSSProperties, ReactNode } from "react";

export const INK = "#1A1814";
export const GOLD = "#E9BC3A";
export const CREAM = "#F6EFDC";
export const GREEN = "#12804A";
export const PAPER = "#FFFBF0";

export const goldGround: CSSProperties = {
  backgroundColor: GOLD,
  backgroundImage:
    "linear-gradient(rgba(26,24,20,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(26,24,20,.06) 1px, transparent 1px), var(--gold-sweep, linear-gradient(135deg,#D8A01C 0%,#F2D57D 38%,#E9BC3A 68%,#D19F1A 100%))",
  backgroundSize: "40px 40px, 40px 40px, 100% 100%",
};

export const font: CSSProperties = { fontFamily: "var(--font-outfit), Outfit, ui-sans-serif, sans-serif" };

export function StatusBadge({ status }: { status: string }) {
  if (!status) return null;
  const ongoing = status === "ongoing";
  const label = status === "ongoing" ? "ONGOING" : status === "coming_soon" ? "COMING SOON" : "ENDED";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 24, padding: "0 10px", borderRadius: 999, background: ongoing ? GREEN : status === "ended" ? "#8A8478" : "rgba(26,24,20,.12)", color: ongoing || status === "ended" ? "#fff" : INK, fontSize: 11, fontWeight: 900, letterSpacing: ".08em", whiteSpace: "nowrap" }}>
      {ongoing ? <span className="sk-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: "#fff" }} /> : null}
      {label}
    </span>
  );
}

export function PriceBadge({ price, dark }: { price: "free" | "paid"; dark?: boolean }) {
  return price === "free" ? (
    <span style={{ height: 24, padding: "0 9px", borderRadius: 7, background: dark ? GOLD : INK, color: dark ? INK : GOLD, fontSize: 12, fontWeight: 900, display: "inline-flex", alignItems: "center" }}>FREE</span>
  ) : (
    <span style={{ height: 24, padding: "0 9px", borderRadius: 7, border: `1px solid ${dark ? GOLD : INK}`, color: dark ? GOLD : INK, fontSize: 11, fontWeight: 900, letterSpacing: ".06em", display: "inline-flex", alignItems: "center" }}>PAID</span>
  );
}

export function SkillsStyles() {
  return (
    <style>{`
.sk-pulse{animation:skPulse 1.4s ease-in-out infinite}
@keyframes skPulse{50%{opacity:.35}}
.sk-tiles{display:flex;flex-direction:column;gap:12px}
.sk-tile{display:flex;gap:12px;padding:10px;border-radius:20px;text-decoration:none;box-shadow:0 12px 24px -14px rgba(26,24,20,.6)}
.sk-thumb{width:96px;height:112px;flex-shrink:0;border-radius:14px;overflow:hidden}
@media (min-width:768px){
.sk-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,340px));gap:22px}
.sk-tile{flex-direction:column;padding:0;overflow:hidden;gap:0}
.sk-thumb{width:100%;height:150px;border-radius:0}
.sk-body{padding:12px 16px 16px}
}
.sk-next{display:grid;grid-template-columns:auto 1fr;gap:16px;align-items:center}
.sk-grid{display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:27vw;gap:6px}
.sk-grid > :first-child{grid-column:span 2;grid-row:span 2}
@media (min-width:768px){.sk-grid{grid-template-columns:2fr 1fr 1fr 1fr;grid-auto-rows:130px;gap:8px}}
@media (prefers-reduced-motion: reduce){.sk-pulse{animation:none}}
`}</style>
  );
}

export function Wrap({ children }: { children: ReactNode }) {
  return <div style={{ maxWidth: 1180, margin: "0 auto", padding: "22px 18px 40px" }}>{children}</div>;
}
