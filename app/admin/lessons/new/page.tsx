"use client";

import { ArrowLeft, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { createDefaultBlock } from "@/lib/content/overrides";
import {
  getAdminCoursesAction,
  getAdminCourseStructureAction,
  createWeekAction,
  createDayAction,
} from "@/lib/adminContentActions";
import type { ContentBlock } from "@/lib/content/types";
import type { AdminCourseListRow, AdminCourseStructure, Week } from "@/lib/content/adminContract";
import { createStableId } from "@/lib/ids";

const blockTypes: ContentBlock["type"][] = ["heading", "text", "markdown", "math", "worked-example", "callout", "question"];

export default function AdminNewLessonPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [courses, setCourses] = useState<AdminCourseListRow[]>([]);
  const [courseId, setCourseId] = useState(searchParams.get("courseId") ?? "");
  const [structure, setStructure] = useState<AdminCourseStructure | null>(null);
  const [weekId, setWeekId] = useState(searchParams.get("weekId") ?? "");
  const [weekName, setWeekName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load courses once
  useEffect(() => {
    async function loadCourses() {
      const res = await getAdminCoursesAction();
      if (res.ok) {
        setCourses(res.data);
        if (!courseId && res.data.length > 0) {
          setCourseId(res.data[0].course.id);
        }
      }
    }
    loadCourses();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load structure when course changes
  useEffect(() => {
    if (!courseId) return;
    async function loadStructure() {
      const res = await getAdminCourseStructureAction(courseId);
      if (res.ok && res.data) {
        setStructure(res.data);
        // Auto-select first week if the URL-param weekId is not in this course
        const weeks = res.data.weeks.map((w) => w.week);
        const paramWeekId = searchParams.get("weekId") ?? "";
        if (paramWeekId && weeks.some((w) => w.id === paramWeekId)) {
          setWeekId(paramWeekId);
          setWeekName(weeks.find((w) => w.id === paramWeekId)?.title ?? "");
        } else if (weeks.length > 0) {
          setWeekId(weeks[0].id);
          setWeekName(weeks[0].title);
        }
      }
    }
    loadStructure();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const course = structure?.course ?? null;
  const weeks: Week[] = structure?.weeks.map((w) => w.week) ?? [];
  const weekMatch = weeks.find((w) => w.id === weekId || w.title.trim().toLowerCase() === weekName.trim().toLowerCase());

  function addBlock(type: ContentBlock["type"]) {
    setBlocks((current) => [...current, createDefaultBlock(type, current.length + 1)]);
  }

  function updateBlock(blockId: string, patch: Partial<ContentBlock>) {
    setBlocks((current) => current.map((block) => (block.id === blockId ? ({ ...block, ...patch } as ContentBlock) : block)));
  }

  async function saveLesson() {
    if (!course) {
      setError("Select a course before creating a lesson.");
      return;
    }
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      let resolvedWeekId = weekMatch?.id ?? weekId;

      // Create a new week if needed
      if (!resolvedWeekId || !weeks.some((w) => w.id === resolvedWeekId)) {
        const trimmedWeekName = weekName.trim() || "Week 1";
        resolvedWeekId = createStableId(course.id, trimmedWeekName);
        const nextWeekNumber = Math.max(0, ...weeks.map((w) => w.weekNumber)) + 1;
        const newWeekRes = await createWeekAction({
          id: resolvedWeekId,
          courseId: course.id,
          title: trimmedWeekName,
          description: `${trimmedWeekName} for ${course.title}.`,
          weekNumber: nextWeekNumber,
        });
        if (!newWeekRes.ok) {
          setError(`Failed to create week: ${newWeekRes.error}`);
          return;
        }
        resolvedWeekId = newWeekRes.data.id;
      }

      const chapterId = structure?.chapters[0]?.id ?? createStableId(course.id, "chapter-1");
      const existingDays = structure?.weeks.find((w) => w.week.id === resolvedWeekId)?.days ?? [];
      const id = createStableId(course.id, title);

      const dayRes = await createDayAction({
        id,
        courseId: course.id,
        weekId: resolvedWeekId,
        chapterId,
        title: title.trim(),
        description: description.trim(),
        order: existingDays.length + 1,
        blocks,
      });

      if (!dayRes.ok) {
        setError(`Failed to create lesson: ${dayRes.error}`);
        return;
      }

      router.push(`/admin/lessons/${dayRes.data.id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader title="Create lesson" description="Create a lesson using the same content blocks rendered by the student experience." breadcrumbs={[{ label: "Lessons", href: "/admin/lessons" }, { label: "New lesson" }]} />
      <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="field-label">Course</span>
              <select value={courseId} onChange={(event) => setCourseId(event.target.value)} className="admin-input">
                {courses.map((row) => (
                  <option key={row.course.id} value={row.course.id}>{row.course.code} · {row.course.title}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="field-label">Week</span>
              <select
                value={weekId}
                onChange={(event) => {
                  setWeekId(event.target.value);
                  setWeekName(weeks.find((w) => w.id === event.target.value)?.title ?? "");
                }}
                className="admin-input"
              >
                <option value="">— New week —</option>
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>{w.title}</option>
                ))}
              </select>
            </label>
            {!weekId && (
              <label className="space-y-2">
                <span className="field-label">New week name</span>
                <input value={weekName} onChange={(e) => setWeekName(e.target.value)} className="admin-input" placeholder="Week 1" />
              </label>
            )}
          </div>
          <label className="space-y-2">
            <span className="field-label">Lesson title</span>
            <input value={title} onChange={(event) => setTitle(event.target.value)} className="admin-input" placeholder="Lesson title" />
          </label>
          <label className="space-y-2">
            <span className="field-label">Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} className="admin-input" placeholder="What will students learn?" />
          </label>

          <div className="border-t border-[#E5E5E5] pt-5">
            <div className="space-y-3">
              {blocks.map((block) => (
                <BlockEditor key={block.id} block={block} onChange={(patch) => updateBlock(block.id, patch)} onRemove={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} />
              ))}
              {!blocks.length ? <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-8 text-center text-sm text-[#666666]">Add a lesson block below.</div> : null}
              <div className="flex flex-wrap gap-2 pt-2">
                {blockTypes.map((type) => (
                  <button key={type} type="button" onClick={() => addBlock(type)} className="rounded-full border border-[#E5E5E5] bg-[#F7F7F8] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#111111]">
                    + {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        {error ? <p className="mt-5 rounded-xl bg-[#FEF2F2] px-4 py-3 text-sm text-[#E11D48]">{error}</p> : null}
        <div className="mt-6 flex gap-3">
          <Link href="/admin/lessons" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] px-4 py-2.5 text-sm font-medium text-[#111111]">
            <ArrowLeft size={15} />Cancel
          </Link>
          <button type="button" onClick={saveLesson} disabled={saving} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB] disabled:opacity-60">
            <Save size={15} />{saving ? "Creating..." : "Create lesson"}
          </button>
        </div>
      </section>
    </div>
  );
}

function BlockEditor({ block, onChange, onRemove }: { block: ContentBlock; onChange: (patch: Partial<ContentBlock>) => void; onRemove: () => void }) {
  const value = block.type === "heading" ? block.text : block.type === "text" ? block.body : block.type === "markdown" ? block.markdown : block.type === "math" ? block.expression : block.type === "worked-example" ? block.prompt : block.type === "callout" ? block.text : block.type === "question" ? block.questionId : "";
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="field-label">{block.type}</span>
        <button type="button" onClick={onRemove} className="text-[#666666] hover:text-[#E11D48]"><Trash2 size={15} /></button>
      </div>
      <textarea value={value} onChange={(event) => {
        const next = event.target.value;
        if (block.type === "heading") onChange({ text: next });
        else if (block.type === "text") onChange({ body: next });
        else if (block.type === "markdown") onChange({ markdown: next });
        else if (block.type === "math") onChange({ expression: next });
        else if (block.type === "worked-example") onChange({ prompt: next });
        else if (block.type === "callout") onChange({ text: next });
        else if (block.type === "question") onChange({ questionId: next });
      }} rows={block.type === "markdown" ? 10 : 3} className="admin-input" />
    </div>
  );
}
