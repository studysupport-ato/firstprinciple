"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Lock, Phone, Search } from "lucide-react";
import {
  HUB_SEMESTERS,
  HUB_YEARS,
  RESOURCE_CONTACT_PHONE,
  YEAR_LABEL,
  availableDepartments,
  coursesFor,
  hasAnything,
  monogram,
  shortProgramme,
  type HubChoice,
} from "@/lib/site/materialsHub";
import type { CourseMaterialSemester, CourseMaterialYear, CourseMaterialsDepartment, CourseMaterialEntry } from "@/lib/courseMaterials";
import { BROWN, CREAM, GOLD, HubStyles, INK, MUTED, Panel, Pill, RoundChevron, Sheet, SOFT, goldGround, hubFont } from "./ui";
import { useHubChoice, useHubData } from "./useHub";

export function MaterialsQuickAccess({ adminPreview = false }: { adminPreview?: boolean }) {
  const data = useHubData();
  const { choice, setChoice, ready } = useHubChoice();
  const [pickerOpen, setPickerOpen] = useState(false);

  // First visit: ask straight away.
  useEffect(() => {
    if (ready && !choice && data.status === "ready") setPickerOpen(true);
  }, [ready, choice, data.status]);

  const department = data.departments.find((d) => d.id === choice?.departmentId);
  const courses = useMemo(() => (choice ? coursesFor(data.entries, choice) : []), [data.entries, choice]);

  return (
    <section aria-label="Your course materials" style={{ ...goldGround, ...hubFont, color: INK }}>
      <HubStyles />
      {adminPreview ? (
        <p style={{ margin: 0, background: INK, color: GOLD, padding: "8px 20px", textAlign: "center", fontSize: 13, fontWeight: 700 }}>
          Admin preview: only you can see course-materials quick access.
        </p>
      ) : null}

      {choice && department ? (
        <div style={{ maxWidth: 560, margin: "0 auto", padding: "22px 18px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Pill>{shortProgramme(department.name)}</Pill>
            <Pill>Year {choice.year}</Pill>
            <Pill>Sem {choice.semester}</Pill>
            <span style={{ flex: 1 }} />
            <button type="button" onClick={() => setPickerOpen(true)} style={{ border: 0, background: "none", padding: "8px 0", fontFamily: "inherit", fontSize: 13, fontWeight: 800, color: INK, textDecoration: "underline", textUnderlineOffset: 3, cursor: "pointer" }}>
              Change
            </button>
          </div>
          <h2 style={{ margin: "16px 0 0", fontSize: 36, fontWeight: 900, letterSpacing: "-.035em", lineHeight: 0.98 }}>Your courses</h2>

          {courses.length ? (
            <Panel style={{ marginTop: 16 }}>
              {courses.map((course, i) => {
                const [prefix, number] = splitCode(course.code, course.title);
                const inner = (
                  <>
                    <span style={{ width: 50, height: 50, flexShrink: 0, borderRadius: 14, background: GOLD, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
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
                const rowStyle = { display: "flex", alignItems: "center", gap: 14, minHeight: 72, padding: "12px 14px", borderBottom: i < courses.length - 1 ? "1px solid rgba(246,239,220,.07)" : "none", textDecoration: "none", animationDelay: `${i * 70}ms` } as const;
                return course.kind === "link" ? (
                  <a key={course.id} href={course.url} target="_blank" rel="noopener noreferrer" className="hub-row hub-tap hub-dark-row" style={rowStyle}>{inner}</a>
                ) : (
                  <Link key={course.id} href={`/materials-hub?course=${encodeURIComponent(course.id)}`} className="hub-row hub-tap hub-dark-row" style={rowStyle}>{inner}</Link>
                );
              })}
            </Panel>
          ) : (
            <div style={{ marginTop: 16, borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "28px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>
              Nothing has been uploaded for this semester yet.
            </div>
          )}

          <ResourceCard />
        </div>
      ) : data.status === "error" ? (
        <p style={{ margin: 0, padding: "18px 20px", textAlign: "center", fontSize: 14, fontWeight: 700 }}>Course materials could not load. Refresh to try again.</p>
      ) : null}

      <ProgrammePicker
        open={pickerOpen}
        departments={availableDepartments(data.departments)}
        entries={data.entries}
        initial={choice}
        onClose={() => setPickerOpen(false)}
        onDone={(next) => {
          setChoice(next);
          setPickerOpen(false);
        }}
      />
    </section>
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

/* ─── Programme > year > semester ───────────────────────────────────── */

type Step = 0 | 1 | 2;

function ProgrammePicker({
  open,
  departments,
  entries,
  initial,
  onClose,
  onDone,
}: {
  open: boolean;
  departments: CourseMaterialsDepartment[];
  entries: CourseMaterialEntry[];
  initial: HubChoice | null;
  onClose: () => void;
  onDone: (choice: HubChoice) => void;
}) {
  const [step, setStep] = useState<Step>(0);
  const [departmentId, setDepartmentId] = useState<string | null>(initial?.departmentId ?? null);
  const [year, setYear] = useState<CourseMaterialYear | null>(initial?.year ?? null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) {
      setStep(0);
      setQuery("");
    }
  }, [open]);

  const department = departments.find((d) => d.id === departmentId);
  const filtered = departments.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Sheet open={open} onClose={onClose} label="Choose your programme" maxHeight="90dvh">
      <div style={{ padding: "14px 22px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: MUTED, whiteSpace: "nowrap" }}>Step {step + 1} of 3</span>
        <span style={{ flex: 1, display: "flex", gap: 5 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ flex: 1, height: 4, borderRadius: 999, background: i <= step ? INK : "#EAE5D8", transition: "background .3s" }} />
          ))}
        </span>
      </div>

      {step === 0 ? (
        <div key="p" className="hub-row" style={{ display: "flex", flexDirection: "column", minHeight: 0, flex: 1 }}>
          <div style={{ padding: "12px 22px 12px" }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 900, lineHeight: 1.12, letterSpacing: "-.03em" }}>
              Get direct access to updated course materials uploaded by{" "}
              <span style={{ background: "linear-gradient(transparent 58%, #F5D46E 58%)" }}>your course representative</span>
            </h2>
            <label style={{ marginTop: 16, height: 46, borderRadius: 14, background: SOFT, display: "flex", alignItems: "center", gap: 10, padding: "0 14px" }}>
              <Search size={17} color={MUTED} strokeWidth={2.5} aria-hidden />
              <span className="sr-only">Search your programme</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your programme" style={{ flex: 1, minWidth: 0, border: 0, background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 16, fontWeight: 500, color: INK }} />
            </label>
          </div>
          <div className="hub-scroll" style={{ overflowY: "auto", padding: "0 8px 16px", flex: 1 }}>
            {filtered.map((d, i) => {
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
                  className="hub-row hub-tap"
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, height: 54, padding: "0 10px", border: 0, borderRadius: 14, background: selected ? INK : "transparent", color: selected ? CREAM : usable ? INK : "#C4BCAA", fontFamily: "inherit", fontSize: 15, fontWeight: selected ? 800 : 650, textAlign: "left", cursor: usable ? "pointer" : "not-allowed", animationDelay: `${Math.min(i, 14) * 25}ms` }}
                >
                  <span style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 10, background: selected ? GOLD : SOFT, color: selected ? INK : BROWN, fontSize: 12, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{monogram(d.name)}</span>
                  <span style={{ flex: 1 }}>{d.name}</span>
                  {selected ? <Check size={18} color={GOLD} strokeWidth={3} aria-hidden /> : usable ? <Chevron /> : <Lock size={14} color="#C4BCAA" aria-hidden />}
                </button>
              );
            })}
            {filtered.length === 0 ? <p style={{ padding: "20px 14px", margin: 0, color: MUTED, fontSize: 14, fontWeight: 600 }}>No programme matches “{query}”.</p> : null}
          </div>
        </div>
      ) : null}

      {step === 1 && department ? (
        <ChoiceStep
          key="y"
          chip={department.name}
          title="Which year are you in?"
          onBack={() => setStep(0)}
          options={HUB_YEARS.map((y) => ({ value: y, number: String(y), label: YEAR_LABEL[y], available: hasAnything(entries, department.id, y), selected: y === year }))}
          onPick={(value) => {
            setYear(value as CourseMaterialYear);
            setStep(2);
          }}
        />
      ) : null}

      {step === 2 && department && year ? (
        <ChoiceStep
          key="s"
          chip={`${department.name} · Year ${year}`}
          title="Which semester?"
          onBack={() => setStep(1)}
          options={HUB_SEMESTERS.map((s) => ({ value: s, number: String(s), label: `Semester ${s}`, available: hasAnything(entries, department.id, year, s), selected: initial?.departmentId === department.id && initial.year === year && initial.semester === s }))}
          onPick={(value) => onDone({ departmentId: department.id, year, semester: value as CourseMaterialSemester })}
        />
      ) : null}

      <button type="button" onClick={onClose} style={{ height: 54, flexShrink: 0, border: 0, borderTop: "1px solid #EFEBE1", background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, color: MUTED, cursor: "pointer" }}>
        Not now
      </button>
    </Sheet>
  );
}

function Chevron() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#C4BCAA" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function ChoiceStep({
  chip,
  title,
  options,
  onPick,
  onBack,
}: {
  chip: string;
  title: string;
  options: Array<{ value: number; number: string; label: string; available: boolean; selected: boolean }>;
  onPick: (value: number) => void;
  onBack: () => void;
}) {
  return (
    <div className="hub-row" style={{ padding: "12px 22px 20px", overflowY: "auto" }}>
      <button type="button" onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px 0 8px", border: 0, borderRadius: 999, background: SOFT, fontFamily: "inherit", fontSize: 12, fontWeight: 800, color: INK, cursor: "pointer" }}>
        <ArrowLeft size={14} strokeWidth={2.6} aria-hidden />
        {chip}
      </button>
      <h2 style={{ margin: "14px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-.03em" }}>{title}</h2>
      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {options.map((o, i) => {
          const dark = o.selected && o.available;
          return (
            <button
              key={o.value}
              type="button"
              disabled={!o.available}
              onClick={() => onPick(o.value)}
              className="hub-row hub-tap"
              style={{ position: "relative", height: 118, padding: 16, borderRadius: 20, textAlign: "left", fontFamily: "inherit", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: o.available ? "pointer" : "not-allowed", border: o.available ? `2px solid ${INK}` : "2px dashed #DCD5C5", background: dark ? INK : o.available ? "#FFFFFF" : "#F7F3EA", animationDelay: `${i * 60}ms` }}
            >
              {!o.available ? <Lock size={14} color="#C4BCAA" style={{ position: "absolute", right: 14, top: 14 }} aria-hidden /> : null}
              {dark ? <Check size={18} color={GOLD} strokeWidth={3} style={{ position: "absolute", right: 14, top: 14 }} aria-hidden /> : null}
              <span style={{ fontSize: 40, fontWeight: 900, letterSpacing: "-.04em", lineHeight: 1, color: dark ? GOLD : o.available ? INK : "#C4BCAA" }}>{o.number}</span>
              <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: dark ? CREAM : o.available ? INK : "#C4BCAA" }}>{o.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: dark ? "rgba(246,239,220,.55)" : o.available ? MUTED : "#C4BCAA" }}>{o.available ? "Materials ready" : "Not available yet"}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

