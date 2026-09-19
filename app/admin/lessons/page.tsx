import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { getLessons } from "@/lib/content/access";
import { hasLessonOverride } from "@/lib/content/overrides";
import Link from "next/link";

export default function AdminLessonsPage() {
  const rows = getLessons().map((lesson) => {
    const hasOverrideValue = hasLessonOverride(lesson.id);

    return {
      id: lesson.id,
      title: lesson.title,
      chapter: lesson.chapterId,
      week: lesson.weekId,
      status: hasOverrideValue ? "Local changes" : "Published",
      hasOverride: hasOverrideValue,
    };
  });
  return (
    <div>
      <AdminPageHeader
        title="Lessons"
        description="Review the structured teaching units powering the MATH 151 experience and manage the locally overrideable lesson content."
        actionLabel="Create lesson"
        actionHref="/admin/lessons/new"
      />

      <AdminTable
        columns={[
          {
            key: "title",
            label: "Lesson title",
            render: (row) => (
              <Link href={`/admin/lessons/${row.id}`} className="font-medium text-[#111111] transition-colors hover:text-[#2563EB]">
                {row.title}
              </Link>
            ),
          },
          { key: "chapter", label: "Chapter" },
          { key: "week", label: "Week" },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge status={row.status} />,
          },
        ]}
        rows={rows}
        emptyMessage="No lessons yet"
        emptyDescription="New lessons created for the curriculum will appear here."
      />
    </div>
  );
}
