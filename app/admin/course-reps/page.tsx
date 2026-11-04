"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { adminListRepApplicationsAction, adminSetRepStatusAction } from "@/lib/courseReps/actions";
import type { RepApplication } from "@/lib/courseReps/repService";

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
    </div>
  );
}
