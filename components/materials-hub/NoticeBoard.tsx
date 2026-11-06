"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowLeft, Bell, BellOff, BookOpen, Check, ChevronRight, ClipboardList, FileText, Folder, Paperclip, Play, X } from "lucide-react";
import { classAssignmentsAction, clearAssignmentReminderAction, setAssignmentDoneAction, setAssignmentReminderAction } from "@/lib/courseReps/assignmentActions";
import type { AssignmentWithMine } from "@/lib/courseReps/assignments";
import { deviceId, pushAddress } from "@/lib/courseReps/uploadPushClient";
import { programmeUploads, splitTopic, timeAgo, type HubChoice, type LoggedUpload } from "@/lib/site/materialsHub";
import type { CourseMaterialEntry } from "@/lib/courseMaterials";
import { CREAM, GOLD, INK, OVERLAY_Z, Overlay, backButtonStyle, hubFont } from "./ui";

export const SLIDES_BG = "#DFF3E1";
export const SLIDES_INK = "#1B5E20";
export const SLIDES_TILE = "#2E7D32";
export const BLUE = "#1E5BC6";
export const BLUE_DEEP = "#16449A";
const RED = "#D32F2F";

/* ─── Data ───────────────────────────────────────────────────────────── */

export function useClassAssignments(choice: HubChoice | null) {
  const [items, setItems] = useState<AssignmentWithMine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const load = useCallback(async () => {
    if (!choice) return;
    const result = await classAssignmentsAction({ departmentId: choice.departmentId, studyYear: choice.year, deviceId: deviceId() });
    if (result.ok) setItems(result.data);
    setLoaded(true);
  }, [choice]);
  useEffect(() => {
    setLoaded(false);
    setItems([]);
    void load();
    const timer = window.setInterval(() => void load(), 120_000);
    return () => window.clearInterval(timer);
  }, [load]);
  const patch = useCallback((id: string, change: Partial<AssignmentWithMine>) => setItems((list) => list.map((a) => (a.id === id ? { ...a, ...change } : a))), []);
  return { items, loaded, reload: load, patch };
}

export type ClassAssignments = ReturnType<typeof useClassAssignments>;

function fileView(id: string) {
  return `https://drive.google.com/file/d/${encodeURIComponent(id)}/view`;
}
function fileThumb(id: string) {
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1000`;
}
function slideHref(u: LoggedUpload) {
  if (u.kind === "videos") return `/materials-hub?course=${encodeURIComponent(u.course.id)}&view=videos`;
  return `/materials-hub?course=${encodeURIComponent(u.course.id)}&view=slides&open=${encodeURIComponent(u.entry.id)}`;
}

/* ─── The two folders ────────────────────────────────────────────────── */

export function FolderBars({ courseCount, openCount, onSlides, onAssignments }: { courseCount: number; openCount: number; onSlides: () => void; onAssignments: () => void }) {
  const bar: CSSProperties = { width: "100%", display: "flex", alignItems: "center", gap: 14, minHeight: 84, padding: "14px 18px", borderRadius: 24, border: 0, fontFamily: "inherit", textAlign: "left", cursor: "pointer", boxShadow: "0 16px 30px -18px rgba(26,24,20,.6)" };
  return (
    <div className="nb-bars" data-tour-step="hub-folders">
      <button type="button" onClick={onSlides} className="hub-tap hub-row nb-bar" style={{ ...bar, background: SLIDES_BG, color: SLIDES_INK }}>
        <span aria-hidden className="nb-ico" style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 16, background: SLIDES_TILE, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Folder size={25} color="#fff" strokeWidth={2.3} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="nb-name" style={{ display: "block", fontSize: 22, fontWeight: 900, letterSpacing: "-.02em" }}>Slides</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, opacity: 0.8 }}>{courseCount ? `${courseCount} ${courseCount === 1 ? "course" : "courses"}` : "No courses yet"}</span>
        </span>
        <ChevronRight className="nb-chev" size={22} strokeWidth={2.8} aria-hidden />
      </button>
      <button type="button" onClick={onAssignments} className="hub-tap hub-row nb-bar" style={{ ...bar, background: BLUE, color: "#fff", animationDelay: "60ms" }}>
        <span aria-hidden className="nb-ico" style={{ width: 52, height: 52, flexShrink: 0, borderRadius: 16, background: "rgba(255,255,255,.18)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ClipboardList size={25} color="#fff" strokeWidth={2.3} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="nb-name" style={{ display: "block", fontSize: 22, fontWeight: 900, letterSpacing: "-.02em" }}>Assignments</span>
          <span style={{ display: "block", fontSize: 13, fontWeight: 700, opacity: 0.85 }}>{openCount ? `${openCount} not done yet` : "All caught up"}</span>
        </span>
        <ChevronRight className="nb-chev" size={22} strokeWidth={2.8} aria-hidden />
      </button>
    </div>
  );
}

/* ─── Notice board ───────────────────────────────────────────────────── */

type FeedItem = { kind: "assignment"; at: string; a: AssignmentWithMine } | { kind: "upload"; at: string; u: LoggedUpload };

export function NoticeBoard({ choice, entries, assignments, onSeeAssignments, onOpenAssignment }: { choice: HubChoice; entries: CourseMaterialEntry[]; assignments: ClassAssignments; onSeeAssignments: () => void; onOpenAssignment: (id: string) => void }) {
  const [remindFor, setRemindFor] = useState<AssignmentWithMine | null>(null);
  const urgent = assignments.items.filter((a) => a.urgent && !a.done);
  const feed = useMemo<FeedItem[]>(() => {
    const uploads = programmeUploads(entries, choice.departmentId, 21)
      .filter((u) => u.year === choice.year)
      .map((u) => ({ kind: "upload" as const, at: u.entry.replacedAt ?? u.entry.createdAt, u }));
    const posts = assignments.items.filter((a) => !(a.urgent && !a.done)).map((a) => ({ kind: "assignment" as const, at: a.createdAt, a }));
    return [...posts, ...uploads].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 8);
  }, [entries, choice, assignments.items]);

  return (
    <div className="hub-row" data-tour-step="hub-notice" style={{ marginTop: 18, borderRadius: 26, background: INK, border: `2px solid ${urgent.length ? RED : "rgba(233,188,58,.35)"}`, padding: "16px 14px 14px", boxShadow: "0 18px 36px -18px rgba(26,24,20,.7)", animationDelay: "120ms" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="nb-live" aria-hidden style={{ width: 12, height: 12, flexShrink: 0, borderRadius: 999, background: RED }} />
        <h2 style={{ margin: 0, flex: 1, fontSize: 24, fontWeight: 900, letterSpacing: "-.02em", color: CREAM, textTransform: "uppercase" }}>Notice board</h2>
        {urgent.length ? (
          <span style={{ height: 28, padding: "0 11px", borderRadius: 999, background: RED, color: "#fff", fontSize: 12, fontWeight: 900, letterSpacing: ".06em", display: "inline-flex", alignItems: "center" }}>{urgent.length} URGENT</span>
        ) : null}
      </div>
      <p style={{ margin: "4px 0 0 22px", fontSize: 13, fontWeight: 700, color: "rgba(246,239,220,.6)" }}>Check here first. Tap any notice to open it.</p>

      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {urgent.map((a) => (
          <AssignmentCard key={a.id} a={a} assignments={assignments} onRemind={() => setRemindFor(a)} onOpen={() => onOpenAssignment(a.id)} />
        ))}
        {feed.map((item) =>
          item.kind === "assignment" ? (
            <AssignmentCard key={item.a.id} a={item.a} assignments={assignments} onRemind={() => setRemindFor(item.a)} onOpen={() => onOpenAssignment(item.a.id)} compact />
          ) : (
            <UploadNotice key={item.u.entry.id} u={item.u} />
          ),
        )}
        {!urgent.length && !feed.length ? (
          <div style={{ borderRadius: 16, border: "2px dashed rgba(246,239,220,.2)", padding: "22px 16px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(246,239,220,.6)" }}>
            {assignments.loaded ? "Nothing new yet. New slides and assignments from your course reps will show up here." : "Loading…"}
          </div>
        ) : null}
      </div>
      {assignments.items.length ? (
        <button type="button" onClick={onSeeAssignments} className="hub-tap" style={{ marginTop: 12, width: "100%", minHeight: 46, border: 0, borderRadius: 999, background: "rgba(246,239,220,.08)", color: CREAM, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
          See all assignments
        </button>
      ) : null}
      {remindFor ? <ReminderSheet a={remindFor} assignments={assignments} onClose={() => setRemindFor(null)} /> : null}
    </div>
  );
}

function CourseStrip({ title, bg }: { title: string; bg: string }) {
  return <div style={{ background: bg, color: "#FFFFFF", padding: "7px 14px", textAlign: "center", fontSize: 15, fontWeight: 900, letterSpacing: ".01em", lineHeight: 1.2 }}>{title}</div>;
}

function UploadNotice({ u }: { u: LoggedUpload }) {
  const { code, unit, topic } = splitTopic(u.entry.courseTitle);
  const updated = Boolean(u.entry.replacedAt);
  return (
    <Link href={slideHref(u)} className="hub-tap" style={{ display: "block", borderRadius: 16, overflow: "hidden", background: SLIDES_BG, color: SLIDES_INK, textDecoration: "none" }}>
      <CourseStrip title={u.course.courseTitle} bg={SLIDES_TILE} />
      <span style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px" }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          {code ? <span style={{ display: "block", fontSize: 12, fontWeight: 800 }}>{code}</span> : null}
          {unit ? <span style={{ display: "inline-flex", marginTop: 3, height: 22, padding: "0 9px", borderRadius: 7, background: SLIDES_TILE, color: "#FFFFFF", fontSize: 12, fontWeight: 800, alignItems: "center" }}>{unit}</span> : null}
          {topic || (!code && !unit) ? <span style={{ display: "block", marginTop: 5, fontSize: 17, fontWeight: 900, lineHeight: 1.15, color: INK }}>{topic || u.entry.courseTitle}</span> : null}
          <span style={{ display: "block", marginTop: 3, fontSize: 12, fontWeight: 600 }}>
            {updated ? "Updated " : u.kind === "books" ? "Book, " : u.kind === "videos" ? "Videos, " : ""}
            {timeAgo(u.entry.replacedAt ?? u.entry.createdAt)}
          </span>
        </span>
        <ChevronRight size={18} strokeWidth={2.8} aria-hidden />
      </span>
    </Link>
  );
}

/* ─── One assignment ─────────────────────────────────────────────────── */

export function AssignmentCard({ a, assignments, onRemind, compact, highlight, onOpen }: { a: AssignmentWithMine; assignments: ClassAssignments; onRemind: () => void; compact?: boolean; highlight?: boolean; onOpen?: () => void }) {
  const [busy, setBusy] = useState(false);
  const urgentLook = a.urgent && !a.done;
  const toggleDone = async () => {
    setBusy(true);
    const next = !a.done;
    assignments.patch(a.id, { done: next, reminder: next ? null : a.reminder });
    const result = await setAssignmentDoneAction({ assignmentId: a.id, done: next, deviceId: deviceId() });
    if (!result.ok) assignments.patch(a.id, { done: a.done, reminder: a.reminder });
    setBusy(false);
  };
  const fg = urgentLook ? INK : "#fff";
  const sub = urgentLook ? "#5C564B" : "rgba(255,255,255,.78)";
  return (
    <div id={`notice-${a.id}`} className={urgentLook ? "nb-glow" : undefined} style={{ borderRadius: 20, overflow: "hidden", background: urgentLook ? "#FFFFFF" : BLUE, color: fg, opacity: a.done ? 0.62 : 1, outline: highlight ? `4px solid ${GOLD}` : "none", outlineOffset: 2 }}>
      <CourseStrip title={a.courseTitle} bg={urgentLook ? RED : BLUE_DEEP} />
      <div style={{ padding: "12px 14px 12px" }}>
      <div onClick={onOpen} role={onOpen ? "button" : undefined} tabIndex={onOpen ? 0 : undefined} onKeyDown={onOpen ? (e) => e.key === "Enter" && onOpen() : undefined} style={{ cursor: onOpen ? "pointer" : "default" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {urgentLook ? (
          <span style={{ height: 24, padding: "0 10px", borderRadius: 999, background: RED, color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", display: "inline-flex", alignItems: "center" }}>URGENT</span>
        ) : (
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".1em", color: sub }}>ASSIGNMENT</span>
        )}
        {a.done ? (
          <span style={{ height: 24, padding: "0 10px", borderRadius: 999, background: "#12804A", color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: ".06em", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Check size={12} strokeWidth={3} aria-hidden /> DONE
          </span>
        ) : null}
      </div>
      {a.body ? (
        <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word", display: compact ? "-webkit-box" : "block", WebkitLineClamp: compact ? 4 : undefined, WebkitBoxOrient: compact ? "vertical" : undefined, overflow: compact ? "hidden" : "visible" }}>{a.body}</p>
      ) : null}
      {a.fileId && a.fileKind === "image" ? (
        <a href={fileView(a.fileId)} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, borderRadius: 14, overflow: "hidden", background: "rgba(0,0,0,.15)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fileThumb(a.fileId)} alt={`Assignment for ${a.courseTitle}`} loading="lazy" style={{ display: "block", width: "100%", maxHeight: compact ? 220 : 520, objectFit: "contain", background: "#fff" }} />
        </a>
      ) : null}
      {a.fileId && a.fileKind === "pdf" ? (
        <a href={fileView(a.fileId)} target="_blank" rel="noopener noreferrer" className="hub-tap" style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: urgentLook ? "#F1F4FB" : "rgba(255,255,255,.15)", color: fg, textDecoration: "none" }}>
          <Paperclip size={18} strokeWidth={2.3} aria-hidden />
          <span style={{ flex: 1, minWidth: 0, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.fileName ?? "Assignment.pdf"}</span>
          <span style={{ fontSize: 13, fontWeight: 800 }}>Open</span>
        </a>
      ) : null}
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 600, color: sub }}>{timeAgo(a.createdAt)}</div>
      {a.postedBy ? <div style={{ fontSize: 12, fontWeight: 600, color: sub }}>Posted by {a.postedBy}</div> : null}
      {a.reminder && !a.done ? <div style={{ marginTop: 4, fontSize: 12, fontWeight: 800, color: urgentLook ? BLUE : "#fff" }}>Reminding you {intervalLabel(a.reminder.everyMinutes).toLowerCase()} until {endLabel(a.reminder.endsAt)}</div> : null}
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
        <button type="button" onClick={toggleDone} disabled={busy} className="hub-tap" style={{ flex: 1, minHeight: 44, borderRadius: 999, border: 0, background: a.done ? (urgentLook ? "#EDE8DC" : "rgba(255,255,255,.2)") : urgentLook ? INK : "#fff", color: a.done ? fg : urgentLook ? GOLD : BLUE_DEEP, fontFamily: "inherit", fontSize: 14, fontWeight: 900, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          {a.done ? "Mark as not done" : (<><Check size={16} strokeWidth={3} aria-hidden /> Mark as done</>)}
        </button>
        {!a.done ? (
          <button type="button" onClick={onRemind} aria-label={a.reminder ? "Change reminder" : "Remind me"} className="hub-tap" style={{ minHeight: 44, padding: "0 14px", borderRadius: 999, border: `2px solid ${urgentLook ? INK : "rgba(255,255,255,.7)"}`, background: "transparent", color: fg, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Bell size={16} strokeWidth={2.4} aria-hidden /> {a.reminder ? "Reminder on" : "Remind me"}
          </button>
        ) : null}
      </div>
      </div>
    </div>
  );
}

/* ─── Reminder picker ────────────────────────────────────────────────── */

const INTERVALS = [30, 60, 180, 360, 720, 1440];
function intervalLabel(m: number) {
  if (m < 60) return `Every ${m} minutes`;
  if (m === 60) return "Every hour";
  if (m === 1440) return "Every day";
  return `Every ${m / 60} hours`;
}
function endLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}
function localInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function ReminderSheet({ a, assignments, onClose }: { a: AssignmentWithMine; assignments: ClassAssignments; onClose: () => void }) {
  const [every, setEvery] = useState(a.reminder?.everyMinutes ?? 180);
  const [ends, setEnds] = useState(() => localInput(a.reminder ? new Date(a.reminder.endsAt) : new Date(Date.now() + 2 * 86_400_000)));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setError(null);
    const endsAt = new Date(ends);
    if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= Date.now() + 60_000) return setError("Pick an end time later than now.");
    setBusy(true);
    const address = await pushAddress();
    if (!address.ok) {
      setBusy(false);
      return setError(address.error);
    }
    const result = await setAssignmentReminderAction({ assignmentId: a.id, everyMinutes: every, endsAt: endsAt.toISOString(), endpoint: address.endpoint, keys: address.keys, deviceId: deviceId() });
    setBusy(false);
    if (!result.ok) return setError(result.error);
    assignments.patch(a.id, { reminder: { everyMinutes: every, endsAt: endsAt.toISOString() }, done: false });
    setSaved(true);
    window.setTimeout(onClose, 1200);
  };
  const stop = async () => {
    setBusy(true);
    await clearAssignmentReminderAction({ assignmentId: a.id, deviceId: deviceId() });
    assignments.patch(a.id, { reminder: null });
    setBusy(false);
    onClose();
  };

  return (
    <Overlay>
      <div role="dialog" aria-modal="true" aria-label="Remind me" className="qa-pop-wrap" style={{ position: "fixed", inset: 0, zIndex: OVERLAY_Z, display: "flex", justifyContent: "center", ...hubFont }}>
        <button type="button" aria-label="Close" onClick={onClose} className="hub-fade" style={{ position: "absolute", inset: 0, border: 0, padding: 0, background: "rgba(14,13,11,.65)", cursor: "pointer" }} />
        <div className="hub-sheet qa-pop" style={{ position: "relative", width: "100%", maxWidth: 520, background: "#FFFDF8", color: INK, border: `2px solid ${BLUE}`, padding: "18px 18px 22px", overflowY: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 44, height: 44, borderRadius: 14, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}><Bell size={22} color="#fff" strokeWidth={2.4} aria-hidden /></span>
            <h2 style={{ margin: 0, flex: 1, fontSize: 22, fontWeight: 900, letterSpacing: "-.02em" }}>{saved ? "Reminder set" : "Remind me"}</h2>
            <button type="button" onClick={onClose} aria-label="Close" style={{ width: 42, height: 42, border: 0, borderRadius: 999, background: "#EDE8DC", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={19} strokeWidth={2.6} /></button>
          </div>
          <p style={{ margin: "8px 0 0", fontSize: 14, fontWeight: 700, color: "#5C564B" }}>{a.courseTitle}</p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "#5C564B" }}>Your phone gets a notification until you mark it done or the end time passes.</p>

          <div style={{ marginTop: 16, fontSize: 14, fontWeight: 900 }}>How often?</div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
            {INTERVALS.map((m) => (
              <button key={m} type="button" onClick={() => setEvery(m)} aria-pressed={every === m} className="hub-tap" style={{ minHeight: 46, borderRadius: 14, border: every === m ? 0 : "1px solid #CFC8B8", background: every === m ? BLUE : "#fff", color: every === m ? "#fff" : INK, fontFamily: "inherit", fontSize: 14, fontWeight: 800, cursor: "pointer" }}>
                {intervalLabel(m)}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginTop: 16, fontSize: 14, fontWeight: 900 }}>
            Stop reminding me on
            <input type="datetime-local" value={ends} min={localInput(new Date())} onChange={(e) => setEnds(e.target.value)} style={{ display: "block", marginTop: 8, width: "100%", boxSizing: "border-box", minHeight: 48, padding: "0 12px", borderRadius: 12, border: "1px solid #CFC8B8", background: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 700, color: INK }} />
          </label>

          {error ? <p role="alert" style={{ margin: "12px 0 0", fontSize: 14, fontWeight: 700, color: RED }}>{error}</p> : null}
          <button type="button" onClick={save} disabled={busy || saved} className="hub-tap" style={{ marginTop: 18, width: "100%", minHeight: 54, border: 0, borderRadius: 999, background: BLUE, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
            {saved ? "Saved" : busy ? "Saving…" : a.reminder ? "Update reminder" : "Start reminders"}
          </button>
          {a.reminder ? (
            <button type="button" onClick={stop} disabled={busy} style={{ marginTop: 8, width: "100%", minHeight: 46, border: 0, background: "transparent", color: RED, fontFamily: "inherit", fontSize: 15, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <BellOff size={16} strokeWidth={2.4} aria-hidden /> Stop reminders
            </button>
          ) : null}
        </div>
      </div>
    </Overlay>
  );
}

/* ─── Assignments folder (everything, not done first) ───────────────── */

export function AssignmentsView({ assignments, highlightId, onBack }: { assignments: ClassAssignments; highlightId?: string | null; onBack: () => void }) {
  const [remindFor, setRemindFor] = useState<AssignmentWithMine | null>(null);
  const open = assignments.items.filter((a) => !a.done).sort((x, y) => Number(y.urgent) - Number(x.urgent) || y.createdAt.localeCompare(x.createdAt));
  const done = assignments.items.filter((a) => a.done);
  useEffect(() => {
    if (!highlightId || !assignments.loaded) return;
    const t = window.setTimeout(() => document.getElementById(`notice-${highlightId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
    return () => window.clearTimeout(t);
  }, [highlightId, assignments.loaded]);
  return (
    <div className="hub-row">
      <button type="button" onClick={onBack} className="hub-tap" style={{ ...backButtonStyle, background: BLUE, color: "#fff" }}>
        <ArrowLeft size={20} strokeWidth={2.8} aria-hidden /> Assignments
      </button>
      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        {open.map((a) => (
          <AssignmentCard key={a.id} a={a} assignments={assignments} onRemind={() => setRemindFor(a)} highlight={a.id === highlightId} />
        ))}
        {!open.length ? (
          <div style={{ borderRadius: 22, border: "2px dashed rgba(26,24,20,.35)", padding: "26px 18px", textAlign: "center", fontSize: 15, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>
            {assignments.loaded ? (assignments.items.length ? "All done. Nice work." : "No assignments yet. When your course rep posts one, it shows here and on your phone.") : "Loading…"}
          </div>
        ) : null}
        {done.length ? (
          <>
            <div style={{ marginTop: 8, fontSize: 18, fontWeight: 900 }}>Done</div>
            {done.map((a) => (
              <AssignmentCard key={a.id} a={a} assignments={assignments} onRemind={() => setRemindFor(a)} highlight={a.id === highlightId} />
            ))}
          </>
        ) : null}
      </div>
      {remindFor ? <ReminderSheet a={remindFor} assignments={assignments} onClose={() => setRemindFor(null)} /> : null}
    </div>
  );
}

export function NoticeStyles() {
  return (
    <style>{`
.nb-bars{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.nb-bar{gap:10px !important;padding:12px !important;min-height:74px !important}
.nb-bar .nb-ico{width:40px !important;height:40px !important;border-radius:12px !important}
.nb-bar .nb-name{font-size:18px !important}
.nb-bar .nb-chev{display:none}
@media (min-width:640px){.nb-bar{gap:14px !important;padding:14px 18px !important;min-height:84px !important}.nb-bar .nb-ico{width:52px !important;height:52px !important}.nb-bar .nb-name{font-size:22px !important}.nb-bar .nb-chev{display:block}}
.nb-live{animation:nbLive 1.1s ease-in-out infinite}
@keyframes nbLive{0%,100%{box-shadow:0 0 0 0 rgba(211,47,47,.7)}50%{box-shadow:0 0 0 7px rgba(211,47,47,0)}}
.nb-glow{animation:nbGlow 2.4s ease-in-out infinite}
@keyframes nbGlow{0%,100%{box-shadow:0 0 0 0 rgba(255,255,255,.6),0 0 28px 6px rgba(255,255,255,.55)}50%{box-shadow:0 0 0 5px rgba(255,255,255,.25),0 0 50px 14px rgba(255,255,255,.85)}}
@media (prefers-reduced-motion: reduce){.nb-live,.nb-glow{animation:none}.nb-glow{box-shadow:0 0 36px 8px rgba(255,255,255,.7)}}
`}</style>
  );
}

