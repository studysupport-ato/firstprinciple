"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowLeftRight, ArrowUp, BookOpen, Camera, Eye, EyeOff, FileText, Folder, ImagePlus, Link2, Lock, MoreHorizontal, PenLine, Pencil, Play, Plus, RefreshCw, Trash2, Upload, X } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { availableDepartments, formatBytes, listDriveFolder, parseDriveFileId, parseDriveFolderId, tidyFileName, type DriveItem } from "@/lib/site/materialsHub";
import { imagesToPdf } from "@/lib/courseReps/imagesToPdf";
import type { CourseMaterialEntry } from "@/lib/courseMaterials";
import {
  applyAsRepAction,
  myRepApplicationAction,
  repAddMaterialAction,
  repCreateCourseAction,
  repRemoveEntryAction,
  repFinishUploadAction,
  repScopeAction,
  repSetHiddenFilesAction,
  repStartUploadAction,
  repUpdateEntryAction,
  repMoveEntryAction,
  repMoveCourseSemesterAction,
  repFinishReplaceAction,
} from "@/lib/courseReps/actions";
import type { RepApplication, RepMaterialType, RepScope } from "@/lib/courseReps/repService";
import { BlueprintCard, CREAM, GOLD, HubStyles, INK, MUTED, Panel, Pill, ROW_LINE, Sheet, SOFT, backButtonStyle, goldGround, goldPlate, hubFont } from "@/components/materials-hub/ui";
import { useHubData } from "@/components/materials-hub/useHub";

const fieldLabel: React.CSSProperties = { display: "block", fontSize: 14, fontWeight: 600, color: INK, marginBottom: 6 };
const plainCard: React.CSSProperties = { borderRadius: 12, background: "#FFFFFF", border: "1px solid #E2DCCB", padding: 20 };
const plainInput: React.CSSProperties = { width: "100%", height: 46, borderRadius: 8, border: "1px solid #CFC8B8", background: "#FFFFFF", padding: "0 12px", fontFamily: "inherit", fontSize: 16, color: INK, boxSizing: "border-box" };
const plainButton: React.CSSProperties = { width: "100%", height: 48, border: 0, borderRadius: 8, background: INK, color: "#FFFFFF", fontFamily: "inherit", fontSize: 16, fontWeight: 700, cursor: "pointer" };
const inputStyle: React.CSSProperties = { width: "100%", height: 48, borderRadius: 14, border: "1.5px solid transparent", background: SOFT, padding: "0 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: INK, outline: "none", boxSizing: "border-box" };
const darkButton: React.CSSProperties = { width: "100%", height: 50, border: 0, borderRadius: 999, background: INK, color: GOLD, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer" };

function ErrorLine({ text }: { text: string | null }) {
  if (!text) return null;
  return <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: "#B3261E" }}>{text}</p>;
}

export function CourseRepPage() {
  const { authenticated, loading } = useAuthSession();
  const [application, setApplication] = useState<RepApplication | null | undefined>(undefined);
  const [authOpen, setAuthOpen] = useState(false);

  const refresh = useCallback(async () => {
    const result = await myRepApplicationAction();
    setApplication(result.ok ? result.data : null);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (authenticated) void refresh();
    else setApplication(null);
  }, [authenticated, loading, refresh]);

  let body: React.ReactNode = <p style={{ fontWeight: 700 }}>Loading…</p>;
  let applying = false;
  if (!loading && !authenticated) {
    applying = true;
    body = (
      <div style={plainCard}>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: "#3A352B" }}>Sign in or create an account first.</p>
        <button type="button" onClick={() => setAuthOpen(true)} style={{ ...plainButton, marginTop: 16 }}>Sign in to apply</button>
      </div>
    );
  } else if (application === null || application?.status === "declined" || application?.status === "revoked") {
    applying = true;
    body = <ApplyForm previous={application} onDone={setApplication} />;
  } else if (application?.status === "pending") {
    body = <Pending application={application} />;
  } else if (application?.status === "approved") {
    body = <RepPanel />;
  }

  return (
    <div style={{ ...goldGround, ...hubFont, color: INK, minHeight: "100dvh" }}>
      <HubStyles />
      <style>{`
.rep-apply{display:grid;grid-template-columns:1fr;gap:20px;align-items:start}
.rep-title{margin:10px 0 0;font-size:32px;font-weight:900;line-height:1.02;letter-spacing:-.035em}
@media (min-width:1024px){.rep-apply{grid-template-columns:1fr 480px;gap:48px}.rep-title{font-size:50px}.rep-intro{padding-top:20px}}
`}</style>
      <div style={{ maxWidth: applying ? 1100 : 560, margin: "0 auto", padding: "16px 18px 110px" }}>
        <Link href="/" className="hub-tap" style={backButtonStyle}><ArrowLeft size={22} strokeWidth={2.8} aria-hidden />Home</Link>
        {applying ? (
          <div className="rep-apply" style={{ marginTop: 14 }}>
            <div className="rep-intro">
              <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "rgba(26,24,20,.65)" }}>Course reps</span>
              <h1 className="rep-title">Apply as a course rep to upload lecture materials</h1>
              <p style={{ margin: "14px 0 0", maxWidth: 520, fontSize: 17, fontWeight: 600, lineHeight: 1.45, color: "#3A352B" }}>Upload once, and your whole class finds it here. We confirm every course rep first.</p>
            </div>
            {body}
          </div>
        ) : (
          <div style={{ marginTop: 12 }}>{body}</div>
        )}
      </div>
      <AuthModal open={authOpen} initialView="signup" onClose={() => setAuthOpen(false)} />
    </div>
  );
}

/* ─── Apply ─────────────────────────────────────────────────────────── */

function ApplyForm({ previous, onDone }: { previous: RepApplication | null | undefined; onDone: (a: RepApplication) => void }) {
  const data = useHubData();
  const programmes = useMemo(() => availableDepartments(data.departments), [data.departments]);
  const [fullName, setFullName] = useState(previous?.fullName ?? "");
  const [departmentId, setDepartmentId] = useState(previous?.departmentId ?? "");
  const [year, setYear] = useState<number>(previous?.studyYear ?? 1);
  const [phone, setPhone] = useState(previous?.phone?.replace(/^\+233/, "0") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!departmentId) return setError("Choose your programme.");
    setBusy(true);
    setError(null);
    const result = await applyAsRepAction({ fullName, departmentId, studyYear: year, phone });
    setBusy(false);
    if (result.ok) onDone(result.data);
    else setError(result.error);
  }

  return (
    <form onSubmit={submit} style={plainCard}>
      {previous?.status === "declined" || previous?.status === "revoked" ? (
        <p style={{ margin: "0 0 16px", fontSize: 14, lineHeight: 1.5, color: "#5C564B" }}>
          {previous.status === "declined" ? "Your last application wasn’t approved. You can apply again." : "Your course rep access was removed. You can apply again."}
        </p>
      ) : null}

      <label style={fieldLabel} htmlFor="rep-name">Full name</label>
      <input id="rep-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" style={plainInput} required />

      <label style={{ ...fieldLabel, marginTop: 14 }} htmlFor="rep-programme">Programme</label>
      <select id="rep-programme" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={plainInput} required>
        <option value="">Choose…</option>
        {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <label style={{ ...fieldLabel, marginTop: 14 }} htmlFor="rep-year">Year</label>
      <select id="rep-year" value={year} onChange={(e) => setYear(Number(e.target.value))} style={plainInput}>
        {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
      </select>

      <label style={{ ...fieldLabel, marginTop: 14 }} htmlFor="rep-phone">Phone number</label>
      <input id="rep-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="024 123 4567" style={plainInput} required />

      <ErrorLine text={error} />
      <button type="submit" disabled={busy} style={{ ...plainButton, marginTop: 20, opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "Submit application"}</button>
    </form>
  );
}

function Pending({ application }: { application: RepApplication }) {
  return (
    <div style={plainCard}>
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>Application received</h1>
      <p style={{ margin: "8px 0 0", fontSize: 15, lineHeight: 1.55, color: "#3A352B" }}>
        You applied to be course rep for <b>{application.departmentName}, Year {application.studyYear}</b>. We’ll text you on {application.phone.replace(/^\+233/, "0")} once it’s reviewed.
      </p>
      <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 600, color: "#8F6500" }}>Status: waiting for review</p>
    </div>
  );
}

/* ─── Rep panel ─────────────────────────────────────────────────────── */

type Course = RepScope["courses"][number];

function RepPanel() {
  const [scope, setScope] = useState<RepScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [semester, setSemester] = useState<1 | 2>(1);
  const [openCourse, setOpenCourse] = useState<string | null>(null);
  const [addCourse, setAddCourse] = useState(false);
  const [addTo, setAddTo] = useState<Course | null>(null);
  const [editing, setEditing] = useState<CourseMaterialEntry | null>(null);
  const [managing, setManaging] = useState<CourseMaterialEntry | null>(null);
  const [replacing, setReplacing] = useState<CourseMaterialEntry | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [busyMove, setBusyMove] = useState(false);
  async function move(entry: CourseMaterialEntry, direction: "up" | "down") {
    setBusyMove(true);
    const result = await repMoveEntryAction(entry.id, direction);
    if (!result.ok) window.alert(result.error);
    await load();
    setBusyMove(false);
  }
  async function moveSemester(entry: CourseMaterialEntry) {
    const to = (entry.semester ?? 1) === 1 ? 2 : 1;
    if (!window.confirm(`Move “${entry.courseTitle}” and everything in it to Semester ${to}?`)) return;
    const result = await repMoveCourseSemesterAction(entry.id, to);
    if (!result.ok) return window.alert(result.error);
    setSemester(to);
    await load();
  }

  const load = useCallback(async () => {
    const result = await repScopeAction();
    if (result.ok) setScope(result.data);
    else setError(result.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <p style={{ fontWeight: 700 }}>{error}</p>;
  if (!scope) return <p style={{ fontWeight: 700 }}>Loading your courses…</p>;
  const { rep } = scope;
  const courses = scope.courses.filter((c) => (c.semester ?? 1) === semester);
  const current = scope.courses.find((c) => c.id === openCourse) ?? null;

  async function remove(entry: CourseMaterialEntry) {
    const what = entry.entryType === "course" ? `the course “${entry.courseTitle}” and everything in it` : `“${entry.courseTitle}”`;
    if (!window.confirm(`Remove ${what}? Students will no longer see it.`)) return;
    const result = await repRemoveEntryAction(entry.id);
    if (!result.ok) window.alert(result.error);
    if (entry.entryType === "course") setOpenCourse(null);
    await load();
  }

  if (current) {
    return (
      <div className="hub-row">
        <button type="button" onClick={() => setOpenCourse(null)} className="hub-tap" style={backButtonStyle}><ArrowLeft size={22} strokeWidth={2.8} aria-hidden />Course rep panel</button>
        <BlueprintCard department={rep.departmentName} compact style={{ marginTop: 10 }}>
          {current.courseCode ? <span style={{ display: "inline-flex", alignItems: "center", height: 24, padding: "0 9px", borderRadius: 7, ...goldPlate, fontSize: 11, fontWeight: 900 }}>{current.courseCode}</span> : null}
          <h1 style={{ margin: "10px 0 0", maxWidth: "62%", fontSize: 24, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.05, color: CREAM }}>{current.courseTitle}</h1>
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button type="button" onClick={() => setEditing(current)} style={smallGhost}><Pencil size={13} /> Rename</button>
            <button type="button" onClick={() => moveSemester(current)} style={smallGhost}><ArrowLeftRight size={13} /> Move to Semester {(current.semester ?? 1) === 1 ? 2 : 1}</button>
          </div>
          <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" disabled={busyMove} onClick={() => move(current, "up")} style={smallGhost}><ArrowUp size={13} /> Move course up</button>
            <button type="button" disabled={busyMove} onClick={() => move(current, "down")} style={smallGhost}><ArrowDown size={13} /> Move course down</button>
            <button type="button" onClick={() => remove(current)} style={{ ...smallGhost, color: "#F2A39B", borderColor: "rgba(242,163,155,.45)" }}><Trash2 size={13} /> Remove course</button>
          </div>
        </BlueprintCard>
        {current.materials.length ? (
          <Panel style={{ marginTop: 12 }}>
            {current.materials.map((m, i) => {
              const yt = m.materialType === "playlist" || m.materialType === "video";
              const book = m.description === "book";
              return (
                <div key={m.id} style={{ borderBottom: i < current.materials.length - 1 ? `1px solid ${ROW_LINE}` : "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 12px" }}>
                  <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", ...(yt ? { background: "#FF0033" } : book ? goldPlate : { background: "#2A251C", border: "1px solid rgba(233,188,58,.25)" }) }}>
                    {yt ? <Play size={15} color="#fff" fill="#fff" /> : book ? <BookOpen size={16} color={INK} /> : m.description === "handwritten" ? <PenLine size={16} color={GOLD} /> : <FileText size={16} color={GOLD} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, overflowWrap: "anywhere" }}>{m.courseTitle}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(246,239,220,.5)" }}>{yt ? "YouTube" : book ? "Book" : m.description === "handwritten" ? "Handwritten notes" : "Slides"}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(246,239,220,.5)" }}>{linkKind(m.url)}</span>
                    {m.replacedAt ? <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>Updated{m.changeNote ? `: ${m.changeNote}` : ""}</span> : null}
                    {m.hiddenFiles?.length ? <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(246,239,220,.5)" }}>{m.hiddenFiles.length} hidden</span> : null}
                  </span>
                  <button type="button" onClick={() => setMenuFor(menuFor === m.id ? null : m.id)} aria-label={`Actions for ${m.courseTitle}`} aria-expanded={menuFor === m.id} style={{ ...iconButton, ...(menuFor === m.id ? { background: GOLD } : null) }}><MoreHorizontal size={17} color={menuFor === m.id ? INK : GOLD} /></button>
                </div>
                {menuFor === m.id ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: "0 12px 12px 62px" }}>
                    <button type="button" disabled={busyMove || i === 0} onClick={() => move(m, "up")} style={{ ...smallGhost, opacity: i === 0 ? 0.4 : 1 }}><ArrowUp size={13} /> Move up</button>
                    <button type="button" disabled={busyMove || i === current.materials.length - 1} onClick={() => move(m, "down")} style={{ ...smallGhost, opacity: i === current.materials.length - 1 ? 0.4 : 1 }}><ArrowDown size={13} /> Move down</button>
                    {parseDriveFileId(m.url) ? <button type="button" onClick={() => setReplacing(m)} style={smallGhost}><RefreshCw size={13} /> Replace file</button> : null}
                    <button type="button" onClick={() => setEditing(m)} style={smallGhost}><Pencil size={13} /> Edit</button>
                    {parseDriveFolderId(m.url) ? <button type="button" onClick={() => setManaging(m)} style={smallGhost}><Folder size={13} /> Show or hide files</button> : null}
                    <button type="button" onClick={() => remove(m)} style={{ ...smallGhost, color: "#F2A39B", borderColor: "rgba(242,163,155,.45)" }}><Trash2 size={13} /> Remove</button>
                  </div>
                ) : null}
                </div>
              );
            })}
          </Panel>
        ) : (
          <div style={{ marginTop: 12, borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "26px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>Nothing here yet. Add the first slides.</div>
        )}
        <button type="button" onClick={() => setAddTo(current)} className="hub-plate" style={{ ...darkButton, ...goldPlate, marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Plus size={18} /> Add material</button>
        <AddMaterialSheet course={addTo} onClose={() => setAddTo(null)} onSaved={load} />
        <EditSheet entry={editing} onClose={() => setEditing(null)} onSaved={load} />
        <FilesSheet material={managing} onClose={() => setManaging(null)} onSaved={load} />
        <ReplaceSheet material={replacing} course={current} onClose={() => setReplacing(null)} onSaved={load} />
      </div>
    );
  }

  return (
    <div className="hub-row">
      <BlueprintCard department={rep.departmentName}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: GOLD }}>Course rep panel</p>
        <h1 style={{ margin: "8px 0 0", maxWidth: "58%", fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1, color: CREAM }}>{rep.departmentName}</h1>
        <div style={{ marginTop: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <Pill gold>Year {rep.studyYear}</Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 28, padding: "0 11px", borderRadius: 999, background: "#2A251C", color: GOLD, fontSize: 12, fontWeight: 800 }}><Lock size={12} /> Your programme only</span>
        </div>
      </BlueprintCard>
      <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
        {([1, 2] as const).map((s) => (
          <button key={s} type="button" onClick={() => setSemester(s)} style={{ height: 38, padding: "0 16px", border: 0, borderRadius: 999, background: semester === s ? INK : "rgba(26,24,20,.12)", color: semester === s ? GOLD : INK, fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Semester {s}</button>
        ))}
      </div>
      {courses.length ? (
        <Panel style={{ marginTop: 12 }}>
          {courses.map((c, i) => {
            return (
              <button key={c.id} type="button" onClick={() => setOpenCourse(c.id)} className="hub-tap hub-dark-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 72, padding: "12px 14px", border: 0, borderBottom: i < courses.length - 1 ? `1px solid ${ROW_LINE}` : "none", background: "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", ...goldPlate }}>
                  <FileText size={20} strokeWidth={2.3} aria-hidden />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: CREAM }}>{c.courseTitle}</span>
                  <span style={{ display: "block", marginTop: 3, fontSize: 12, fontWeight: 500, color: "rgba(246,239,220,.5)" }}>{c.materials.length ? `${c.materials.length} ${c.materials.length === 1 ? "item" : "items"}` : "Nothing yet"}</span>
                </span>
                <span style={{ height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(233,188,58,.5)", color: GOLD, fontSize: 12, fontWeight: 800, display: "inline-flex", alignItems: "center" }}>Manage</span>
              </button>
            );
          })}
        </Panel>
      ) : (
        <div style={{ marginTop: 12, borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "26px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>No courses for Semester {semester} yet. Add your first one.</div>
      )}
      <button type="button" onClick={() => setAddCourse(true)} className="hub-plate" style={{ ...darkButton, ...goldPlate, marginTop: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}><Plus size={18} /> Add a course</button>
      <p style={{ margin: "10px 0 0", fontSize: 12, fontWeight: 600, color: "rgba(26,24,20,.7)", textAlign: "center" }}>General courses shared by every programme (ME 161, EE 151, ENGL 157…) are managed by Back2Basics.</p>
      <AddCourseSheet open={addCourse} semester={semester} existing={scope.courses} onOpenExisting={(id) => { setAddCourse(false); setOpenCourse(id); }} onClose={() => setAddCourse(false)} onSaved={load} />
    </div>
  );
}

const smallGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(233,188,58,.45)", background: "transparent", color: GOLD, fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const iconButton: React.CSSProperties = { width: 38, height: 38, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(233,188,58,.3)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };


function linkKind(url: string) {
  if (/drive\.google\.com\/(drive\/)?(u\/\d+\/)?folders/i.test(url)) return "Drive folder";
  if (/drive\.google\.com|docs\.google\.com/i.test(url)) return "Drive file";
  if (/youtube\.com|youtu\.be/i.test(url)) return /list=|watch_videos/i.test(url) ? "playlist" : "video";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function AddCourseSheet({ open, semester, existing, onOpenExisting, onClose, onSaved }: { open: boolean; semester: 1 | 2; existing: Course[]; onOpenExisting: (id: string) => void; onClose: () => void; onSaved: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (open) {
      setCode("");
      setTitle("");
      setError(null);
      setConfirmed(false);
    }
  }, [open]);
  const twin = useMemo(() => {
    const c = sameKey(code);
    const t = sameKey(title);
    if (!c && !t) return null;
    return existing.find((x) => (c && sameKey(x.courseCode) === c) || (t.length > 3 && sameKey(x.courseTitle) === t)) ?? null;
  }, [code, title, existing]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (twin && !confirmed) return;
    setBusy(true);
    const result = await repCreateCourseAction({ semester, courseCode: code, courseTitle: title });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    await onSaved();
    onClose();
  }
  return (
    <Sheet open={open} onClose={onClose} label="Add a course">
      <form onSubmit={save} style={{ padding: "16px 22px 24px" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Add a course</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: MUTED }}>Semester {semester}</p>
        <label style={{ ...fieldLabel, marginTop: 14 }} htmlFor="c-code">Course code</label>
        <input id="c-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="e.g. COE 151" style={inputStyle} />
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="c-title">Course name</label>
        <input id="c-title" value={title} onChange={(e) => { setTitle(e.target.value); setConfirmed(false); }} placeholder="e.g. Introduction to Computing" style={inputStyle} required />
        {twin && !confirmed ? (
          <DuplicateWarning
            title="This course is already here"
            text={`${twin.courseCode ? `${twin.courseCode} ` : ""}${twin.courseTitle} already exists for Semester ${twin.semester ?? 1}, with ${twin.materials.length} ${twin.materials.length === 1 ? "item" : "items"}.`}
            openLabel="Open that course"
            onOpen={() => onOpenExisting(twin.id)}
            onAnyway={() => setConfirmed(true)}
          />
        ) : null}
        <ErrorLine text={error} />
        <button type="submit" disabled={busy || Boolean(twin && !confirmed)} style={{ ...darkButton, marginTop: 16, opacity: busy || (twin && !confirmed) ? 0.5 : 1 }}>{busy ? "Saving…" : "Add course"}</button>
      </form>
    </Sheet>
  );
}

type AddType = "slides" | "books" | "handwritten";
const TYPES: Array<{ value: AddType; label: string }> = [
  { value: "slides", label: "Slides" },
  { value: "books", label: "Books" },
  { value: "handwritten", label: "Handwritten notes" },
];

/** "EE 151" = "ee151"; "Applied Electricity" = "appliedelectricity". */
function sameKey(text?: string) {
  return (text ?? "").toLowerCase().replace(/\.(pdf|pptx?|docx?)$/i, "").replace(/[^a-z0-9]/g, "");
}

function DuplicateWarning({ title, text, openLabel, onOpen, onAnyway }: { title: string; text: string; openLabel?: string; onOpen?: () => void; onAnyway: () => void }) {
  return (
    <div role="alert" style={{ marginTop: 12, borderRadius: 18, background: "#FFF4D6", border: "2px solid #D9A21E", padding: "14px 16px" }}>
      <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 16, fontWeight: 800 }}><AlertTriangle size={18} color="#8F6500" aria-hidden /> {title}</p>
      <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.45, color: "#4A453C" }}>{text}</p>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        {onOpen ? <button type="button" onClick={onOpen} style={{ flex: 1, height: 44, border: 0, borderRadius: 999, background: INK, color: GOLD, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>{openLabel}</button> : null}
        <button type="button" onClick={onAnyway} style={{ flex: 1, height: 44, border: "1px solid #CFC8B8", borderRadius: 999, background: "transparent", fontFamily: "inherit", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>Add anyway</button>
      </div>
    </div>
  );
}

/** PUTs the file straight to Google Drive (never through our server), reporting progress. */
function uploadToDrive(url: string, file: File, onProgress: (fraction: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as { id?: string };
        if (xhr.status >= 200 && xhr.status < 300 && body.id) resolve(body.id);
        else reject(new Error("Upload failed."));
      } catch {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
    xhr.send(file);
  });
}

function AddMaterialSheet({ course, onClose, onSaved }: { course: Course | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [type, setType] = useState<AddType>("slides");
  const [how, setHow] = useState<"upload" | "link">("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [lecturer, setLecturer] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<Array<{ file: File; preview: string }>>([]);
  const [progress, setProgress] = useState<number | null>(null);
  const [stage, setStage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  useEffect(() => {
    if (course) {
      setType("slides");
      setHow("upload");
      setTitle("");
      setUrl("");
      setLecturer("");
      setFile(null);
      setPages([]);
      setProgress(null);
      setStage(null);
      setError(null);
      setConfirmed(false);
    }
  }, [course]);
  useEffect(() => () => pages.forEach((p) => URL.revokeObjectURL(p.preview)), [pages]);
  const handwritten = type === "handwritten";
  const uploading = handwritten || how === "upload";

  // Same title or same file name as something already in this course?
  const twin = useMemo(() => {
    if (!course) return null;
    const keys = [sameKey(title), file ? sameKey(file.name) : ""].filter((k) => k.length > 2);
    if (!keys.length) return null;
    return course.materials.find((m) => keys.includes(sameKey(m.courseTitle))) ?? null;
  }, [course, title, file]);

  function addPhotos(list: FileList | null) {
    if (!list) return;
    const images = Array.from(list).filter((f) => f.type.startsWith("image/"));
    if (!images.length) return setError("Choose photos (JPG or PNG).");
    setError(null);
    setPages((cur) => [...cur, ...images.map((f) => ({ file: f, preview: URL.createObjectURL(f) }))].slice(0, 40));
  }
  function movePage(i: number, d: -1 | 1) {
    setPages((cur) => {
      const next = [...cur];
      const j = i + d;
      if (j < 0 || j >= next.length) return cur;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    if (twin && !confirmed) return;
    setError(null);
    setBusy(true);
    try {
      if (uploading) {
        let upload = file;
        if (handwritten) {
          if (!pages.length) throw new Error("Add at least one page.");
          if (title.trim().length < 2) throw new Error("Give the notes a title.");
          setStage("Preparing pages…");
          upload = await imagesToPdf(pages.map((p) => p.file), title, (done, total) => setStage(`Preparing page ${done} of ${total}…`));
          setStage(null);
        }
        if (!upload) throw new Error("Choose a file to upload.");
        const started = await repStartUploadAction({ courseId: course.id, fileName: upload.name, fileType: upload.type || "application/pdf", size: upload.size });
        if (!started.ok) throw new Error(started.error);
        setProgress(0);
        const fileId = await uploadToDrive(started.data.uploadUrl, upload, setProgress);
        const finished = await repFinishUploadAction({ courseId: course.id, kind: type === "books" ? "books" : "slides", fileId, title, lecturer, handwritten });
        if (!finished.ok) throw new Error(finished.error);
      } else {
        const result = await repAddMaterialAction({ courseId: course.id, type: type as RepMaterialType, title, url, lecturer });
        if (!result.ok) throw new Error(result.error);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
      setStage(null);
    } finally {
      setBusy(false);
    }
  }

  const choice = (on: boolean): React.CSSProperties => ({ flex: 1, border: `2px solid ${on ? INK : "#E4DFD3"}`, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 4, background: on ? "#fff" : "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer", color: on ? INK : "#5C564B" });
  const photoButton: React.CSSProperties = { flex: 1, height: 48, borderRadius: 14, border: `2px solid ${INK}`, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14, fontWeight: 800, cursor: "pointer" };
  return (
    <Sheet open={Boolean(course)} onClose={busy ? undefined : onClose} label="Add material">
      <form onSubmit={save} style={{ padding: "16px 22px 24px", overflowY: "auto" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Add material</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: MUTED }}>{course?.courseTitle}</p>
        <span style={{ ...fieldLabel, marginTop: 14 }}>Type</span>
        <div role="radiogroup" aria-label="Type" style={{ display: "flex", gap: 6 }}>
          {TYPES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={type === t.value} onClick={() => setType(t.value)} style={{ flex: t.value === "handwritten" ? 1.5 : 1, height: 42, border: 0, borderRadius: 12, background: type === t.value ? INK : SOFT, color: type === t.value ? GOLD : "#5C564B", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{t.label}</button>
          ))}
        </div>
        {!handwritten ? (
          <>
            <span style={{ ...fieldLabel, marginTop: 12 }}>How</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setHow("upload")} style={choice(how === "upload")}><Upload size={18} /><b style={{ fontSize: 14 }}>Upload a file</b><span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>PDF, PowerPoint or Word<br />Up to 100 MB</span></button>
              <button type="button" onClick={() => setHow("link")} style={choice(how === "link")}><Link2 size={18} /><b style={{ fontSize: 14 }}>Paste a link</b><span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Google Drive file or folder</span></button>
            </div>
          </>
        ) : (
          <>
            <span style={{ ...fieldLabel, marginTop: 12 }}>Pages</span>
            <div style={{ display: "flex", gap: 8 }}>
              <label style={photoButton}><Camera size={18} /> Take photo<input type="file" accept="image/*" capture="environment" onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} style={{ display: "none" }} /></label>
              <label style={photoButton}><ImagePlus size={18} /> Choose photos<input type="file" accept="image/*" multiple onChange={(e) => { addPhotos(e.target.files); e.target.value = ""; }} style={{ display: "none" }} /></label>
            </div>
            {pages.length ? (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                {pages.map((p, i) => (
                  <div key={p.preview} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #E2DCCB", background: "#fff", aspectRatio: "3 / 4" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Page ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", left: 6, top: 6, width: 22, height: 22, borderRadius: 999, background: INK, color: GOLD, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                    <button type="button" aria-label={`Remove page ${i + 1}`} onClick={() => setPages((cur) => cur.filter((_, k) => k !== i))} style={{ position: "absolute", right: 4, top: 4, width: 28, height: 28, borderRadius: 999, border: 0, background: "rgba(26,24,20,.8)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={14} /></button>
                    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", justifyContent: "space-between", padding: 4 }}>
                      <button type="button" aria-label={`Move page ${i + 1} earlier`} disabled={i === 0} onClick={() => movePage(i, -1)} style={{ width: 30, height: 30, borderRadius: 999, border: 0, background: "rgba(26,24,20,.8)", color: "#fff", opacity: i === 0 ? 0.35 : 1, cursor: "pointer" }}>‹</button>
                      <button type="button" aria-label={`Move page ${i + 1} later`} disabled={i === pages.length - 1} onClick={() => movePage(i, 1)} style={{ width: 30, height: 30, borderRadius: 999, border: 0, background: "rgba(26,24,20,.8)", color: "#fff", opacity: i === pages.length - 1 ? 0.35 : 1, cursor: "pointer" }}>›</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            <p style={{ margin: "8px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>Snap each page in good light. We brighten them a little and join them into one PDF.</p>
          </>
        )}
        {uploading && !handwritten ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-file">File</label>
            <input
              id="m-file"
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf"
              onChange={(e) => {
                const chosen = e.target.files?.[0] ?? null;
                setFile(chosen);
                setConfirmed(false);
                if (chosen && !title) setTitle(tidyFileName(chosen.name));
              }}
              style={{ ...inputStyle, height: "auto", padding: 12, fontSize: 14 }}
            />
            {file ? <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>{formatBytes(file.size)}</p> : null}
          </>
        ) : null}
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-title">Title</label>
        <input id="m-title" value={title} onChange={(e) => { setTitle(e.target.value); setConfirmed(false); }} placeholder={handwritten ? "e.g. Week 3 notes: Kirchhoff’s laws" : type === "books" ? "e.g. Engineering Mathematics, K. A. Stroud" : "e.g. Lecture 3: Logic gates"} style={inputStyle} required={!uploading || handwritten} />
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-lecturer">Lecturer (optional)</label>
        <input id="m-lecturer" value={lecturer} onChange={(e) => setLecturer(e.target.value)} placeholder="e.g. Dr. Mensah" style={inputStyle} />
        {!uploading ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-url"><Link2 size={12} style={{ verticalAlign: -1 }} /> Link</label>
            <input id="m-url" value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://" style={{ ...inputStyle, fontSize: 14 }} required />
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>Drive links must be shared as “Anyone with the link”.</p>
          </>
        ) : null}
        {twin && !confirmed ? (
          <DuplicateWarning title="This looks like it’s already here" text={`“${twin.courseTitle}” is already in this course${twin.createdAt ? `, added ${new Date(twin.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}.`} onAnyway={() => setConfirmed(true)} />
        ) : null}
        {stage ? <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 700 }} aria-live="polite">{stage}</p> : null}
        {progress !== null ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 999, background: "#EFEADF", overflow: "hidden" }}><div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: INK, transition: "width .2s" }} /></div>
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 700 }} aria-live="polite">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Finishing…"}</p>
          </div>
        ) : null}
        <ErrorLine text={error} />
        <button type="submit" disabled={busy || Boolean(twin && !confirmed)} style={{ ...darkButton, marginTop: 16, opacity: busy || (twin && !confirmed) ? 0.5 : 1 }}>{busy ? (uploading ? "Uploading…" : "Publishing…") : handwritten && pages.length ? `Upload ${pages.length} ${pages.length === 1 ? "page" : "pages"}` : "Publish to students"}</button>
      </form>
    </Sheet>
  );
}

/** Swap in a newer version of a file: it keeps its place and title; students see "Updated". */
function ReplaceSheet({ material, course, onClose, onSaved }: { material: CourseMaterialEntry | null; course: Course; onClose: () => void; onSaved: () => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [notify, setNotify] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (material) {
      setFile(null);
      setNote("");
      setNotify(true);
      setProgress(null);
      setError(null);
    }
  }, [material]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!material) return;
    if (!file) return setError("Choose the new version.");
    setBusy(true);
    setError(null);
    try {
      const started = await repStartUploadAction({ courseId: course.id, fileName: file.name, fileType: file.type || "application/pdf", size: file.size });
      if (!started.ok) throw new Error(started.error);
      setProgress(0);
      const fileId = await uploadToDrive(started.data.uploadUrl, file, setProgress);
      const done = await repFinishReplaceAction({ materialId: material.id, fileId, note, notify });
      if (!done.ok) throw new Error(done.error);
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet open={Boolean(material)} onClose={busy ? undefined : onClose} label="Replace file">
      <form onSubmit={save} style={{ padding: "16px 22px 24px", overflowY: "auto" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Replace file</h2>
        <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, color: "#5C564B" }}>Swap in a corrected or newer version. It keeps its place and title; students see an Updated tag.</p>
        <div style={{ marginTop: 12, borderRadius: 16, background: SOFT, padding: 14 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".1em", color: MUTED }}>NOW</p>
          <p style={{ margin: "4px 0 0", fontSize: 16, fontWeight: 700 }}>{material?.courseTitle}</p>
        </div>
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="r-file">New version</label>
        <input id="r-file" type="file" accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} style={{ ...inputStyle, height: "auto", padding: 12, fontSize: 14 }} />
        {file ? <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>{formatBytes(file.size)}</p> : null}
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="r-note">What changed? (optional)</label>
        <input id="r-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Fixed question 4" style={inputStyle} />
        <label style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10, fontSize: 14, fontWeight: 600 }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} style={{ width: 20, height: 20 }} /> Tell my class it was updated
        </label>
        {progress !== null ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 999, background: "#EFEADF", overflow: "hidden" }}><div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: INK }} /></div>
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 700 }} aria-live="polite">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Finishing…"}</p>
          </div>
        ) : null}
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} style={{ ...darkButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? "Replacing…" : "Replace file"}</button>
      </form>
    </Sheet>
  );
}

/** Show or hide individual files inside a linked Drive folder (the folder itself belongs to someone else). */
function FilesSheet({ material, onClose, onSaved }: { material: CourseMaterialEntry | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [items, setItems] = useState<DriveItem[] | null>(null);
  const [hidden, setHidden] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!material) return;
    const folder = parseDriveFolderId(material.url);
    setItems(null);
    setError(null);
    setHidden(material.hiddenFiles ?? []);
    if (!folder) return;
    const controller = new AbortController();
    listDriveFolder(folder, controller.signal)
      .then(setItems)
      .catch(() => {
        if (!controller.signal.aborted) setError("This folder couldn’t be opened. Check it is shared as “Anyone with the link”.");
      });
    return () => controller.abort();
  }, [material]);
  async function save() {
    if (!material) return;
    setBusy(true);
    const result = await repSetHiddenFilesAction(material.id, hidden);
    setBusy(false);
    if (!result.ok) return setError(result.error);
    await onSaved();
    onClose();
  }
  return (
    <Sheet open={Boolean(material)} onClose={onClose} label="Show or hide files" maxHeight="90dvh">
      <div style={{ padding: "16px 22px 0" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Show or hide files</h2>
        <p style={{ margin: "4px 0 0", fontSize: 13, fontWeight: 600, color: MUTED }}>Hidden files stay in the original Google Drive; students just won’t see them here.</p>
      </div>
      <div className="hub-scroll" style={{ overflowY: "auto", padding: "12px 12px 0", flex: 1 }}>
        {error ? <ErrorLine text={error} /> : null}
        {!items && !error ? <p style={{ padding: "0 10px", fontWeight: 700 }}>Loading files…</p> : null}
        {items?.map((item) => {
          const off = hidden.includes(item.id);
          return (
            <button key={item.id} type="button" onClick={() => setHidden((prev) => (off ? prev.filter((id) => id !== item.id) : [...prev, item.id]))} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 54, padding: "8px 10px", border: 0, borderRadius: 14, background: off ? "#F3EEE2" : "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer", opacity: off ? 0.6 : 1 }}>
              {item.isFolder ? <Folder size={18} color="#8F6500" /> : <FileText size={18} color="#8F6500" />}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: INK, textDecoration: off ? "line-through" : "none", overflowWrap: "anywhere" }}>{item.isFolder ? item.name : tidyFileName(item.name)}</span>
                <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: MUTED }}>{off ? "Hidden from students" : item.isFolder ? "Folder" : formatBytes(item.size) || "File"}</span>
              </span>
              {off ? <EyeOff size={18} color="#B3261E" /> : <Eye size={18} color={INK} />}
            </button>
          );
        })}
      </div>
      <div style={{ padding: "12px 22px 22px" }}>
        <button type="button" onClick={save} disabled={busy || !items} style={{ ...darkButton, opacity: busy || !items ? 0.6 : 1 }}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </Sheet>
  );
}

function EditSheet({ entry, onClose, onSaved }: { entry: CourseMaterialEntry | null; onClose: () => void; onSaved: () => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCourse = entry?.entryType === "course";
  useEffect(() => {
    if (entry) {
      setTitle(entry.courseTitle);
      setUrl(entry.url);
      setCode(entry.courseCode ?? "");
      setError(null);
    }
  }, [entry]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!entry) return;
    setBusy(true);
    const result = await repUpdateEntryAction(entry.id, isCourse ? { title, courseCode: code } : { title, url });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    await onSaved();
    onClose();
  }
  return (
    <Sheet open={Boolean(entry)} onClose={onClose} label="Edit">
      <form onSubmit={save} style={{ padding: "16px 22px 24px" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{isCourse ? "Edit course" : "Edit material"}</h2>
        {isCourse ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 14 }} htmlFor="e-code">Course code</label>
            <input id="e-code" value={code} onChange={(e) => setCode(e.target.value)} style={inputStyle} />
          </>
        ) : null}
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="e-title">{isCourse ? "Course name" : "Title"}</label>
        <input id="e-title" value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
        {!isCourse ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="e-url">Link</label>
            <input id="e-url" value={url} onChange={(e) => setUrl(e.target.value)} type="url" style={{ ...inputStyle, fontSize: 14 }} required />
          </>
        ) : null}
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} style={{ ...darkButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Save"}</button>
      </form>
    </Sheet>
  );
}
