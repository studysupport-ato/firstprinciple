"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminErrorState } from "@/components/admin/AdminErrorState";
import { AdminLoadingState } from "@/components/admin/AdminLoadingState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAdminCoursesAction } from "@/lib/adminContentActions";
import type { AdminCourseListRow } from "@/lib/content/adminContract";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourseListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAdminCoursesAction();
    if (result.ok) {
      setCourses(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const rows = courses.map(({ course, weekCount }) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    status: course.status ?? "draft",
    weeks: weekCount,
  }));

  return (
    <div>
      <AdminPageHeader
        title="Courses"
        description="Manage the academic programs and introductory course architecture behind Back2Basics with Kwamina."
        actionLabel="Create course"
        actionHref="/admin/courses/new"
      />

      {loading ? <AdminLoadingState /> : null}
      {!loading && error ? <AdminErrorState title="Courses unavailable" description={error} onRetry={() => void load()} /> : null}

      {!loading && !error ? (
        <AdminTable
          columns={[
            { key: "code", label: "Code", render: (row) => <Link href={`/admin/courses/${row.id}`} className="font-medium text-[#111111] hover:text-[#2563EB]">{row.code}</Link> },
            { key: "title", label: "Course title", render: (row) => <Link href={`/admin/courses/${row.id}`} className="text-[#111111] hover:text-[#2563EB]">{row.title}</Link> },
            { key: "weeks", label: "Weeks" },
            { key: "status", label: "Status", render: (row) => <AdminStatusBadge status={row.status} /> },
          ]}
          rows={rows}
          emptyMessage="No courses yet"
          emptyDescription="Course records will appear here once an academic program is added."
        />
      ) : null}
    </div>
  );
}

