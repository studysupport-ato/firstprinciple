"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminDriveStatusAction, adminImportCoursesAction, adminImportSourcesAction, adminListRepApplicationsAction, adminSetRepStatusAction } from "@/lib/courseReps/actions";
import type { ImportSource, RepApplication } from "@/lib/courseReps/repService";
import { listDriveFolder } from "@/lib/site/materialsHub";

function localPhone(phone: string) {
  return phone.replace(/^\+233(\d{2})(\d{3})(\d{4})$/, "0$1 $2 $3");
}

function when(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(date);
}

export default function AdminCourseRepsPage() {
  const [rows, setRows] = useState<RepApplication[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await adminListRepApplicationsAction();
    if (result.ok) {
      setRows(result.data);
      setError(null);
    } else setError(result.error);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(row: RepApplication, status: "approved" | "declined" | "revoked") {
    if (status === "revoked" && !window.confirm(`Remove ${row.fullName}'s course rep access? Their uploads stay on the site.`)) return;
    setBusy(row.id);
    const result = await adminSetRepStatusAction(row.id, status);
    setBusy(null);
    if (!result.ok) setError(result.error);
    await load();
  }

  const pending = rows?.filter((r) => r.status === "pending") ?? [];
  const approved = rows?.filter((r) => r.status === "approved") ?? [];
  const past = rows?.filter((r) => r.status === "declined" || r.status === "revoked") ?? [];

  const th = "px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#666666]";
  const td = "px-4 py-3.5 text-[14px] text-[#111111] align-middle";

  return (
    <div>
      <AdminPageHeader
        title="Course Reps"
        description="Approved reps can only add, edit and remove course materials for their own programme and year. They cannot reach lessons, the admin panel or general courses. Approving or declining sends them a text."
      />
      <TestRepCard />
      <DriveCard />
      {error ? <p className="mb-4 rounded-xl bg-[#FDECEA] px-4 py-3 text-[14px] font-semibold text-[#B3261E]">{error}</p> : null}
      {!rows && !error ? <p className="text-[14px] text-[#666666]">Loading…</p> : null}

      {rows ? (
        <>
          <h2 className="mb-3 flex items-center gap-2 text-[18px] font-bold">
            Waiting for you
            <span className="rounded-full bg-[#111111] px-2.5 py-0.5 text-[12px] font-bold text-[#E9BC3A]">{pending.length}</span>
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
            {pending.length === 0 ? (
              <p className="px-4 py-6 text-[14px] text-[#666666]">No applications waiting.</p>
            ) : (
              <table className="w-full min-w-[820px]">
                <thead className="bg-[#FAFAF8]">
                  <tr><th className={th}>Name</th><th className={th}>Programme</th><th className={th}>Year</th><th className={th}>Phone</th><th className={th}>Email</th><th className={th}>Applied</th><th className={th} /></tr>
                </thead>
                <tbody>
                  {pending.map((r) => (
                    <tr key={r.id} className="border-t border-[#F0F0F0]">
                      <td className={`${td} font-semibold`}>{r.fullName}</td>
                      <td className={td}>{r.departmentName}</td>
                      <td className={td}>Year {r.studyYear}</td>
                      <td className={td}><a href={`tel:${r.phone}`} className="underline underline-offset-2">{localPhone(r.phone)}</a></td>
                      <td className={`${td} text-[#666666]`}>{r.email ?? "—"}</td>
                      <td className={`${td} text-[#666666]`}>{when(r.createdAt)}</td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <button type="button" disabled={busy === r.id} onClick={() => decide(r, "approved")} className="mr-2 rounded-full bg-[#E9BC3A] px-4 py-2 text-[13px] font-bold text-[#111111] hover:brightness-105 disabled:opacity-50">Approve</button>
                        <button type="button" disabled={busy === r.id} onClick={() => decide(r, "declined")} className="rounded-full border border-[#111111] px-4 py-2 text-[13px] font-bold hover:bg-[#F5F5F5] disabled:opacity-50">Decline</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <h2 className="mb-3 mt-10 text-[18px] font-bold">Approved reps</h2>
          <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
            {approved.length === 0 ? (
              <p className="px-4 py-6 text-[14px] text-[#666666]">No approved reps yet.</p>
            ) : (
              <table className="w-full min-w-[720px]">
                <thead className="bg-[#FAFAF8]">
                  <tr><th className={th}>Name</th><th className={th}>Programme</th><th className={th}>Year</th><th className={th}>Phone</th><th className={th}>Uploads</th><th className={th} /></tr>
                </thead>
                <tbody>
                  {approved.map((r) => (
                    <tr key={r.id} className="border-t border-[#F0F0F0]">
                      <td className={`${td} font-semibold`}>{r.fullName}</td>
                      <td className={td}>{r.departmentName}</td>
                      <td className={td}>Year {r.studyYear}</td>
                      <td className={td}><a href={`tel:${r.phone}`} className="underline underline-offset-2">{localPhone(r.phone)}</a></td>
                      <td className={`${td} text-[#666666]`}>{r.uploads ?? 0}</td>
                      <td className={`${td} whitespace-nowrap text-right`}>
                        <a href={`/admin/course-materials/${encodeURIComponent(r.departmentId)}`} className="mr-2 rounded-full bg-[#F3F1EC] px-4 py-2 text-[13px] font-bold">See materials</a>
                        <button type="button" disabled={busy === r.id} onClick={() => decide(r, "revoked")} className="rounded-full border border-[#E8B4AF] px-4 py-2 text-[13px] font-bold text-[#B3261E] hover:bg-[#FDECEA] disabled:opacity-50">Remove access</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {past.length ? (
            <>
              <h2 className="mb-3 mt-10 text-[18px] font-bold">Declined or removed</h2>
              <div className="overflow-x-auto rounded-2xl border border-[#E5E5E5] bg-white">
                <table className="w-full min-w-[640px]">
                  <tbody>
                    {past.map((r) => (
                      <tr key={r.id} className="border-t border-[#F0F0F0] first:border-t-0">
                        <td className={`${td} font-semibold`}>{r.fullName}</td>
                        <td className={td}>{r.departmentName} · Year {r.studyYear}</td>
                        <td className={`${td} text-[#666666]`}>{r.status === "declined" ? "Declined" : "Access removed"}</td>
                        <td className={`${td} text-right`}>
                          <button type="button" disabled={busy === r.id} onClick={() => decide(r, "approved")} className="rounded-full border border-[#111111] px-4 py-2 text-[13px] font-bold hover:bg-[#F5F5F5] disabled:opacity-50">Approve instead</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      ) : null}
      <ImportSection />
    </div>
  );
}

/** A ready-made course rep account for trying the rep tools. Its programme is hidden from students. */
function TestRepCard() {
  return (
    <section style={{ marginTop: 16, borderRadius: 14, border: "2px solid #1A1814", background: "#FFFFFF", padding: "18px 20px" }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>Try it as a course rep</h2>
      <p style={{ margin: "6px 0 0", fontSize: 14, lineHeight: 1.5, color: "#555" }}>
        Sign in on the site with the test account to see the course rep panel exactly as a rep does. It manages <b>Inter Science (test)</b>, Year 1, a programme students can’t see, so nothing you add reaches them.
      </p>
      <p style={{ margin: "10px 0 0", fontSize: 14 }}>
        Email: <b>test.rep@b2bwithkwamina.com</b>
        <br />
        Password: the one Claude gave you
      </p>
      <a href="/course-rep" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", marginTop: 12, height: 40, alignItems: "center", padding: "0 16px", borderRadius: 999, background: "#1A1814", color: "#E9BC3A", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
        Open the course rep page
      </a>
      <p style={{ margin: "8px 0 0", fontSize: 12, color: "#777" }}>Use a private window, so you stay signed in to your own account here.</p>
      <a href="/admin/course-reps/student-view" style={{ display: "inline-flex", marginTop: 12, height: 40, alignItems: "center", padding: "0 16px", borderRadius: 999, background: "#1E5BC6", color: "#FFFFFF", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
        See the student view (Inter Science test)
      </a>
      <p style={{ margin: "6px 0 0", fontSize: 12, color: "#777" }}>Slides, Assignments and the notice board as students see them, with the test programme added for you only.</p>
    </section>
  );
}

function DriveCard() {
  const [status, setStatus] = useState<{ configured: boolean; connected: { email: string | null; connectedAt: string } | null } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    void adminDriveStatusAction().then((r) => r.ok && setStatus(r.data));
    const result = new URLSearchParams(window.location.search).get("drive");
    if (result === "connected") setNotice("Google Drive connected. Course reps can now upload files.");
    if (result === "failed") setNotice("Connecting Google Drive didn’t work. Try again, and make sure you tick the box that lets Back2Basics see and manage its files.");
  }, []);
  if (!status) return null;
  return (
    <div className="mb-8 flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-white p-5 md:flex-row md:items-center md:justify-between">
      <div>
        <p className="text-[15px] font-bold">Uploads to Google Drive</p>
        <p className="mt-1 text-[13px] text-[#666666]">
          {!status.configured
            ? "Not set up yet: GOOGLE_DRIVE_CLIENT_ID and GOOGLE_DRIVE_CLIENT_SECRET are missing in Vercel."
            : status.connected
              ? `Connected to ${status.connected.email ?? "a Google account"}. Reps’ files go into “Back2Basics course materials” in that Drive.`
              : "Connect the Back2Basics Google account so course reps can upload PDFs from the site."}
        </p>
        {notice ? <p className="mt-2 text-[13px] font-semibold text-[#8F6500]">{notice}</p> : null}
      </div>
      {status.configured ? (
        <a href="/api/admin/drive/connect" className="shrink-0 rounded-full bg-[#111111] px-5 py-2.5 text-center text-[13px] font-bold text-[#E9BC3A]">{status.connected ? "Reconnect" : "Connect Google Drive"}</a>
      ) : null}
    </div>
  );
}

type Candidate = { folderId: string; name: string; code: string; title: string; pick: boolean; done: boolean };

function titleCase(text: string) {
  return text.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\b(Ii|Iii|Iv)\b/g, (m) => m.toUpperCase()).replace(/\bI$/, "I");
}

function splitFolderName(name: string) {
  const clean = name.replace(/\s+/g, " ").trim();
  const match = clean.match(/^([A-Za-z]{2,5})\s?(\d{3})\s*[-:.]?\s*(.*)$/);
  if (match) return { code: `${match[1].toUpperCase()} ${match[2]}`, title: titleCase(match[3] || clean) };
  return { code: "", title: titleCase(clean) };
}

function ImportSection() {
  const [sources, setSources] = useState<ImportSource[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const result = await adminImportSourcesAction();
    if (result.ok) setSources(result.data);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  async function preview(source: ImportSource) {
    setOpen(source.materialId);
    setCandidates(null);
    setMessage(null);
    try {
      const items = await listDriveFolder(source.folderId);
      const folders = items.filter((i) => i.isFolder);
      const files = items.filter((i) => !i.isFolder).length;
      setCandidates(
        folders.map((f) => {
          const parts = splitFolderName(f.name);
          const done = source.alreadyImported.includes(f.id);
          return { folderId: f.id, name: f.name, ...parts, done, pick: !done && !/assignment|past|question|tutorial|misc|other|timetable/i.test(f.name) };
        }),
      );
      if (!folders.length) setMessage(`No course folders inside this folder${files ? ` (it has ${files} loose files)` : ""}. Nothing to import.`);
      else if (files) setMessage(`${files} loose files sit directly in this folder, outside any course folder. They aren’t imported.`);
    } catch {
      setMessage("This folder couldn’t be read. Check it is shared as “Anyone with the link”.");
      setCandidates([]);
    }
  }

  async function runImport(source: ImportSource) {
    if (!candidates) return;
    const chosen = candidates.filter((c) => c.pick && !c.done && c.title.trim());
    if (!chosen.length) return;
    setBusy(true);
    const result = await adminImportCoursesAction(source.materialId, chosen.map((c) => ({ folderId: c.folderId, code: c.code, title: c.title })));
    setBusy(false);
    if (result.ok) {
      setMessage(`Imported ${result.data} ${result.data === 1 ? "course" : "courses"}. They now show under “Your courses” for ${source.departmentName}, and its course rep can manage them.`);
      setCandidates(null);
      await load();
    } else setMessage(result.error);
  }

  if (!sources) return null;
  return (
    <section className="mt-12">
      <h2 className="text-[18px] font-bold">Turn existing slide folders into courses</h2>
      <p className="mt-1 max-w-[760px] text-[13px] text-[#666666]">Each programme’s slides folder usually has one folder per course inside. Importing creates one course per folder, linked to its files, under the programme’s year and semester. Untick anything that isn’t a course.</p>
      <div className="mt-4 overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
        {sources.map((source) => (
          <div key={source.materialId} className="border-t border-[#F0F0F0] first:border-t-0">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold">{source.departmentName}</p>
                <p className="text-[12px] text-[#666666]">{source.title} · Year {source.studyYear} · Semester {source.semester}{source.alreadyImported.length ? ` · ${source.alreadyImported.length} imported` : ""}</p>
              </div>
              <button type="button" onClick={() => (open === source.materialId ? setOpen(null) : preview(source))} className="rounded-full border border-[#111111] px-4 py-2 text-[13px] font-bold">{open === source.materialId ? "Close" : "Preview courses"}</button>
            </div>
            {open === source.materialId ? (
              <div className="bg-[#FAFAF8] px-4 pb-4 pt-2">
                {!candidates && !message ? <p className="text-[13px] text-[#666666]">Reading the folder…</p> : null}
                {message ? <p className="mb-3 text-[13px] font-semibold text-[#8F6500]">{message}</p> : null}
                {candidates?.length ? (
                  <>
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#666666]"><th className="w-10 py-2" /><th className="py-2">Folder</th><th className="py-2">Code</th><th className="py-2">Course name</th></tr>
                      </thead>
                      <tbody>
                        {candidates.map((c, i) => (
                          <tr key={c.folderId} className="border-t border-[#EEEEEE]">
                            <td className="py-2"><input type="checkbox" aria-label={`Import ${c.name}`} disabled={c.done} checked={c.pick && !c.done} onChange={(e) => setCandidates((prev) => prev && prev.map((x, j) => (j === i ? { ...x, pick: e.target.checked } : x)))} /></td>
                            <td className="py-2 pr-3 text-[13px] text-[#666666]">{c.name}{c.done ? " · already imported" : ""}</td>
                            <td className="py-2 pr-3"><input value={c.code} disabled={c.done} onChange={(e) => setCandidates((prev) => prev && prev.map((x, j) => (j === i ? { ...x, code: e.target.value } : x)))} className="w-28 rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-[13px]" placeholder="e.g. ME 195" /></td>
                            <td className="py-2"><input value={c.title} disabled={c.done} onChange={(e) => setCandidates((prev) => prev && prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} className="w-full rounded-lg border border-[#E5E5E5] px-2 py-1.5 text-[13px]" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button type="button" disabled={busy} onClick={() => runImport(source)} className="mt-4 rounded-full bg-[#E9BC3A] px-5 py-2.5 text-[13px] font-bold disabled:opacity-50">{busy ? "Importing…" : `Import ${candidates.filter((c) => c.pick && !c.done).length} courses`}</button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
