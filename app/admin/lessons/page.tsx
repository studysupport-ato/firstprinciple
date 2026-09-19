"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { AdminTable } from "@/components/admin/AdminTable";
import { getChapter, getChapters, getCourse, getLessons, getWeek, getWeeks } from "@/lib/content/access";
import { hasLessonOverride } from "@/lib/content/overrides";
import Link from "next/link";

export default function AdminLessonsPage() {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const rows = isHydrated
    ? getLessons().map((lesson) => {
        const hasOverrideValue = hasLessonOverride(lesson.id);
        const week = getWeek(lesson.weekId) ?? getWeeks().find((entry) => entry.sessionIds.includes(lesson.id));
        const chapter = getChapter(lesson.chapterId) ?? (week ? getChapters(week.courseId).find((entry) => week.chapterIds.includes(entry.id)) : undefined) ?? getChapters().find((entry) => entry.id === lesson.chapterId);
        const course = getCourse(lesson.courseId) ?? (week ? getCourse(week.courseId) : undefined);

        return {
          id: lesson.id,
          title: lesson.title,
          chapter: chapter?.title ?? lesson.chapterId,
          week: week ? `Week ${week.weekNumber}` : lesson.weekId,
          course: course?.title ?? lesson.courseId,
          status: hasOverrideValue ? "Local changes" : "Published",
          hasOverride: hasOverrideValue,
        };
      })
    : [];
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
