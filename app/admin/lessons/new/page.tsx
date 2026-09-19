"use client";

import { ArrowLeft, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createDefaultBlock, saveChapterRecord, saveCourseRecord, saveLessonRecord, saveWeekRecord } from "@/lib/content/overrides";
import { getChapters, getCourse, getCourses, getLesson, getLessons, getWeek, getWeeks } from "@/lib/content/access";
import type { ContentBlock, Lesson } from "@/lib/content/types";
import { createStableId } from "@/lib/ids";

const blockTypes: ContentBlock["type"][] = ["heading", "text", "markdown", "math", "worked-example", "callout", "question"];

export default function AdminNewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultCourseId = searchParams.get("courseId") ?? getCourses()[0]?.id ?? "";
  const [courseId, setCourseId] = useState(defaultCourseId);
  const [chapterId, setChapterId] = useState(searchParams.get("chapterId") ?? "");
  const [chapterName, setChapterName] = useState("");
  const [weekId, setWeekId] = useState(searchParams.get("weekId") ?? "");
  const [weekName, setWeekName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);

  const course = getCourse(courseId);
  const chapters = getChapters(courseId);
  const weeks = getWeeks(courseId, chapterId || undefined);

  const chapterMatch = chapters.find((item) => item.id === chapterId || item.title.trim().toLowerCase() === chapterName.trim().toLowerCase());
  const weekMatch = weeks.find((item) => item.id === weekId || item.title.trim().toLowerCase() === weekName.trim().toLowerCase());

  useEffect(() => {
    if (!courseId) {
      const firstCourse = getCourses()[0];
      if (firstCourse) {
        setCourseId(firstCourse.id);
      }
      setChapterId("");
      setChapterName("");
      setWeekId("");
      setWeekName("");
      return;
    }

    if (!chapterId && !chapterName.trim()) {
      const nextChapter = chapters[0];
      setChapterId(nextChapter?.id ?? "");
      setChapterName(nextChapter?.title ?? "");
      return;
    }

    if (chapterId && !chapters.some((item) => item.id === chapterId)) {
      setChapterId("");
      return;
    }

    const nextChapter = chapters.find((item) => item.id === chapterId);
    if (nextChapter && nextChapter.title !== chapterName) {
      setChapterName(nextChapter.title);
    }
  }, [chapterId, chapterName, chapters, courseId]);

  useEffect(() => {
    if (!courseId) return;

    const nextWeeks = getWeeks(courseId, chapterId || undefined);
    if (!weekId && !weekName.trim()) {
      const nextWeek = nextWeeks[0];
      setWeekId(nextWeek?.id ?? "");
      setWeekName(nextWeek?.title ?? "");
      return;
    }

    if (weekId && !nextWeeks.some((item) => item.id === weekId)) {
      setWeekId("");
      return;
    }

    const nextWeek = nextWeeks.find((item) => item.id === weekId);
    if (nextWeek && nextWeek.title !== weekName) {
      setWeekName(nextWeek.title);
    }
  }, [chapterId, courseId, weekId, weekName]);

  function addBlock(type: ContentBlock["type"]) {
    setBlocks((current) => [...current, createDefaultBlock(type, current.length + 1)]);
  }

  function updateBlock(blockId: string, patch: Partial<ContentBlock>) {
    setBlocks((current) => current.map((block) => (block.id === blockId ? ({ ...block, ...patch } as ContentBlock) : block)));
  }

  function saveLesson() {
    if (!course) {
      setError("Select a course before creating a lesson.");
      return;
    }

    const trimmedChapterName = chapterName.trim();
    const trimmedWeekName = weekName.trim();

    if (!trimmedChapterName) {
      setError("Type a chapter name before creating a day.");
      return;
    }

    if (!trimmedWeekName) {
      setError("Type a week name before creating a day.");
      return;
    }

    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    let resolvedChapterId = chapterMatch?.id ?? chapterId;
    if (!resolvedChapterId || !chapters.some((item) => item.id === resolvedChapterId)) {
      resolvedChapterId = createStableId(course.id, trimmedChapterName);
      saveChapterRecord({
        id: resolvedChapterId,
        courseId: course.id,
        title: trimmedChapterName,
        description: `${trimmedChapterName} in ${course.title}.`,
        order: chapters.length + 1,
      });
      saveCourseRecord({ ...course, chapterIds: [...new Set([...course.chapterIds, resolvedChapterId])] });
      setChapterId(resolvedChapterId);
    }

    let resolvedWeekId = weekMatch?.id ?? weekId;
    if (!resolvedWeekId || !weeks.some((item) => item.id === resolvedWeekId)) {
      resolvedWeekId = createStableId(course.id, trimmedWeekName);
      const nextWeek = {
        id: resolvedWeekId,
        courseId: course.id,
        chapterIds: [resolvedChapterId],
        title: trimmedWeekName,
        description: `${trimmedWeekName} for ${course.title}.`,
        weekNumber: Math.max(1, ...getWeeks(course.id).map((item) => item.weekNumber)) + 1,
        sessionIds: [],
      };
      saveWeekRecord(nextWeek);
      saveCourseRecord({ ...course, weekIds: [...new Set([...course.weekIds, resolvedWeekId])] });
      setWeekId(resolvedWeekId);
    }

    const existingLessonOrders = getLessons(course.id, resolvedChapterId, resolvedWeekId).map((item) => item.order ?? 0);
    const id = createStableId(course.id, title);
    const lesson: Lesson = {
      id,
      courseId: course.id,
      chapterId: resolvedChapterId,
      weekId: resolvedWeekId,
      title: title.trim(),
      description: description.trim(),
      order: Math.max(1, ...existingLessonOrders) + 1,
      estimatedMinutes: 20,
      objectives: [],
      blocks,
    };

    saveLessonRecord(lesson);
    const week = getWeek(resolvedWeekId);
    if (week && !week.sessionIds.includes(lesson.id)) {
      saveWeekRecord({ ...week, sessionIds: [...week.sessionIds, lesson.id] });
    }
    router.push(`/admin/lessons/${lesson.id}`);
  }

  return (
    <div>
      <AdminPageHeader title="Create lesson" description="Create a lesson using the same content blocks rendered by the student experience." breadcrumbs={[{ label: "Lessons", href: "/admin/lessons" }, { label: "New lesson" }]} />
      <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2"><span className="field-label">Course</span><select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="admin-input">{getCourses().map((item) => <option key={item.id} value={item.id}>{item.code} · {item.title}</option>)}</select></label>
            <label className="space-y-2"><span className="field-label">Chapter</span><input value={chapterName} onChange={(event) => { const next = event.target.value; setChapterName(next); const matchingChapter = chapters.find((item) => item.title.trim().toLowerCase() === next.trim().toLowerCase()); setChapterId(matchingChapter?.id ?? ""); }} className="admin-input" placeholder="Type a chapter name" /></label>
            <label className="space-y-2"><span className="field-label">Week</span><input value={weekName} onChange={(event) => { const next = event.target.value; setWeekName(next); const matchingWeek = weeks.find((item) => item.title.trim().toLowerCase() === next.trim().toLowerCase()); setWeekId(matchingWeek?.id ?? ""); }} className="admin-input" placeholder="Type a week name" /></label>
          </div>
          <label className="space-y-2"><span className="field-label">Lesson title</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input" placeholder="Lesson title" /></label>
          <label className="space-y-2"><span className="field-label">Description</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="admin-input" placeholder="What will students learn?" /></label>

          <div className="border-t border-[#E5E5E5] pt-5">
            <div className="space-y-3">
              {blocks.map((block) => <BlockEditor key={block.id} block={block} onChange={(patch) => updateBlock(block.id, patch)} onRemove={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} />)}
              {!blocks.length ? <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-8 text-center text-sm text-[#666666]">Add a lesson block from the detailed editor below.</div> : null}
            </div>
          </div>
        </div>
        {error ? <p className="mt-5 rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#E11D48]">{error}</p> : null}
        <div className="mt-6 flex gap-3"><Link href="/admin/lessons" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#111111]"><ArrowLeft size={15} />Cancel</Link><button type="button" onClick={saveLesson} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]"><Save size={15} />Create lesson</button></div>
      </section>
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove }: { block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void; onRemove: () => void }) {
  const value = block.type === "heading" ? block.text : block.type === "text" ? block.body : block.type === "markdown" ? block.markdown : block.type === "math" ? block.expression : block.type === "worked-example" ? block.prompt : block.type === "callout" ? block.text : block.type === "question" ? block.questionId : "";
  return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4"><div className="mb-3 flex items-center justify-between"><span className="field-label">{block.type}</span><button type="button" onClick={onRemove} className="text-[#666666] hover:text-[#E11D48]"><Trash2 size={15} /></button></div><textarea value={value} onChange={(event) => { const next = event.target.value; if (block.type === "heading") onChange({ text: next }); else if (block.type === "text") onChange({ body: next }); else if (block.type === "markdown") onChange({ markdown: next }); else if (block.type === "math") onChange({ expression: next }); else if (block.type === "worked-example") onChange({ prompt: next }); else if (block.type === "callout") onChange({ text: next }); else if (block.type === "question") onChange({ questionId: next }); }} rows={block.type === "markdown" ? 10 : 3} className="admin-input" /></div>;
}
