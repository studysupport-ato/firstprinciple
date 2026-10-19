"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminStudentDirectoryAction } from "@/lib/student/adminDirectoryActions";
import type { StudentDirectoryPage } from "@/lib/student/adminDirectory";

const PAGE_SIZE = 25;

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

export default function AdminStudentsPage() {
  const [directory, setDirectory] = useState<StudentDirectoryPage | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const timeout = setTimeout(() => {
      setLoading(true);
      void getAdminStudentDirectoryAction(page, PAGE_SIZE, search)
        .then((result) => {
          if (!active) return;
          if (result.ok) {
            setDirectory(result.data);
            setPage(result.data.page);
            setError(null);
          } else {
            setError(result.error);
          }
        })
        .catch((loadError: unknown) => {
          if (!active) return;
          setError(loadError instanceof Error ? loadError.message : "The student directory could not be loaded.");
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }, 250);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [page, reloadKey, search]);

  const students = directory?.students ?? [];
  const totalCount = directory?.totalCount ?? 0;
  const totalPages = directory?.totalPages ?? 0;
  const rangeStart = totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, totalCount);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Students"
        description="Registered student accounts and their available contact details."
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative block w-full max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-[#666666]">
            <Search size={16} aria-hidden="true" />
          </span>
          <span className="sr-only">Search students</span>
          <input
            type="search"
            placeholder="Search name, email, or phone..."
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="w-full rounded-xl border border-[#E5E5E5] bg-white py-2 pl-10 pr-4 text-sm transition-colors focus:border-[#111111] focus:outline-none"
          />
        </label>

        <p aria-live="polite" className="text-sm text-[#666666]">
          {loading ? "Loading students..." : `${rangeStart}–${rangeEnd} of ${totalCount} students`}
        </p>
      </div>

      {error ? (
        <div role="alert" className="rounded-2xl border border-[#F1C7C1] bg-[#FFF7F5] p-5 text-sm text-[#8C2D1C]">
          <p className="font-semibold">Student directory could not be loaded.</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="mt-3 font-semibold underline underline-offset-4"
          >
            Retry
          </button>
        </div>
      ) : loading ? (
        <div role="status" className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center text-sm text-[#666666]">
          Loading students...
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-8 text-center shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <h3 className="font-serif text-3xl text-[#111111]">
            {search.trim() ? "No matching students" : "No registered students"}
          </h3>
          <p className="mt-3 text-sm text-[#666666]">
            {search.trim()
              ? "Try another name, email address, or phone number."
              : "Student accounts will appear here after they register."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-[#E5E5E5] bg-white shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-[#F7F7F8]">
                <tr>
                  {["Name", "Email", "Phone", "Profile", "Joined"].map((heading) => (
                    <th key={heading} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.studentId} className="align-top">
                    <td className="border-t border-[#E5E5E5] px-4 py-4">
                      <Link href={`/admin/students/${encodeURIComponent(student.studentId)}`} className="font-medium text-[#2563EB] hover:underline">
                        {student.fullName || "Name unavailable"}
                      </Link>
                      <p className="mt-1 max-w-52 truncate font-mono text-[10px] text-[#777777]" title={student.studentId}>
                        {student.studentId}
                      </p>
                    </td>
                    <td className="border-t border-[#E5E5E5] px-4 py-4 text-sm">
                      {student.email ? (
                        <a href={`mailto:${student.email}`} className="break-all text-[#2563EB] hover:underline">{student.email}</a>
                      ) : (
                        <span className="italic text-[#999999]">Not provided</span>
                      )}
                    </td>
                    <td className="border-t border-[#E5E5E5] px-4 py-4 text-sm">
                      {student.phoneNumber || <span className="italic text-[#999999]">Not provided</span>}
                    </td>
                    <td className="border-t border-[#E5E5E5] px-4 py-4">
                      <AdminStatusBadge
                        status={student.profileCompleted ? "published" : "draft"}
                        label={student.profileCompleted ? "Complete" : "Incomplete"}
                      />
                    </td>
                    <td className="whitespace-nowrap border-t border-[#E5E5E5] px-4 py-4 text-sm text-[#666666]">
                      {formatDate(student.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {totalPages > 1 ? (
        <nav aria-label="Student directory pages" className="flex items-center justify-between gap-4">
          <button
            type="button"
            disabled={loading || page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            className="min-h-10 rounded-xl border border-[#E5E5E5] bg-white px-4 text-sm font-semibold text-[#111111] hover:bg-[#F7F7F8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-[#666666]">Page {directory?.page ?? page} of {totalPages}</span>
          <button
            type="button"
            disabled={loading || page >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            className="min-h-10 rounded-xl border border-[#E5E5E5] bg-white px-4 text-sm font-semibold text-[#111111] hover:bg-[#F7F7F8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </nav>
      ) : null}
    </div>
  );
}
