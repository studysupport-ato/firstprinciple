"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Clock, Eye, EyeOff, FileText, Folder, Link2, Lock, Pencil, Play, Plus, Trash2, Upload } from "lucide-react";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { availableDepartments, formatBytes, listDriveFolder, monogram, parseDriveFolderId, tidyFileName, type DriveItem } from "@/lib/site/materialsHub";
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
} from "@/lib/courseReps/actions";
import type { RepApplication, RepMaterialType, RepScope } from "@/lib/courseReps/repService";
import { BlueprintCard, CREAM, GOLD, HubStyles, INK, MUTED, Panel, Pill, ROW_LINE, Sheet, SOFT, backButtonStyle, goldGround, goldPlate, hubFont } from "@/components/materials-hub/ui";
import { useHubData } from "@/components/materials-hub/useHub";

const fieldLabel: React.CSSProperties = { display: "block", fontSize: 12, fontWeight: 700, color: "#5C564B", marginBottom: 6 };
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
  if (!loading && !authenticated) {
    body = (
      <Intro>
        <p style={{ margin: "14px 0 0", fontSize: 14, lineHeight: 1.5, color: "rgba(246,239,220,.7)" }}>Sign in or create an account first. Your email is how you’ll sign in to upload.</p>
        <button type="button" onClick={() => setAuthOpen(true)} className="hub-plate" style={{ ...darkButton, ...goldPlate, marginTop: 16 }}>Sign in to apply</button>
      </Intro>
    );
  } else if (application === null || application?.status === "declined" || application?.status === "revoked") {
    body = <ApplyForm previous={application} onDone={setApplication} />;
  } else if (application?.status === "pending") {
    body = <Pending application={application} />;
  } else if (application?.status === "approved") {
    body = <RepPanel />;
  }

  return (
    <div style={{ ...goldGround, ...hubFont, color: INK, minHeight: "100dvh" }}>
      <HubStyles />
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "16px 18px 110px" }}>
        <Link href="/" className="hub-tap" style={backButtonStyle}><ArrowLeft size={22} strokeWidth={2.8} aria-hidden />Home</Link>
        <div style={{ marginTop: 12 }}>{body}</div>
      </div>
      <AuthModal open={authOpen} initialView="signup" onClose={() => setAuthOpen(false)} />
    </div>
  );
}

function Intro({ children }: { children?: React.ReactNode }) {
  return (
    <BlueprintCard compact>
      <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: GOLD }}>Course rep access</p>
      <h1 style={{ margin: "6px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.05, color: CREAM }}>Upload materials for your class</h1>
      <p style={{ margin: "8px 0 0", fontSize: 13, fontWeight: 500, color: "rgba(246,239,220,.6)" }}>We check every application before giving access.</p>
      {children}
    </BlueprintCard>
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
    <>
      <Intro>
        {previous?.status === "declined" ? <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 700, color: GOLD }}>Your last application wasn’t approved. You can apply again.</p> : null}
        {previous?.status === "revoked" ? <p style={{ margin: "12px 0 0", fontSize: 13, fontWeight: 700, color: GOLD }}>Your course rep access was removed. You can apply again.</p> : null}
      </Intro>
      <form onSubmit={submit} style={{ marginTop: 14, borderRadius: 24, background: "#FFFDF8", padding: "16px 16px 18px", boxShadow: "0 14px 32px -16px rgba(26,24,20,.45)" }}>
        <label style={fieldLabel} htmlFor="rep-name">Full name</label>
        <input id="rep-name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" placeholder="e.g. Ama Serwaa Mensah" style={inputStyle} required />

        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="rep-programme">Programme</label>
        <select id="rep-programme" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} style={{ ...inputStyle, appearance: "auto" }} required>
          <option value="">Choose your programme</option>
          {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <span style={{ ...fieldLabel, marginTop: 12 }}>Year</span>
        <div role="radiogroup" aria-label="Year" style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3, 4].map((y) => (
            <button key={y} type="button" role="radio" aria-checked={year === y} onClick={() => setYear(y)} style={{ flex: 1, height: 42, border: 0, borderRadius: 12, background: year === y ? INK : SOFT, color: year === y ? GOLD : "#5C564B", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>Year {y}</button>
          ))}
        </div>

        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="rep-phone">Phone number</label>
        <input id="rep-phone" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel" inputMode="tel" placeholder="024 123 4567" style={inputStyle} required />

        <ErrorLine text={error} />
        <button type="submit" disabled={busy} style={{ ...darkButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? "Sending…" : "Send application"}</button>
        <p style={{ margin: "10px 0 0", fontSize: 11, fontWeight: 600, color: MUTED, textAlign: "center" }}>You can only upload for the programme and year you choose here.</p>
      </form>
    </>
  );
}

function Pending({ application }: { application: RepApplication }) {
  return (
    <BlueprintCard department={application.departmentName} style={{ marginTop: 60, textAlign: "center", padding: "26px 22px" }}>
      <span style={{ width: 64, height: 64, borderRadius: 999, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", ...goldPlate }}><Clock size={26} strokeWidth={2.3} /></span>
      <h1 style={{ margin: "16px 0 0", fontSize: 26, fontWeight: 800, letterSpacing: "-.03em", color: CREAM }}>Application received</h1>
      <p style={{ margin: "8px 0 0", fontSize: 14, lineHeight: 1.5, color: "rgba(246,239,220,.65)" }}>
        We’ll confirm you as course rep for <b style={{ color: CREAM }}>{application.departmentName} · Year {application.studyYear}</b>. You’ll get a text on {application.phone.replace(/^\+233/, "0")} when it’s done.
      </p>
      <span style={{ marginTop: 18, display: "inline-flex", alignItems: "center", gap: 8, height: 34, padding: "0 14px", borderRadius: 999, background: "#2A251C", fontSize: 12, fontWeight: 800, color: GOLD }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: GOLD }} />Pending review
      </span>
    </BlueprintCard>
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
            <button type="button" onClick={() => remove(current)} style={{ ...smallGhost, color: "#F2A39B", borderColor: "rgba(242,163,155,.45)" }}><Trash2 size={13} /> Remove course</button>
          </div>
        </BlueprintCard>
        {current.materials.length ? (
          <Panel style={{ marginTop: 12 }}>
            {current.materials.map((m, i) => {
              const yt = m.materialType === "playlist" || m.materialType === "video";
              const book = m.description === "book";
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 10px 10px 12px", borderBottom: i < current.materials.length - 1 ? `1px solid ${ROW_LINE}` : "none" }}>
                  <span aria-hidden style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", ...(yt ? { background: "#FF0033" } : book ? goldPlate : { background: "#2A251C", border: "1px solid rgba(233,188,58,.25)" }) }}>
                    {yt ? <Play size={15} color="#fff" fill="#fff" /> : book ? <BookOpen size={16} color={INK} /> : <FileText size={16} color={GOLD} />}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: CREAM, overflowWrap: "anywhere" }}>{m.courseTitle}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "rgba(246,239,220,.5)" }}>{yt ? "YouTube" : book ? "Book" : "Slides"} · {linkKind(m.url)}{m.hiddenFiles?.length ? ` · ${m.hiddenFiles.length} hidden` : ""}</span>
                  </span>
                  {parseDriveFolderId(m.url) ? <button type="button" onClick={() => setManaging(m)} aria-label={`Show or hide files in ${m.courseTitle}`} style={iconButton}><Folder size={15} color={GOLD} /></button> : null}
                  <button type="button" onClick={() => setEditing(m)} aria-label={`Edit ${m.courseTitle}`} style={iconButton}><Pencil size={15} color={GOLD} /></button>
                  <button type="button" onClick={() => remove(m)} aria-label={`Remove ${m.courseTitle}`} style={iconButton}><Trash2 size={15} color="#F2A39B" /></button>
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
            const [prefix, number] = splitCode(c.courseCode, c.courseTitle);
            return (
              <button key={c.id} type="button" onClick={() => setOpenCourse(c.id)} className="hub-tap hub-dark-row" style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, minHeight: 72, padding: "12px 14px", border: 0, borderBottom: i < courses.length - 1 ? `1px solid ${ROW_LINE}` : "none", background: "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer" }}>
                <span style={{ width: 48, height: 48, flexShrink: 0, borderRadius: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1, ...goldPlate }}>
                  <span style={{ fontSize: 8, fontWeight: 900, letterSpacing: ".08em", opacity: 0.7 }}>{prefix}</span>
                  <span style={{ fontSize: number.length > 3 ? 13 : 17, fontWeight: 900 }}>{number}</span>
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
      <AddCourseSheet open={addCourse} semester={semester} onClose={() => setAddCourse(false)} onSaved={load} />
    </div>
  );
}

const smallGhost: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", borderRadius: 999, border: "1px solid rgba(233,188,58,.45)", background: "transparent", color: GOLD, fontFamily: "inherit", fontSize: 12, fontWeight: 800, cursor: "pointer" };
const iconButton: React.CSSProperties = { width: 38, height: 38, flexShrink: 0, borderRadius: 999, border: "1px solid rgba(233,188,58,.3)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" };

function splitCode(code: string | undefined, title: string): [string, string] {
  const match = code?.match(/^([A-Za-z]+)\s*(\d+)/);
  return match ? [match[1].toUpperCase(), match[2]] : ["", monogram(title)];
}

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

function AddCourseSheet({ open, semester, onClose, onSaved }: { open: boolean; semester: 1 | 2; onClose: () => void; onSaved: () => Promise<void> }) {
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setCode("");
      setTitle("");
      setError(null);
    }
  }, [open]);
  async function save(e: React.FormEvent) {
    e.preventDefault();
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
        <input id="c-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Introduction to Computing" style={inputStyle} required />
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} style={{ ...darkButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? "Saving…" : "Add course"}</button>
      </form>
    </Sheet>
  );
}

const TYPES: Array<{ value: RepMaterialType; label: string }> = [
  { value: "slides", label: "Slides" },
  { value: "books", label: "Books" },
  { value: "youtube", label: "YouTube" },
];

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
  const [type, setType] = useState<RepMaterialType>("slides");
  const [how, setHow] = useState<"upload" | "link">("upload");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (course) {
      setType("slides");
      setHow("upload");
      setTitle("");
      setUrl("");
      setFile(null);
      setProgress(null);
      setError(null);
    }
  }, [course]);
  const uploading = how === "upload" && type !== "youtube";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!course) return;
    setError(null);
    setBusy(true);
    try {
      if (uploading) {
        if (!file) throw new Error("Choose a file to upload.");
        const started = await repStartUploadAction({ courseId: course.id, fileName: file.name, fileType: file.type || "application/pdf", size: file.size });
        if (!started.ok) throw new Error(started.error);
        setProgress(0);
        const fileId = await uploadToDrive(started.data.uploadUrl, file, setProgress);
        const finished = await repFinishUploadAction({ courseId: course.id, kind: type === "books" ? "books" : "slides", fileId, title });
        if (!finished.ok) throw new Error(finished.error);
      } else {
        const result = await repAddMaterialAction({ courseId: course.id, type, title, url });
        if (!result.ok) throw new Error(result.error);
      }
      await onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  const choice = (on: boolean): React.CSSProperties => ({ flex: 1, border: `2px solid ${on ? INK : "#E4DFD3"}`, borderRadius: 16, padding: 12, display: "flex", flexDirection: "column", gap: 4, background: on ? "#fff" : "transparent", textAlign: "left", fontFamily: "inherit", cursor: "pointer", color: on ? INK : "#5C564B" });
  return (
    <Sheet open={Boolean(course)} onClose={busy ? undefined : onClose} label="Add material">
      <form onSubmit={save} style={{ padding: "16px 22px 24px", overflowY: "auto" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Add material</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: MUTED }}>{course?.courseCode ? `${course.courseCode} · ` : ""}{course?.courseTitle}</p>
        <span style={{ ...fieldLabel, marginTop: 14 }}>Type</span>
        <div role="radiogroup" aria-label="Type" style={{ display: "flex", gap: 6 }}>
          {TYPES.map((t) => (
            <button key={t.value} type="button" role="radio" aria-checked={type === t.value} onClick={() => setType(t.value)} style={{ flex: 1, height: 42, border: 0, borderRadius: 12, background: type === t.value ? INK : SOFT, color: type === t.value ? GOLD : "#5C564B", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}>{t.label}</button>
          ))}
        </div>
        {type !== "youtube" ? (
          <>
            <span style={{ ...fieldLabel, marginTop: 12 }}>How</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => setHow("upload")} style={choice(how === "upload")}><Upload size={18} /><b style={{ fontSize: 14 }}>Upload a file</b><span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>PDF, PowerPoint or Word · up to 100 MB</span></button>
              <button type="button" onClick={() => setHow("link")} style={choice(how === "link")}><Link2 size={18} /><b style={{ fontSize: 14 }}>Paste a link</b><span style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>Google Drive file or folder</span></button>
            </div>
          </>
        ) : null}
        {uploading ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-file">File</label>
            <input
              id="m-file"
              type="file"
              accept=".pdf,.ppt,.pptx,.doc,.docx,application/pdf"
              onChange={(e) => {
                const chosen = e.target.files?.[0] ?? null;
                setFile(chosen);
                if (chosen && !title) setTitle(tidyFileName(chosen.name));
              }}
              style={{ ...inputStyle, height: "auto", padding: 12, fontSize: 14 }}
            />
            {file ? <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>{formatBytes(file.size)}</p> : null}
          </>
        ) : null}
        <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-title">Title</label>
        <input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={type === "youtube" ? "e.g. Chapter 1: Number systems" : type === "books" ? "e.g. Engineering Mathematics, K. A. Stroud" : "e.g. Lecture 3 · Logic gates"} style={inputStyle} required={!uploading} />
        {!uploading ? (
          <>
            <label style={{ ...fieldLabel, marginTop: 12 }} htmlFor="m-url"><Link2 size={12} style={{ verticalAlign: -1 }} /> Link</label>
            <input id="m-url" value={url} onChange={(e) => setUrl(e.target.value)} type="url" inputMode="url" placeholder="https://" style={{ ...inputStyle, fontSize: 14 }} required />
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 600, color: MUTED }}>{type === "youtube" ? "YouTube playlist or video link." : "Drive links must be shared as “Anyone with the link”."}</p>
          </>
        ) : null}
        {progress !== null ? (
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 8, borderRadius: 999, background: "#EFEADF", overflow: "hidden" }}><div style={{ width: `${Math.round(progress * 100)}%`, height: "100%", background: INK, transition: "width .2s" }} /></div>
            <p style={{ margin: "6px 0 0", fontSize: 12, fontWeight: 700 }} aria-live="polite">{progress < 1 ? `Uploading… ${Math.round(progress * 100)}%` : "Finishing…"}</p>
          </div>
        ) : null}
        <ErrorLine text={error} />
        <button type="submit" disabled={busy} style={{ ...darkButton, marginTop: 16, opacity: busy ? 0.6 : 1 }}>{busy ? (uploading ? "Uploading…" : "Publishing…") : "Publish to students"}</button>
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
