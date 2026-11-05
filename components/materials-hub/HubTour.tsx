"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { CREAM, GOLD, INK, OVERLAY_Z, Overlay, goldPlate, hubFont } from "./ui";

export const TOUR_DONE_KEY = "b2b.hubTour.done.v1";

export function tourDone() {
  try {
    return window.localStorage.getItem(TOUR_DONE_KEY) === "1";
  } catch {
    return true;
  }
}

export interface TourStep {
  /** data-tour-step value of the part to light up; none = a centred card. */
  target?: string;
  title: string;
  body: string;
  /** Final-step action, e.g. turning on notifications. */
  action?: { label: string; run: () => Promise<unknown> | void };
}

type Box = { top: number; left: number; width: number; height: number };

/** Dims the page, lights up one part at a time with a gold ring, and explains it. */
export function HubTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const live = steps.filter((s) => !s.target || document.querySelector(`[data-tour-step="${s.target}"]`));
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [busy, setBusy] = useState(false);
  const step = live[Math.min(index, live.length - 1)];

  const measure = useCallback(() => {
    if (!step?.target) return setBox(null);
    const el = document.querySelector(`[data-tour-step="${step.target}"]`);
    if (!el) return setBox(null);
    const r = el.getBoundingClientRect();
    setBox({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [step]);

  useLayoutEffect(() => {
    if (!step?.target) {
      setBox(null);
      return;
    }
    const el = document.querySelector(`[data-tour-step="${step.target}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t1 = window.setTimeout(measure, 380);
    const t2 = window.setTimeout(measure, 800);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [step, measure]);

  useEffect(() => {
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  const finish = () => {
    try {
      window.localStorage.setItem(TOUR_DONE_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    onClose();
  };

  if (!step) return null;
  const last = index >= live.length - 1;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const cardWidth = Math.min(380, vw - 32);
  // Card goes below the lit part when there is room, otherwise above it.
  let cardTop = vh / 2 - 120;
  let cardLeft = (vw - cardWidth) / 2;
  if (box) {
    const below = box.top + box.height + 14;
    cardTop = below + 230 < vh ? below : Math.max(16, box.top - 244);
    cardLeft = Math.min(Math.max(16, box.left), vw - cardWidth - 16);
  }

  return (
    <Overlay>
      <div role="dialog" aria-modal="true" aria-label="How it works" style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, ...hubFont }}>
        {box ? (
          <div aria-hidden style={{ position: "fixed", top: box.top, left: box.left, width: box.width, height: box.height, borderRadius: 26, boxShadow: `0 0 0 4px ${GOLD}, 0 0 0 9999px rgba(14,13,11,.66)`, transition: "all .3s cubic-bezier(.22,1,.36,1)", pointerEvents: "none" }} />
        ) : (
          <div aria-hidden style={{ position: "fixed", inset: 0, background: "rgba(14,13,11,.66)" }} />
        )}
        <div className="hub-sheet" style={{ position: "fixed", top: cardTop, left: cardLeft, width: cardWidth, boxSizing: "border-box", background: "#FFFDF8", color: INK, borderRadius: 20, border: `2px solid ${GOLD}`, padding: "16px 18px", boxShadow: "0 20px 40px rgba(0,0,0,.4)", transition: "top .3s, left .3s" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, fontWeight: 900, letterSpacing: ".12em", color: "#8F6500" }}>STEP {index + 1} OF {live.length}</span>
            <button type="button" onClick={finish} style={{ border: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#5C564B", cursor: "pointer", minHeight: 36 }}>Skip tour</button>
          </div>
          <h2 style={{ margin: "6px 0 0", fontSize: 21, fontWeight: 900, lineHeight: 1.15 }}>{step.title}</h2>
          <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.45, color: "#3A352B" }}>{step.body}</p>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            {index > 0 ? (
              <button type="button" onClick={() => setIndex(index - 1)} style={{ height: 46, padding: "0 18px", border: "1px solid #CFC8B8", borderRadius: 999, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Back</button>
            ) : null}
            {last && step.action ? (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await step.action?.run();
                  setBusy(false);
                  finish();
                }}
                className="hub-plate"
                style={{ flex: 1, height: 46, border: 0, borderRadius: 999, ...goldPlate, fontFamily: "inherit", fontSize: 15, fontWeight: 900, cursor: "pointer" }}
              >
                {busy ? "One moment…" : step.action.label}
              </button>
            ) : (
              <button type="button" onClick={() => (last ? finish() : setIndex(index + 1))} style={{ flex: 1, height: 46, border: 0, borderRadius: 999, background: INK, color: GOLD, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                {last ? "Done" : "Next"}
              </button>
            )}
          </div>
          {last && step.action ? (
            <button type="button" onClick={finish} style={{ marginTop: 6, width: "100%", minHeight: 40, border: 0, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: "#5C564B", cursor: "pointer" }}>Not now</button>
          ) : null}
        </div>
        <span style={{ display: "none", color: CREAM }} />
      </div>
    </Overlay>
  );
}
