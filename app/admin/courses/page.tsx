"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getCourses } from "@/lib/content/access";

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState(() => getCourses());

  useEffect(() => {
    setCourses(getCourses());
  }, []);

  const rows = courses.map((course) => ({
    id: course.id,
    code: course.code,
    title: course.title,
    status: "Published",
    weeks: course.weekIds.length,
  }));
  return (
    <div>
      <AdminPageHeader
        title="Courses"
        description="Manage the academic programs and introductory course architecture behind Back2Basics with Kwamina."
        actionLabel="Create course"
        actionHref="/admin/courses/new"
      />

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
    </div>
  );
}
