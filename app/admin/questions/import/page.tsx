"use client";

import { ArrowLeft, Check, FileUp, Save, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAdminCoursesAction, createQuestionAction } from "@/lib/adminContentActions";
import { parseMarkdownQuestionBatch } from "@/lib/questions/parser";
import type { AdminCourseListRow } from "@/lib/content/adminContract";

export default function AdminQuestionImportPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<AdminCourseListRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [result, setResult] = useState<ReturnType<typeof parseMarkdownQuestionBatch> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCourses() {
      const res = await getAdminCoursesAction();
      if (res.ok && res.data) {
        setCourses(res.data);
        if (res.data.length > 0) {
          setSelectedCourseId(res.data[0].course.id);
        }
      }
    }
    fetchCourses();
  }, []);

  const selectedCourse = useMemo(() => courses.find((row) => row.course.id === selectedCourseId) ?? courses[0], [courses, selectedCourseId]);

  function parseInput() {
    if (!selectedCourseId) {
      setError("Select a course before importing questions.");
      return;
    }

    setError(null);
    const batch = parseMarkdownQuestionBatch(markdown, selectedCourseId);
    setResult(batch);
  }

  async function importQuestions() {
    if (!result || !selectedCourseId) {
      setError("No valid import batch is ready.");
      return;
    }

    const valid = result.validQuestions;
    if (!valid.length) {
      setError("No valid questions are ready to import.");
      return;
    }

    try {
      await Promise.all(valid.map((question) => createQuestionAction(question)));
      router.push(`/admin/questions?courseId=${selectedCourseId}`);
    } catch (e: any) {
      setError("Failed to import: " + e.message);
    }
  }

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".md") && !file.name.toLowerCase().endsWith(".markdown") && !file.name.toLowerCase().endsWith(".txt")) {
      setError("Upload a Markdown or text file.");
      return;
    }

    const text = await file.text();
    setMarkdown(text);
    setError(null);
  }

  return (
    <div>
      <AdminPageHeader
        title="Import Markdown questions"
        description="Parse Markdown into the canonical question model and review the import before it is saved."
        breadcrumbs={[{ label: "Admin", href: "/admin" }, { label: "Questions", href: "/admin/questions" }, { label: "Import" }]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href="/admin/questions" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111] hover:border-[#111111]">
          <ArrowLeft size={15} />
          Back to bank
        </Link>
      </div>

      <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <label className="space-y-2 text-sm text-[#111111]">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Course</span>
            <select value={selectedCourseId} onChange={(event) => setSelectedCourseId(event.target.value)} className="admin-input w-full">
              {courses.map((row) => (
                <option key={row.course.id} value={row.course.id}>
                  {row.course.code} · {row.course.title}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm text-[#111111]">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Import source</span>
            <div className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] p-3">
              <FileUp size={16} className="text-[#111111]" />
              <input type="file" accept=".md,.markdown,.txt" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }} className="w-full text-sm text-[#111111] file:mr-3 file:rounded-full file:border-0 file:bg-[#111111] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white" />
            </div>
          </label>
        </div>

        <label className="mt-6 block space-y-2 text-sm text-[#111111]">
          <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Markdown</span>
          <textarea
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            rows={18}
            className="w-full rounded-[22px] border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 text-sm text-[#111111] outline-none"
            placeholder={'# MATH 151\n\n## Question 1\n\n**Type:** multiple-choice\n**Difficulty:** medium\n**Topic:** Real Number Theory\n**Subtopic:** Mathematical Induction\n**Marks:** 2\n\n### Question\nWhich statement is true for all positive integers n?\n\n### Options\n- A. 2n is always odd\n- B. n² + n is always even\n- C. n² is always even\n- D. n + 1 is always odd\n\n### Answer\nB\n\n### Explanation\nSince n and n + 1 are consecutive integers, one must be even.'}
          />
        </label>

        {error ? <div className="mt-5 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#E11D48]">{error}</div> : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={parseInput} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">
            <Upload size={15} />
            Parse questions
          </button>
          <button type="button" onClick={importQuestions} disabled={!result || !result.validQuestions.length} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-5 py-2.5 text-sm font-medium text-[#111111] hover:border-[#111111] disabled:cursor-not-allowed disabled:opacity-40">
            <Save size={15} />
            Import to {selectedCourse?.course.code ?? "course"}
          </button>
        </div>
      </section>

      {result ? (
        <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Import preview</div>
            <span className="rounded-full bg-[#ECFDF5] px-3 py-1 text-xs font-semibold text-[#047857]">{result.validQuestions.length} valid</span>
            <span className="rounded-full bg-[#FFF7ED] px-3 py-1 text-xs font-semibold text-[#C2410C]">{result.warnings.length} warnings</span>
            <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-semibold text-[#B91C1C]">{result.errors.length} errors</span>
          </div>

          {result.errors.length ? (
            <div className="mb-6 rounded-2xl bg-[#FEF2F2] p-4 text-sm text-[#B91C1C]">
              <div className="font-semibold">Issues to fix before import</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.errors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {result.warnings.length ? (
            <div className="mb-6 rounded-2xl bg-[#FFF7ED] p-4 text-sm text-[#9A5B00]">
              <div className="font-semibold">Warnings</div>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-4">
            {result.questions.map((question, index) => (
              <article key={`${question.id}-${index}`} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Question {index + 1}</div>
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#047857]">
                    <Check size={14} />
                    Ready to import
                  </div>
                </div>

                <div className="font-medium text-[#111111]">{question.prompt}</div>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.14em] text-[#666666]">
                  <span>{question.type}</span>
                  <span>·</span>
                  <span>{question.difficulty}</span>
                  <span>·</span>
                  <span>{question.topic}</span>
                  <span>·</span>
                  <span>{question.marks} marks</span>
                </div>
                {question.options?.length ? (
                  <div className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <div key={option.id} className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]">
                        {option.label}. {option.text}
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="mt-3 rounded-xl border border-[#E5E5E5] bg-white px-3 py-2 text-sm text-[#111111]">
                  Answer: {String(question.correctAnswer)}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
