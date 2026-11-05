"use client";

import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { AlertTriangle, Camera, FileText, ImagePlus, Paperclip, Plus, Trash2, X } from "lucide-react";
import { repAssignmentsAction, repPostAssignmentAction, repRemoveAssignmentAction, repSetAssignmentUrgentAction, repStartAssignmentUploadAction } from "@/lib/courseReps/assignmentActions";
import type { Assignment } from "@/lib/courseReps/assignments";
import type { CourseMaterialEntry } from "@/lib/courseMaterials";
import { formatBytes, timeAgo } from "@/lib/site/materialsHub";
import { INK, MUTED, SOFT, Sheet } from "@/components/materials-hub/ui";

const BLUE = "#1E5BC6";
const RED = "#D32F2F";
const field: CSSProperties = { display: "block", fontSize: 14, fontWeight: 700, color: INK, marginBottom: 6 };
const box: CSSProperties = { width: "100%", boxSizing: "border-box", borderRadius: 14, border: "1.5px solid transparent", background: SOFT, padding: "0 14px", fontFamily: "inherit", fontSize: 16, fontWeight: 600, color: INK, outline: "none" };

function putToDrive(url: string, file: File, onProgress: (f: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
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

export function RepAssignments({ courses, semester }: { courses: CourseMaterialEntry[]; semester: 1 | 2 }) {
  const [list, setList] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const load = useCallback(async () => {
    const result = await repAssignmentsAction();
    if (result.ok) setList(result.data);
    else setError(result.error);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function toggleUrgent(a: Assignment) {
    setList((cur) => cur?.map((x) => (x.id === a.id ? { ...x, urgent: !a.urgent } : x)) ?? cur);
    const result = await repSetAssignmentUrgentAction(a.id, !a.urgent);
    if (!result.ok) {
      window.alert(result.error);
      await load();
    }
  }
  async function remove(a: Assignment) {
    if (!window.confirm(`Remove this ${a.courseTitle} assignment? Students will no longer see it.`)) return;
    const result = await repRemoveAssignmentAction(a.id);
    if (!result.ok) window.alert(result.error);
    await load();
  }

  return (
    <div>
      <button type="button" onClick={() => setPosting(true)} className="hub-tap" style={{ marginTop: 12, width: "100%", minHeight: 54, border: 0, borderRadius: 999, background: BLUE, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Plus size={19} strokeWidth={2.8} /> Post an assignment
      </button>
      {error ? <p role="alert" style={{ fontWeight: 700, color: "#B3261E" }}>{error}</p> : null}
      <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {list === null ? <p style={{ fontWeight: 700 }}>Loading assignments…</p> : null}
        {list?.length === 0 ? (
          <div style={{ borderRadius: 24, border: "2px dashed rgba(26,24,20,.35)", padding: "26px 18px", textAlign: "center", fontSize: 14, fontWeight: 700, color: "rgba(26,24,20,.7)" }}>
            Nothing posted yet. Your class gets a phone notification every time you post.
          </div>
        ) : null}
        {list?.map((a) => (
          <div key={a.id} style={{ borderRadius: 20, padding: 14, background: a.urgent ? "#fff" : BLUE, color: a.urgent ? INK : "#fff", border: a.urgent ? `2px solid ${RED}` : 0 }}>
            {a.urgent ? <span style={{ display: "inline-flex", height: 24, padding: "0 10px", borderRadius: 999, background: RED, color: "#fff", fontSize: 11, fontWeight: 900, letterSpacing: ".08em", alignItems: "center" }}>URGENT, PINNED TO THE TOP</span> : null}
            <div style={{ marginTop: a.urgent ? 6 : 0, fontSize: 17, fontWeight: 900 }}>{a.courseTitle}</div>
            {a.body ? <p style={{ margin: "4px 0 0", fontSize: 14, lineHeight: 1.45, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{a.body}</p> : null}
            {a.fileId ? (
              <a href={`https://drive.google.com/file/d/${a.fileId}/view`} target="_blank" rel="noopener noreferrer" style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: "inherit" }}>
                <Paperclip size={14} /> {a.fileKind === "pdf" ? "PDF" : "Picture"} attached
              </a>
            ) : null}
            <div style={{ marginTop: 6, fontSize: 12, fontWeight: 600, opacity: 0.8 }}>Posted {timeAgo(a.createdAt)}</div>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => toggleUrgent(a)} style={{ height: 38, padding: "0 14px", borderRadius: 999, border: `2px solid ${a.urgent ? INK : "rgba(255,255,255,.7)"}`, background: "transparent", color: "inherit", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <AlertTriangle size={14} /> {a.urgent ? "Not urgent any more" : "Mark as urgent"}
              </button>
              <button type="button" onClick={() => remove(a)} style={{ height: 38, padding: "0 14px", borderRadius: 999, border: 0, background: a.urgent ? "#FDECEA" : "rgba(255,255,255,.18)", color: a.urgent ? RED : "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Trash2 size={14} /> Remove
              </button>
            </div>
          </div>
        ))}
      </div>
      <PostSheet open={posting} courses={courses} semester={semester} onClose={() => setPosting(false)} onPosted={load} />
    </div>
  );
}

function PostSheet({ open, courses, semester, onClose, onPosted }: { open: boolean; courses: CourseMaterialEntry[]; semester: 1 | 2; onClose: () => void; onPosted: () => Promise<void> }) {
  const sorted = [...courses].sort((a, b) => Number((b.semester ?? 1) === semester) - Number((a.semester ?? 1) === semester));
  const [courseId, setCourseId] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [urgent, setUrgent] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setCourseId(sorted[0]?.id ?? "");
    setBody("");
    setFile(null);
    setUrgent(false);
    setProgress(null);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (!file || !file.type.startsWith("image/")) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(list: FileList | null) {
    const f = list?.[0];
    if (!f) return;
    if (!(f.type === "application/pdf" || f.type.startsWith("image/"))) return setError("Choose a picture or a PDF.");
    if (f.size > 100 * 1024 * 1024) return setError("Files can be up to 100 MB.");
    setError(null);
    setFile(f);
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!courseId) return setError("Pick the course.");
    if (!body.trim() && !file) return setError("Type the assignment or add a picture or PDF.");
    setBusy(true);
    setError(null);
    try {
      let fileId: string | undefined;
      if (file) {
        const started = await repStartAssignmentUploadAction({ courseId, fileName: file.name || "Assignment.jpg", fileType: file.type || "image/jpeg", size: file.size });
        if (!started.ok) throw new Error(started.error);
        setProgress(0);
        fileId = await putToDrive(started.data.uploadUrl, file, setProgress);
      }
      const result = await repPostAssignmentAction({ courseId, body, fileId, urgent });
      if (!result.ok) throw new Error(result.error);
      await onPosted();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setProgress(null);
    } finally {
      setBusy(false);
    }
  }

  const pick: CSSProperties = { flex: 1, minHeight: 64, borderRadius: 14, border: `2px dashed ${BLUE}`, color: BLUE, background: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, fontSize: 13, fontWeight: 800, cursor: "pointer" };
  return (
    <Sheet open={open} onClose={busy ? undefined : onClose} label="Post an assignment">
      <form onSubmit={post} style={{ padding: "16px 22px 24px", overflowY: "auto" }}>
        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Post an assignment</h2>
        <p style={{ margin: "2px 0 0", fontSize: 13, fontWeight: 600, color: MUTED }}>Your class gets a phone notification straight away.</p>

        <label style={{ ...field, marginTop: 14 }} htmlFor="as-course">Course</label>
        <select id="as-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} style={{ ...box, height: 48 }} required>
          {!sorted.length ? <option value="">Add a course first</option> : null}
          {sorted.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode ? `${c.courseCode} ` : ""}
              {c.courseTitle}
            </option>
          ))}
        </select>

        <label style={{ ...field, marginTop: 12 }} htmlFor="as-body">Type the assignment</label>
        <textarea id="as-body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={4000} placeholder="e.g. Answer questions 1 to 6 from tutorial sheet 2. Submit on Friday." style={{ ...box, padding: 12, lineHeight: 1.45, resize: "vertical" }} />

        <span style={{ ...field, marginTop: 12 }}>Or add it as a picture or PDF</span>
        {file ? (
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 10, borderRadius: 14, background: "#fff", border: "1px solid #E2DCCB" }}>
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 10 }} />
            ) : (
              <span style={{ width: 54, height: 54, borderRadius: 10, background: BLUE, display: "flex", alignItems: "center", justifyContent: "center" }}><FileText size={22} color="#fff" /></span>
            )}
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name || "Photo"}</span>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: MUTED }}>{formatBytes(file.size)}</span>
            </span>
            <button type="button" aria-label="Remove file" onClick={() => setFile(null)} style={{ width: 36, height: 36, borderRadius: 999, border: 0, background: SOFT, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <label style={pick}><Camera size={20} /> Take photo<input type="file" accept="image/*" capture="environment" onChange={(e) => { choose(e.target.files); e.target.value = ""; }} style={{ display: "none" }} /></label>
            <label style={pick}><ImagePlus size={20} /> Picture<input type="file" accept="image/*" onChange={(e) => { choose(e.target.files); e.target.value = ""; }} style={{ display: "none" }} /></label>
            <label style={pick}><FileText size={20} /> PDF<input type="file" accept="application/pdf,.pdf" onChange={(e) => { choose(e.target.files); e.target.value = ""; }} style={{ display: "none" }} /></label>
          </div>
        )}

        <label style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 14, background: urgent ? "#FDECEA" : SOFT, border: urgent ? `2px solid ${RED}` : "2px solid transparent", cursor: "pointer" }}>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} style={{ width: 22, height: 22, accentColor: RED }} />
          <span>
            <span style={{ display: "block", fontSize: 15, fontWeight: 900, color: urgent ? RED : INK }}>Mark as urgent</span>
            <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: MUTED }}>Pinned at the top of the notice board, glowing.</span>
          </span>
        </label>

        {progress !== null ? <p style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700 }}>Uploading {Math.round(progress * 100)}%</p> : null}
        {error ? <p role="alert" style={{ margin: "10px 0 0", fontSize: 13, fontWeight: 700, color: "#B3261E" }}>{error}</p> : null}
        <button type="submit" disabled={busy || !sorted.length} style={{ marginTop: 16, width: "100%", minHeight: 54, border: 0, borderRadius: 999, background: BLUE, color: "#fff", fontFamily: "inherit", fontSize: 16, fontWeight: 900, cursor: "pointer", opacity: busy ? 0.7 : 1 }}>
          {busy ? "Posting…" : "Post"}
        </button>
      </form>
    </Sheet>
  );
}
