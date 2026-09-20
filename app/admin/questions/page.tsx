"use client";

import { FileText, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { getAdminCoursesAction, getAdminQuestionsAction, deleteQuestionAction } from "@/lib/adminContentActions";
import type { Question } from "@/lib/content/adminContract";
import type { AdminCourseListRow } from "@/lib/content/adminContract";

export default function AdminQuestionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get("courseId");
  
  const [courses, setCourses] = useState<AdminCourseListRow[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState(courseIdParam ?? "");
  const [refreshKey, setRefreshKey] = useState(0);
  const [deleteQuestionId, setDeleteQuestionId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      const result = await getAdminCoursesAction();
      if (result.ok && result.data) {
        setCourses(result.data);
        if (!courseIdParam && result.data.length > 0) {
          setSelectedCourseId(result.data[0].course.id);
        }
      }
    }
    fetchCourses();
  }, [courseIdParam]);

  useEffect(() => {
    async function fetchQuestions() {
      if (!selectedCourseId) return;
      const result = await getAdminQuestionsAction(selectedCourseId);
      if (result.ok && result.data) {
        setQuestions(result.data);
      }
    }
    fetchQuestions();
  }, [selectedCourseId, refreshKey]);

  const selectedCourse = useMemo(() => courses.find((row) => row.course.id === selectedCourseId) ?? courses[0], [courses, selectedCourseId]);

  function handleDeleteQuestion(questionId: string) {
    setDeleteQuestionId(questionId);
  }

  async function confirmDeleteQuestion() {
    if (!deleteQuestionId) return;

    await deleteQuestionAction(deleteQuestionId);
    setDeleteQuestionId(null);
    setRefreshKey((value) => value + 1);
    router.refresh();
  }

  const rows = useMemo(
    () =>
      questions.map((question) => ({
        id: question.id,
        prompt: question.prompt,
        topic: question.topic,
        difficulty: question.difficulty,
        type: question.type,
        status: question.metadata?.status ?? "published",
        hasOverride: false,
      })),
    [questions],
  );

  return (
    <div>
      <AdminPageHeader
        title="Questions"
        description="Select a course, review its question bank, and author or import questions without leaving the existing structure."
      />

      <div className="mb-6 rounded-[28px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <label className="block w-full max-w-sm space-y-2 text-sm text-[#111111]">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Course</span>
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-2.5 text-sm text-[#111111] outline-none"
            >
              {courses.map((row) => (
                <option key={row.course.id} value={row.course.id}>
                  {row.course.code} · {row.course.title}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/questions/new?courseId=${selectedCourse?.course.id ?? ""}`}
              className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] hover:border-[#111111]"
            >
              <Plus size={15} />
              New question
            </Link>
            <Link
              href={`/admin/questions/import?courseId=${selectedCourse?.course.id ?? ""}`}
              className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"
            >
              <FileText size={15} />
              Import Markdown
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between rounded-[24px] border border-[#E5E5E5] bg-white p-4">
        <div>
          <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Question bank</div>
          <div className="mt-2 font-serif text-3xl text-[#111111]">{selectedCourse ? `${selectedCourse.course.code} · ${selectedCourse.course.title}` : "Course not found"}</div>
        </div>
        <div className="rounded-full bg-[#F7F7F8] px-3 py-1.5 text-sm font-medium text-[#111111]">{rows.length} questions</div>
      </div>

      <ConfirmDialog open={!!deleteQuestionId} title="Delete question" description="Delete this question from the local course bank?" confirmLabel="Delete" onConfirm={confirmDeleteQuestion} onCancel={() => setDeleteQuestionId(null)} />

      <AdminTable
        columns={[
          {
            key: "prompt",
            label: "Prompt",
            render: (row) => (
              <Link href={`/admin/questions/${row.id}`} className="font-medium text-[#111111] transition-colors hover:text-[#2563EB]">
                {row.prompt.slice(0, 80)}
              </Link>
            ),
          },
          { key: "topic", label: "Topic" },
          { key: "difficulty", label: "Difficulty" },
          { key: "type", label: "Type" },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge status={row.hasOverride ? "Local override" : row.status} />,
          },
          {
            key: "actions",
            label: "Actions",
            render: (row) => (
              <button
                type="button"
                onClick={() => handleDeleteQuestion(String(row.id))}
                className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] hover:border-[#111111] hover:text-[#E11D48]"
              >
                <Trash2 size={14} />
                Delete
              </button>
            ),
          },
        ]}
        rows={rows}
        emptyMessage="No questions yet for this course"
        emptyDescription="Create a single question or import a Markdown batch for this course."
      />
    </div>
  );
}
