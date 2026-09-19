"use client";

import { ArrowDown, ArrowLeft, ArrowUp, Check, FileText, Upload, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getCourse, getLessons, getQuestions, getWeeks, validateQuestion } from "@/lib/content/access";
import { extractPdfText, scanMarkdown, type ImportScanResult } from "@/lib/content/importer";
import { saveChapterRecord, saveCourseRecord, saveLessonRecord, saveQuestionRecord, saveWeekRecord } from "@/lib/content/overrides";

export default function AdminCourseImportPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const course = getCourse(courseId);
  const [scan, setScan] = useState<ImportScanResult | null>(null);
  const [status, setStatus] = useState<"idle" | "scanning" | "importing" | "complete">("idle");
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"everything" | "lessons" | "questions">("everything");
  const [stage, setStage] = useState<"upload" | "review" | "complete">("upload");
  const [fileInfo, setFileInfo] = useState<{ name: string; type: string; size: number } | null>(null);
  const [importedCounts, setImportedCounts] = useState({ weeks: 0, days: 0, questions: 0 });

  async function handleFile(file: File) {
    if (!course) return;
    const extension = file.name.toLowerCase().split(".").pop();
    if (!extension || !["md", "markdown", "txt", "pdf"].includes(extension)) {
      setError("Use a Markdown, text, or PDF file.");
      return;
    }

    setStatus("scanning");
    setError(null);
    setFileInfo({ name: file.name, type: extension.toUpperCase(), size: file.size });
    try {
      const text = extension === "pdf" ? await extractPdfText(file) : await file.text();
      if (!text.trim()) throw new Error("The document did not contain extractable text.");
      const result = scanMarkdown(text, file.name, course);
      result.sourceType = extension === "pdf" ? "pdf" : extension === "txt" ? "text" : "markdown";
      setScan(result);
      setStage("review");
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "Unable to scan this document.");
    } finally {
      setStatus("idle");
    }
  }

  function commitImport() {
    if (!course || !scan) return;
    setStatus("importing");
    setError(null);

    try {
      const existingWeekIds = new Set(getWeeks(course.id).map((week) => week.id));
      const existingLessonIds = new Set(getLessons(course.id).map((lesson) => lesson.id));
      const importWeeks = scan.weeks.filter((week) => !existingWeekIds.has(week.id));
      const importWeekIds = new Set(importWeeks.map((week) => week.id));
      const importLessons = scan.lessons.filter((lesson) => importWeekIds.has(lesson.weekId) && !existingLessonIds.has(lesson.id));

      if (mode !== "questions") {
        scan.chapters.filter((chapter) => importWeekIds.has(scan.weeks.find((week) => week.chapterIds.includes(chapter.id))?.id ?? "")).forEach(saveChapterRecord);
        importWeeks.forEach(saveWeekRecord);
        importLessons.forEach(saveLessonRecord);
        saveCourseRecord({ ...course, chapterIds: [...new Set([...course.chapterIds, ...importWeeks.flatMap((week) => week.chapterIds)])], weekIds: [...new Set([...course.weekIds, ...importWeeks.map((week) => week.id)])] });
      }

      let importedQuestions = 0;
      if (mode !== "lessons") {
        const existingPrompts = new Set(getQuestions({ courseId: course.id }).map((question) => question.prompt.trim().toLowerCase()));
        const eligibleLessonIds = new Set((mode === "questions" ? scan.lessons : importLessons).map((lesson) => lesson.id));
        scan.questions.filter((question) => eligibleLessonIds.has(question.lessonId)).forEach((question) => {
          const errors = validateQuestion(question);
          if (errors.length || existingPrompts.has(question.prompt.trim().toLowerCase())) return;
          saveQuestionRecord(question);
          existingPrompts.add(question.prompt.trim().toLowerCase());
          importedQuestions += 1;
        });
      }

      setImportedCounts({ weeks: mode === "questions" ? 0 : importWeeks.length, days: mode === "questions" ? 0 : importLessons.length, questions: importedQuestions });
      setStage("complete");
      setStatus("complete");
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : "Import failed before completion.");
      setStatus("idle");
    }
  }

  function moveWeek(weekId: string, direction: -1 | 1) {
    setScan((current) => {
      if (!current) return current;
      const index = current.weeks.findIndex((week) => week.id === weekId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.weeks.length) return current;
      const weeks = [...current.weeks];
      [weeks[index], weeks[nextIndex]] = [weeks[nextIndex], weeks[index]];
      return { ...current, weeks: weeks.map((week, weekIndex) => ({ ...week, weekNumber: weekIndex + 1 })) };
    });
  }

  function moveDay(weekId: string, lessonId: string, direction: -1 | 1) {
    setScan((current) => {
      if (!current) return current;
      const weekLessons = current.lessons.filter((lesson) => lesson.weekId === weekId);
      const index = weekLessons.findIndex((lesson) => lesson.id === lessonId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= weekLessons.length) return current;
      const reordered = [...weekLessons];
      [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
      const orderById = new Map(reordered.map((lesson, lessonIndex) => [lesson.id, lessonIndex + 1]));
      return { ...current, lessons: current.lessons.map((lesson) => orderById.has(lesson.id) ? { ...lesson, order: orderById.get(lesson.id) ?? lesson.order } : lesson), weeks: current.weeks.map((week) => week.id === weekId ? { ...week, sessionIds: reordered.map((lesson) => lesson.id) } : week) };
    });
  }

  if (!course) {
    return <div className="p-8 text-sm text-[#666666]">Course not found in the local content model.</div>;
  }

  const validQuestions = scan?.questions.filter((question) => validateQuestion(question).length === 0) ?? [];
  const reviewQuestions = scan?.questions.filter((question) => validateQuestion(question).length > 0) ?? [];

  return (
    <div>
      <AdminPageHeader title="Import course content" description={`Scan academic material into ${course.code} without committing anything until you review the result.`} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.code, href: `/admin/courses/${course.id}` }, { label: "Import" }]} />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#666666]">{["Upload", "Scan", "Structure", "Review", "Import"].map((label, index) => <span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${stage === "complete" || (stage === "review" && index > 0) ? "bg-[#ECFDF5] text-[#059669]" : index === 0 && stage === "upload" ? "bg-[#111111] text-white" : index <= 3 && stage === "review" ? "bg-[#111111] text-white" : "bg-[#F7F7F8] text-[#666666]"}`}>{index + 1} {label}</span>)}</div>

      <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        {fileInfo ? <div className="mb-5 flex items-center justify-between rounded-2xl bg-[#F7F7F8] px-4 py-3 text-sm"><span className="font-medium text-[#111111]">{fileInfo.name} · {fileInfo.type} · {(fileInfo.size / 1024).toFixed(1)} KB</span><button type="button" onClick={() => { setFileInfo(null); setScan(null); setStage("upload"); }} className="text-xs font-semibold uppercase tracking-[0.14em] text-[#666666] hover:text-[#111111]">Replace</button></div> : null}
        <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-[#BDBDBD] bg-[#F7F7F8] px-6 py-14 text-center hover:border-[#111111]">
          <Upload size={22} className="mb-4 text-[#111111]" />
          <span className="font-serif text-2xl text-[#111111]">Upload source material</span>
          <span className="mt-2 text-sm text-[#666666]">Markdown, plain text, or PDF. Files are processed locally in your browser.</span>
          <input type="file" accept=".md,.markdown,.txt,.pdf,text/markdown,text/plain,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleFile(file); }} className="sr-only" />
        </label>
      </section>

      {status === "scanning" ? <div className="mt-6 rounded-2xl border border-[#E5E5E5] bg-white p-5 text-sm text-[#111111]">Scanning document locally...</div> : null}
      {error ? <div className="mt-6 rounded-2xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#E11D48]">{error}</div> : null}

      {scan ? <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 flex items-start justify-between gap-4"><div><div className="field-label">Scan complete</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">{scan.sourceName}</h2></div><FileText size={20} /></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Chapters" value={scan.chapters.length} /><Metric label="Weeks" value={scan.weeks.length} /><Metric label="Lessons" value={scan.lessons.length} /><Metric label="Questions" value={scan.questions.length} /></div>
          <div className="mt-6 border-t border-[#E5E5E5] pt-5"><div className="field-label">Detected Week → Day structure</div><div className="mt-4 space-y-3">{scan.weeks.map((week, weekIndex) => <div key={week.id} className="rounded-2xl bg-[#F7F7F8] p-4"><div className="flex flex-wrap items-center gap-3"><span className="field-label">Week {week.weekNumber}</span><input value={week.title} onChange={(event) => setScan((current) => current ? { ...current, weeks: current.weeks.map((item) => item.id === week.id ? { ...item, title: event.target.value } : item) } : current)} className="admin-input min-w-[12rem] flex-1" /><button type="button" disabled={weekIndex === 0} onClick={() => moveWeek(week.id, -1)} className="text-[#666666] disabled:opacity-30" title="Move week up"><ArrowUp size={15} /></button><button type="button" disabled={weekIndex === scan.weeks.length - 1} onClick={() => moveWeek(week.id, 1)} className="text-[#666666] disabled:opacity-30" title="Move week down"><ArrowDown size={15} /></button><button type="button" onClick={() => setScan((current) => current ? { ...current, weeks: current.weeks.filter((item) => item.id !== week.id), lessons: current.lessons.filter((lesson) => lesson.weekId !== week.id), questions: current.questions.filter((question) => !current.lessons.some((lesson) => lesson.id === question.lessonId && lesson.weekId === week.id)) } : current)} className="text-xs font-semibold text-[#E11D48]">Remove week</button></div><div className="mt-3 space-y-2">{scan.lessons.filter((lesson) => lesson.weekId === week.id).sort((first, second) => first.order - second.order).map((lesson, lessonIndex, weekLessons) => <div key={lesson.id} className="flex flex-wrap items-center gap-3"><span className="field-label">Day {lesson.order}</span><input value={lesson.title} onChange={(event) => setScan((current) => current ? { ...current, lessons: current.lessons.map((item) => item.id === lesson.id ? { ...item, title: event.target.value } : item) } : current)} className="admin-input min-w-[12rem] flex-1" /><button type="button" disabled={lessonIndex === 0} onClick={() => moveDay(week.id, lesson.id, -1)} className="text-[#666666] disabled:opacity-30" title="Move day up"><ArrowUp size={15} /></button><button type="button" disabled={lessonIndex === weekLessons.length - 1} onClick={() => moveDay(week.id, lesson.id, 1)} className="text-[#666666] disabled:opacity-30" title="Move day down"><ArrowDown size={15} /></button><button type="button" onClick={() => setScan((current) => current ? { ...current, lessons: current.lessons.filter((item) => item.id !== lesson.id), weeks: current.weeks.map((item) => item.id === week.id ? { ...item, sessionIds: item.sessionIds.filter((id) => id !== lesson.id) } : item) } : current)} className="text-xs font-semibold text-[#E11D48]">Remove</button></div>)}</div></div>)}{!scan.weeks.length ? <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-5 text-sm text-[#E11D48]">No Weeks detected. Add Week headings to the source before importing.</div> : null}</div></div>
          {scan.warnings.length ? <div className="mt-6 rounded-2xl bg-[#FFF7ED] p-4 text-sm text-[#D97706]"><div className="font-semibold">Review warnings</div><ul className="mt-2 list-disc space-y-1 pl-5">{scan.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div> : null}
        </section>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="field-label">Import mode</div><div className="mt-4 space-y-2">{([["everything", "Lessons and questions"], ["lessons", "Lessons only"], ["questions", "Questions only"]] as const).map(([value, label]) => <label key={value} className="flex items-center gap-3 rounded-xl border border-[#E5E5E5] px-3 py-3 text-sm text-[#111111]"><input type="radio" checked={mode === value} onChange={() => setMode(value)} />{label}</label>)}</div></section>
          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="field-label">Question validation</div><div className="mt-4 flex items-center justify-between text-sm"><span>Ready</span><span className="font-semibold text-[#059669]">{validQuestions.length}</span></div><div className="mt-2 flex items-center justify-between text-sm"><span>Needs review</span><span className="font-semibold text-[#E11D48]">{reviewQuestions.length}</span></div></section>
          <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="field-label">Detected questions</div><div className="mt-4 max-h-64 space-y-2 overflow-y-auto">{scan.questions.map((question) => <div key={question.id} className="flex items-start gap-2 rounded-xl bg-[#F7F7F8] p-3 text-xs text-[#111111]"><span className="flex-1">{question.prompt}</span><button type="button" onClick={() => setScan((current) => current ? { ...current, questions: current.questions.filter((item) => item.id !== question.id) } : current)} className="shrink-0 text-[#E11D48]">Remove</button></div>)}{!scan.questions.length ? <div className="text-sm text-[#666666]">No questions detected.</div> : null}</div></section>
          <button type="button" disabled={status === "importing" || !scan.weeks.length} onClick={commitImport} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-50">{status === "complete" ? <Check size={15} /> : <Upload size={15} />}{status === "complete" ? "Import complete" : status === "importing" ? "Importing..." : "Import reviewed curriculum"}</button>
          {status === "complete" ? <div className="rounded-2xl bg-[#ECFDF5] p-4 text-sm text-[#047857]">Imported {importedCounts.weeks} weeks, {importedCounts.days} Days, and {importedCounts.questions} questions.</div> : null}
          {status === "complete" ? <Link href={`/admin/courses/${course.id}`} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-3 text-sm font-medium text-[#111111]"><ArrowLeft size={15} />View course workspace</Link> : null}
        </aside>
      </div> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-[#F7F7F8] p-4"><div className="field-label">{label}</div><div className="mt-2 font-serif text-3xl text-[#111111]">{value}</div></div>;
}
