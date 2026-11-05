"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { materialsHubLive, availableDepartments } from "@/lib/site/materialsHub";
import { CREAM, GOLD, HubStyles, INK, OVERLAY_Z, Overlay, goldPlate, hubFont } from "./ui";
import { useHubChoice, useHubData } from "./useHub";
import { PickerPopup } from "./MaterialsQuickAccess";

const DISMISS_KEY = "b2b.programmeNudge.dismissed";
const SKIP = [/^\/$/, /^\/admin/, /^\/materials-hub/, /^\/course-rep/, /\/lesson\//];

/** On any page other than Home: students who haven't picked their programme are asked again (once per visit). */
export function ProgrammeNudge() {
  const pathname = usePathname() ?? "/";
  const { choice, setChoice, ready } = useHubChoice();
  const data = useHubData();
  const [show, setShow] = useState(false);
  const [picking, setPicking] = useState(false);
  const [done, setDone] = useState(false);
  const skipped = !materialsHubLive() || SKIP.some((r) => r.test(pathname));

  useEffect(() => {
    if (skipped || !ready || choice) return;
    let dismissed = false;
    try {
      dismissed = window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      dismissed = false;
    }
    if (dismissed) return;
    const timer = window.setTimeout(() => setShow(true), 2500);
    return () => window.clearTimeout(timer);
  }, [skipped, ready, choice, pathname]);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* storage unavailable */
    }
    setShow(false);
    setDone(false);
  };

  if (picking) {
    return (
      <PickerPopup
        departments={availableDepartments(data.departments)}
        entries={data.entries}
        loading={data.status === "loading"}
        initial={choice}
        onClose={() => setPicking(false)}
        onDone={(next) => {
          setChoice(next);
          setPicking(false);
          setDone(true);
          setShow(true);
        }}
      />
    );
  }
  if (!show || skipped) return null;

  return (
    <Overlay>
      <HubStyles />
      <div role="dialog" aria-modal="true" aria-label="Pick your programme" style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, ...hubFont }}>
        <button type="button" aria-label="Close" onClick={dismiss} className="hub-fade" style={{ position: "absolute", inset: 0, border: 0, padding: 0, background: "rgba(14,13,11,.65)", cursor: "pointer" }} />
        <div className="hub-sheet" style={{ position: "relative", width: "100%", maxWidth: 460, borderRadius: 28, background: "#14120E", border: `2px solid ${GOLD}`, color: CREAM, padding: "28px 22px 18px", boxShadow: "0 30px 70px rgba(0,0,0,.5)" }}>
          <button type="button" onClick={dismiss} aria-label="Close" style={{ position: "absolute", right: 14, top: 14, width: 40, height: 40, border: 0, borderRadius: 999, background: "#26221B", color: CREAM, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <X size={18} />
          </button>
          {done ? (
            <>
              <h2 style={{ margin: 0, paddingRight: 40, fontSize: 28, fontWeight: 900, lineHeight: 1.08, letterSpacing: "-.03em" }}>You’re all set</h2>
              <p style={{ margin: "10px 0 0", fontSize: 16, lineHeight: 1.45, color: "rgba(246,239,220,.75)" }}>Your courses and their slides are waiting on the Home page.</p>
              <Link href="/" onClick={dismiss} className="hub-tap hub-plate" style={{ marginTop: 20, height: 56, borderRadius: 999, ...goldPlate, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900, color: INK, textDecoration: "none" }}>
                See my courses
              </Link>
            </>
          ) : (
            <>
              <h2 style={{ margin: 0, paddingRight: 40, fontSize: 27, fontWeight: 900, lineHeight: 1.08, letterSpacing: "-.03em" }}>Tired of scrolling through WhatsApp to search for materials sent by your course reps?</h2>
              <p style={{ margin: "12px 0 0", fontSize: 16, lineHeight: 1.45, color: "rgba(246,239,220,.75)" }}>Pick the programme you offer and your course rep will upload them here for you.</p>
              <button type="button" onClick={() => setPicking(true)} className="hub-tap hub-plate" style={{ marginTop: 22, width: "100%", height: 56, border: 0, borderRadius: 999, ...goldPlate, fontFamily: "inherit", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>
                Pick my programme
              </button>
              <button type="button" onClick={dismiss} style={{ marginTop: 6, width: "100%", height: 46, border: 0, background: "transparent", color: "rgba(246,239,220,.7)", fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" }}>
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </Overlay>
  );
}
