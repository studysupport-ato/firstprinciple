"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, Lock, Phone, Upload } from "lucide-react";
import { DepartmentDrawing } from "@/components/course-materials/DepartmentDrawing";
import {
  HUB_SEMESTERS,
  HUB_YEARS,
  RESOURCE_CONTACT_PHONE,
  YEAR_LABEL,
  availableDepartments,
  coursesFor,
  hasAnything,
  monogram,
  type HubChoice,
} from "@/lib/site/materialsHub";
import type { CourseMaterialSemester, CourseMaterialYear, CourseMaterialsDepartment, CourseMaterialEntry } from "@/lib/courseMaterials";
import { CREAM, GOLD, HubStyles, INK, Pill, RoundChevron, goldGround, hubFont, BlueprintCard, Eyebrow, goldPlate, panelShadow, ROW_LINE } from "./ui";
import { useHubChoice, useHubData } from "./useHub";

export function MaterialsQuickAccess({ adminPreview = false }: { adminPreview?: boolean }) {
  const data = useHubData();
  const { choice, setChoice, ready } = useHubChoice();
  const [picking, setPicking] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const department = data.departments.find((d) => d.id === choice?.departmentId);
  const courses = useMemo(() => (choice ? coursesFor(data.entries, choice) : []), [data.entries, choice]);
  const hasChoice = Boolean(choice && department);

  const startPicking = () => {
    setPicking(true);
    window.setTimeout(() => pickerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  };

  return (
    <section aria-label="Your course materials" style={{ ...goldGround, ...hubFont, color: INK, position: "relative", overflow: "hidden" }}>
      <HubStyles />
      <QuickStyles />
      {adminPreview ? (
        <p style={{ margin: 0, background: INK, color: GOLD, padding: "8px 20px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>
          Admin preview: only you can see course-materials quick access.
        </p>
      ) : null}
      <BackgroundDrawings />

      <div className="qa-wrap">
        {!ready ? null : !hasChoice ? (
          <>
            {!picking ? <Hero onStart={startPicking} /> : null}
            {picking ? (
              <div ref={pickerRef} style={{ scrollMarginTop: 80 }}>
                <InlinePicker
                  departments={availableDepartments(data.departments)}
                  entries={data.entries}
                  loading={data.status === "loading"}
                  initial={choice}
                  onCancel={() => setPicking(false)}
                  onDone={(next) => {
                    setChoice(next);
                    setPicking(false);
                  }}
                />
              </div>
            ) : null}
          </>
        ) : picking ? (
          <div ref={pickerRef} style={{ scrollMarginTop: 80 }}>
            <InlinePicker
              departments={availableDepartments(data.departments)}
              entries={data.entries}
              loading={false}
              initial={choice}
              onCancel={() => setPicking(false)}
              onDone={(next) => {
                setChoice(next);
                setPicking(false);
              }}
            />
          </div>
        ) : choice && department ? (
          <div className="qa-side">
            <div className="qa-left">
              <BlueprintCard department={department.name} style={{ minHeight: 210 }}>
                <Eyebrow style={{ color: GOLD }}>Your programme</Eyebrow>
                <h2 style={{ margin: "8px 0 0", maxWidth: "60%", fontSize: 30, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1, color: CREAM }}>{department.name}</h2>
                <div style={{ marginTop: 14, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <Pill gold>Year {choice.year}</Pill>
                  <Pill gold>Semester {choice.semester}</Pill>
                </div>
                <button type="button" onClick={startPicking} style={{ marginTop: 10, minHeight: 36, border: 0, background: "none", padding: 0, fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: GOLD, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
                  Change
                </button>
              </BlueprintCard>
              <div className="qa-desktop-only" style={{ display: "flex", flexDirection: "column" }}>
                <ResourceCard />
                <CourseRepCard />
              </div>
            </div>

            <div className="qa-right">
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <h2 style={{ margin: 0, fontSize: 34, fontWeight: 900, letterSpacing: "-.035em", lineHeight: 0.98 }}>Your courses</h2>
                {courses.length ? <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>{courses.length} {courses.length === 1 ? "course" : "courses"}</span> : null}
              </div>

              {courses.length ? (
                <div className="qa-courses">
                  {courses.map((course, i) => {
                    const [prefix, number] = splitCode(course.code, course.title);
                    const inner = (
                      <>
                        <span style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 14, ...goldPlate, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                          <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: ".08em", color: "rgba(26,24,20,.7)" }}>{prefix}</span>
                          <span style={{ fontSize: number.length > 3 ? 13 : 17, fontWeight: 900, letterSpacing: "-.02em", marginTop: 2 }}>{number}</span>
                        </span>
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 3 }}>
                          <span style={{ fontSize: 16, fontWeight: 800, color: CREAM, letterSpacing: "-.01em" }}>{course.title}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(246,239,220,.5)" }}>{course.kind === "link" ? linkLabel(course.url) : course.general ? "General course" : "Slides · Videos · Books"}</span>
                        </span>
                        <RoundChevron />
                      </>
                    );
                    const rowStyle = { display: "flex", alignItems: "center", gap: 14, minHeight: 80, padding: "12px 14px", borderRadius: 22, background: INK, border: "1px solid rgba(233,188,58,.28)", boxShadow: panelShadow, textDecoration: "none", animationDelay: `${Math.min(i, 10) * 60}ms` } as const;
                    return course.kind === "link" ? (
                      <a key={course.id} href={course.url} target="_blank" rel="noopener noreferrer" className="hub-row hub-tap hub-dark-row" style={rowStyle}>{inner}</a>
                    ) : (
                      <Link key={course.id} href={`/materials-hub?course=${encodeURIComponent(course.id)}`} className="hub-row hub-tap hub-dark-row" style={rowStyle}>{inner}</Link>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 16, borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "28px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>
                  Nothing has been uploaded for this semester yet.
                </div>
              )}
              <div className="qa-phone-only" style={{ flexDirection: "column" }}>
                <ResourceCard />
                <CourseRepCard />
              </div>
            </div>
          </div>
        ) : data.status === "error" ? (
          <p style={{ margin: 0, padding: "18px 0", textAlign: "center", fontSize: 14, fontWeight: 700 }}>Course materials could not load. Refresh to try again.</p>
        ) : null}
      </div>
    </section>
  );
}

function QuickStyles() {
  return (
    <style>{`
.qa-wrap{position:relative;max-width:1180px;margin:0 auto;padding:26px 18px 32px}
.qa-side{display:flex;flex-direction:column;gap:18px}
.qa-left{display:flex;flex-direction:column;gap:0}
.qa-courses{margin-top:14px;display:grid;grid-template-columns:1fr;gap:10px}
.qa-desktop-only{display:none !important}
.qa-phone-only{display:flex}
.qa-hero{display:grid;grid-template-columns:1fr;gap:22px;align-items:center}
.qa-title{margin:10px 0 0;font-size:31px;font-weight:900;line-height:1.02;letter-spacing:-.035em}
.qa-sub{margin:12px 0 0;font-size:16px;font-weight:600;line-height:1.4;color:#3A352B;max-width:560px}
.qa-art{position:relative;height:222px;max-width:340px;width:100%;margin:0 auto}
.qa-wa{position:absolute;left:0;top:8px;transform:rotate(-3deg) scale(.6);transform-origin:top left}
.qa-neat{position:absolute;right:0;top:40px;transform:rotate(2deg) scale(.6);transform-origin:top right}
.qa-arrow{position:absolute;left:50%;top:92px;width:30px;height:30px;transform:translateX(-50%);z-index:3}
.qa-arrow svg{width:16px;height:16px}
.qa-steps{display:none}
.qa-grid{margin-top:18px;display:grid;grid-template-columns:1fr;gap:8px}
@media (min-width:640px){.qa-grid{grid-template-columns:1fr 1fr}.qa-courses{grid-template-columns:1fr 1fr}}
@media (min-width:1024px){
.qa-wrap{padding:44px 40px 48px}
.qa-side{display:grid;grid-template-columns:400px 1fr;gap:28px;align-items:start}
.qa-desktop-only{display:flex !important}
.qa-phone-only{display:none}
.qa-hero{grid-template-columns:.95fr 1.05fr;gap:28px}
.qa-title{font-size:50px}
.qa-sub{font-size:19px}
.qa-art{height:400px;max-width:560px}
.qa-wa{transform:rotate(-3deg)}
.qa-neat{transform:rotate(2deg)}
.qa-arrow{top:170px;width:50px;height:50px}.qa-arrow svg{width:24px;height:24px}
.qa-steps{margin-top:34px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.qa-grid{grid-template-columns:repeat(3,1fr);gap:10px}
}
`}</style>
  );
}

const BG_DRAWINGS: Array<{ name: string; style: CSSProperties }> = [
  { name: "Electrical", style: { left: "-30px", top: "18px", width: 260, transform: "rotate(-6deg)" } },
  { name: "Mechanical", style: { right: "-20px", top: "-10px", width: 240, transform: "rotate(8deg)" } },
  { name: "Civil", style: { left: "34%", bottom: "-24px", width: 280 } },
  { name: "Computer", style: { right: "6%", bottom: "8%", width: 200, transform: "rotate(-4deg)" } },
  { name: "Aerospace", style: { left: "4%", bottom: "16%", width: 190, transform: "rotate(5deg)" } },
];

function BackgroundDrawings() {
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {BG_DRAWINGS.map((d) => (
        <DepartmentDrawing key={d.name} name={d.name} style={{ position: "absolute", height: "auto", color: INK, opacity: 0.09, ...d.style }} />
      ))}
    </div>
  );
}

function Hero({ onStart }: { onStart: () => void }) {
  return (
    <div className="hub-row">
      <div className="qa-hero">
        <div>
          <Eyebrow style={{ color: "rgba(26,24,20,.65)" }}>New · Course materials</Eyebrow>
          <h2 className="qa-title">Tired of scrolling through endless WhatsApp messages to find your course materials?</h2>
          <p className="qa-sub">
            Find all your materials here, <span style={{ background: "linear-gradient(transparent 58%, rgba(26,24,20,.15) 58%)" }}>uploaded by your course reps</span>.
          </p>
          <button type="button" onClick={onStart} className="hub-tap" style={{ marginTop: 22, height: 56, padding: "0 28px", border: 0, borderRadius: 999, background: INK, color: GOLD, display: "inline-flex", alignItems: "center", gap: 10, fontFamily: "inherit", fontSize: 18, fontWeight: 800, cursor: "pointer", boxShadow: "0 14px 28px -14px rgba(26,24,20,.7)" }}>
            Let’s get started <ArrowRight size={20} strokeWidth={2.6} aria-hidden />
          </button>
        </div>
        <div className="qa-art" aria-hidden>
          <div className="qa-wa"><WhatsAppMock /></div>
          <span className="qa-arrow" style={{ borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", ...goldPlate, boxShadow: "0 10px 20px -8px rgba(26,24,20,.6)" }}>
            <ArrowRight size={24} strokeWidth={2.8} />
          </span>
          <div className="qa-neat"><NeatList /></div>
        </div>
      </div>
      <div className="qa-steps">
        {[
          ["1", "Pick your programme"],
          ["2", "Pick your year & semester"],
          ["3", "Open your courses"],
        ].map(([n, label]) => (
          <div key={n} style={{ display: "flex", gap: 14, alignItems: "center", background: "rgba(26,24,20,.08)", borderRadius: 18, padding: "14px 16px" }}>
            <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 999, background: INK, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, fontWeight: 900 }}>{n}</span>
            <span style={{ fontSize: 16, fontWeight: 800 }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const BUBBLES: Array<{ name?: string; color?: string; text: string; time: string; me?: boolean }> = [
  { name: "Kojo", color: "#c2185b", text: "Pls who has the algebra slides 🙏", time: "9:41" },
  { name: "Abena", color: "#1565c0", text: "Scroll up, it was sent last week", time: "9:43" },
  { name: "Yaw", color: "#2e7d32", text: "📄 lecture3.pdf · media expired", time: "9:50" },
  { text: "Pls resend 😩", time: "9:52", me: true },
  { name: "Esi", color: "#6a1b9a", text: "Which one? There are 4 versions", time: "9:55" },
];

function WhatsAppMock() {
  return (
    <div style={{ width: 225, height: 330, borderRadius: 22, overflow: "hidden", background: "#EFE7DE", border: `6px solid ${INK}`, boxShadow: "0 24px 40px -18px rgba(0,0,0,.5)", fontFamily: "Arial, sans-serif" }}>
      <div style={{ height: 46, background: "#075E54", color: "#fff", display: "flex", alignItems: "center", gap: 10, padding: "0 12px" }}>
        <span style={{ width: 28, height: 28, borderRadius: 999, background: "#25D366" }} />
        <span style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.15 }}>
          Year 1 Class 📚
          <br />
          <span style={{ fontWeight: 400, fontSize: 10, opacity: 0.85 }}>312 participants</span>
        </span>
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 7 }}>
        {BUBBLES.map((b, i) => (
          <div key={i} style={{ position: "relative", maxWidth: 170, marginLeft: b.me ? "auto" : 0, padding: "8px 11px 15px", borderRadius: 12, background: b.me ? "#D9FDD3" : "#fff", fontSize: 12, lineHeight: 1.35, color: "#222", boxShadow: "0 2px 0 rgba(0,0,0,.08)" }}>
            {b.name ? <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: b.color, marginBottom: 2 }}>{b.name}</span> : null}
            {b.text}
            <small style={{ position: "absolute", right: 8, bottom: 3, fontSize: 9, color: "#8a8a8a" }}>{b.time}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function NeatList() {
  return (
    <div style={{ width: 262, borderRadius: 22, background: INK, border: "1px solid rgba(233,188,58,.28)", boxShadow: panelShadow, overflow: "hidden", color: CREAM }}>
      <div style={{ padding: "14px 16px", borderBottom: `1px solid ${ROW_LINE}` }}>
        <Eyebrow style={{ color: GOLD, fontSize: 10 }}>Your programme · Year 1</Eyebrow>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>All your materials</div>
      </div>
      {[
        ["MATH", "151", "Algebra"],
        ["ME", "159", "Technical Drawing"],
        ["EE", "151", "Applied Electricity"],
      ].map(([p, n, t], i) => (
        <div key={n + p} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", borderBottom: i < 2 ? `1px solid ${ROW_LINE}` : "none" }}>
          <span style={{ width: 40, height: 40, flexShrink: 0, borderRadius: 11, ...goldPlate, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
            <span style={{ fontSize: 7, fontWeight: 800, opacity: 0.7 }}>{p}</span>
            <span style={{ fontSize: 14, fontWeight: 900 }}>{n}</span>
          </span>
          <span>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700 }}>{t}</span>
            <span style={{ display: "block", fontSize: 11, color: "rgba(246,239,220,.55)" }}>Slides · Videos · Books</span>
          </span>
        </div>
      ))}
    </div>
  );
}

function splitCode(code: string | undefined, title: string): [string, string] {
  const match = code?.match(/^([A-Za-z]+)\s*(\d+)/);
  if (match) return [match[1].toUpperCase(), match[2]];
  return ["", monogram(title)];
}

function linkLabel(url?: string) {
  if (!url) return "Link";
  if (/t\.me|telegram/i.test(url)) return "Opens Telegram";
  if (/onedrive|sharepoint/i.test(url)) return "Opens OneDrive";
  if (/drive\.google/i.test(url)) return "Opens Google Drive";
  return "Opens a link";
}

function ResourceCard() {
  const phone = RESOURCE_CONTACT_PHONE.trim();
  return (
    <div className="hub-row" style={{ marginTop: 14, borderRadius: 24, background: "#FFFBF0", padding: 16, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 14px 32px -16px rgba(26,24,20,.45)", animationDelay: "300ms" }}>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-.01em" }}>Have a resource that would help?</span>
        <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.4, color: "rgba(26,24,20,.65)" }}>
          Contact us to collaborate and receive credit for it.{phone ? ` ${phone}` : ""}
        </span>
      </span>
      {phone ? (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} aria-label={`Call ${phone}`} style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 999, background: INK, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Phone size={19} color={GOLD} strokeWidth={2.2} />
        </a>
      ) : null}
    </div>
  );
}

function CourseRepCard() {
  return (
    <Link href="/course-rep" className="hub-row hub-tap" style={{ marginTop: 12, borderRadius: 24, background: INK, border: "1px solid rgba(233,188,58,.3)", padding: 16, display: "flex", alignItems: "center", gap: 14, color: CREAM, textDecoration: "none", boxShadow: "0 14px 32px -16px rgba(26,24,20,.6)", animationDelay: "360ms" }}>
      <span aria-hidden style={{ width: 46, height: 46, flexShrink: 0, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", ...goldPlate }}>
        <Upload size={19} strokeWidth={2.4} />
      </span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
        <span style={{ fontSize: 15, fontWeight: 800 }}>Are you a course rep?</span>
        <span style={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, color: "rgba(246,239,220,.6)" }}>Apply to upload lecture materials for your class.</span>
      </span>
      <span style={{ height: 34, padding: "0 14px", borderRadius: 999, border: "1px solid rgba(233,188,58,.5)", color: GOLD, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>Apply</span>
    </Link>
  );
}

/* ─── Programme > year > semester, inline on the page ─────────────────── */

type Step = 0 | 1 | 2;

function InlinePicker({
  departments,
  entries,
  loading,
  initial,
  onCancel,
  onDone,
}: {
  departments: CourseMaterialsDepartment[];
  entries: CourseMaterialEntry[];
  loading: boolean;
  initial: HubChoice | null;
  onCancel: () => void;
  onDone: (choice: HubChoice) => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [departmentId, setDepartmentId] = useState<string | null>(initial?.departmentId ?? null);
  const [year, setYear] = useState<CourseMaterialYear | null>(initial?.year ?? null);
  const department = departments.find((d) => d.id === departmentId);

  const titles = ["Which programme do you offer?", "Which year are you in?", "Which semester?"];
  const back = () => (step === 0 ? onCancel() : setStep((step - 1) as Step));

  return (
    <div className="hub-row">
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button type="button" onClick={back} className="hub-tap" aria-label="Back" style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 999, border: 0, background: INK, color: GOLD, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ArrowLeft size={20} strokeWidth={2.8} aria-hidden />
        </button>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "rgba(26,24,20,.65)" }}>Step {step + 1} of 3</span>
        <span style={{ flex: "1 1 120px", maxWidth: 240, display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? INK : "rgba(26,24,20,.2)", transition: "background .3s" }} />
          ))}
        </span>
      </div>
      {step > 0 && department ? (
        <p style={{ margin: "14px 0 0", fontSize: 14, fontWeight: 800, color: "rgba(26,24,20,.7)" }}>
          {department.name}
          {step === 2 && year ? ` · Year ${year}` : ""}
        </p>
      ) : null}
      <h2 style={{ margin: step > 0 ? "4px 0 0" : "16px 0 0", fontSize: 32, fontWeight: 900, letterSpacing: "-.03em", lineHeight: 1.05 }}>{titles[step]}</h2>

      {step === 0 ? (
        loading ? (
          <p style={{ marginTop: 18, fontSize: 14, fontWeight: 700 }}>Loading programmes…</p>
        ) : (
          <div className="qa-grid">
            {departments.map((d, i) => {
              const selected = d.id === departmentId;
              const usable = d.available !== false;
              return (
                <button
                  key={d.id}
                  type="button"
                  disabled={!usable}
                  onClick={() => {
                    setDepartmentId(d.id);
                    setYear(null);
                    setStep(1);
                  }}
                  className="hub-row hub-tap hub-dark-row"
                  style={{ position: "relative", overflow: "hidden", display: "flex", alignItems: "center", gap: 12, minHeight: 58, padding: "0 14px", borderRadius: 16, border: selected ? `2px solid ${GOLD}` : "1px solid rgba(233,188,58,.25)", background: INK, color: usable ? CREAM : "rgba(246,239,220,.35)", fontFamily: "inherit", fontSize: 15, fontWeight: 700, textAlign: "left", cursor: usable ? "pointer" : "not-allowed", animationDelay: `${Math.min(i, 17) * 22}ms` }}
                >
                  <DepartmentDrawing name={d.name} style={{ position: "absolute", right: -18, top: -6, width: 110, height: 70, color: CREAM, opacity: 0.12, pointerEvents: "none" }} />
                  <span style={{ position: "relative", width: 36, height: 36, flexShrink: 0, borderRadius: 10, ...(usable ? goldPlate : { background: "#2A251C", color: "rgba(246,239,220,.35)" }), fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{monogram(d.name)}</span>
                  <span style={{ position: "relative", flex: 1 }}>{d.name}</span>
                  {selected ? <Check size={18} color={GOLD} strokeWidth={3} aria-hidden style={{ position: "relative" }} /> : !usable ? <Lock size={14} aria-hidden style={{ position: "relative" }} /> : null}
                </button>
              );
            })}
          </div>
        )
      ) : null}

      {step === 1 && department ? (
        <ChoiceGrid
          options={HUB_YEARS.map((y) => ({ value: y, number: String(y), label: YEAR_LABEL[y], available: hasAnything(entries, department.id, y), selected: y === year }))}
          onPick={(value) => {
            setYear(value as CourseMaterialYear);
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 && department && year ? (
        <ChoiceGrid
          options={HUB_SEMESTERS.map((s) => ({ value: s, number: String(s), label: `Semester ${s}`, available: hasAnything(entries, department.id, year, s), selected: initial?.departmentId === department.id && initial.year === year && initial.semester === s }))}
          onPick={(value) => onDone({ departmentId: department.id, year, semester: value as CourseMaterialSemester })}
        />
      ) : null}
    </div>
  );
}

function ChoiceGrid({ options, onPick }: { options: Array<{ value: number; number: string; label: string; available: boolean; selected: boolean }>; onPick: (value: number) => void }) {
  return (
    <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 12, maxWidth: 720 }}>
      {options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          disabled={!o.available}
          onClick={() => onPick(o.value)}
          className="hub-row hub-tap"
          style={{ position: "relative", height: 118, padding: 16, borderRadius: 20, textAlign: "left", fontFamily: "inherit", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: o.available ? "pointer" : "not-allowed", border: o.available ? "1px solid rgba(233,188,58,.3)" : "2px dashed rgba(26,24,20,.25)", background: o.available ? INK : "rgba(255,255,255,.25)", boxShadow: o.available ? panelShadow : "none", animationDelay: `${i * 60}ms` }}
        >
          {!o.available ? <Lock size={14} color="rgba(26,24,20,.4)" style={{ position: "absolute", right: 14, top: 14 }} aria-hidden /> : null}
          {o.selected && o.available ? <Check size={18} color={GOLD} strokeWidth={3} style={{ position: "absolute", right: 14, top: 14 }} aria-hidden /> : null}
          <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1, color: o.available ? GOLD : "rgba(26,24,20,.35)" }}>{o.number}</span>
          <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: o.available ? CREAM : "rgba(26,24,20,.45)" }}>{o.label}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: o.available ? "rgba(246,239,220,.55)" : "rgba(26,24,20,.45)" }}>{o.available ? "Materials ready" : "Not available yet"}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
