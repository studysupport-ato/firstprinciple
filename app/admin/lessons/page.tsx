"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { getAdminDaysAction } from "@/lib/adminContentActions";
import type { AdminDayListRow } from "@/lib/content/adminContract";
import Link from "next/link";

export default function AdminLessonsPage() {
  const [rows, setRows] = useState<AdminDayListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const result = await getAdminDaysAction();
        if (result.ok) {
          setRows(result.data);
        } else {
          setError(result.error);
        }
      } catch (e) {
        setError("An error occurred");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  return (
    <div>
      <AdminPageHeader
        title="Lessons"
        description="Review the structured teaching units powering the MATH 151 experience and manage the locally overrideable lesson content."
        actionLabel="Create lesson"
        actionHref="/admin/lessons/new"
      />

      {loading && <div className="mt-8 text-center text-sm text-[#666666]">Loading lessons...</div>}
      {error && <div className="mt-8 text-center text-sm text-red-500">{error}</div>}
      {!loading && !error && (
        <AdminTable
          columns={[
            {
              key: "title",
              label: "Lesson title",
              render: (row) => (
                <Link href={`/admin/lessons/${row.day.id}`} className="font-medium text-[#111111] transition-colors hover:text-[#2563EB]">
                  {row.day.title}
                </Link>
              ),
            },
            { key: "chapter", label: "Chapter", render: (row) => row.chapterTitle },
            { key: "week", label: "Week", render: (row) => row.week ? `Week ${row.week.weekNumber}` : row.day.weekId },
            {
              key: "status",
              label: "Status",
              render: (row) => <AdminStatusBadge status={row.day.status ?? "draft"} />,
            },
          ]}
          rows={rows}
          emptyMessage="No lessons yet"
          emptyDescription="New lessons created for the curriculum will appear here."
        />
      )}
    </div>
  );
}
