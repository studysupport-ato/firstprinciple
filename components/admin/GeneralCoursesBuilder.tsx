"use client";

import { useMemo, useState } from "react";

import { AvailabilityToggle } from "@/components/admin/AvailabilityToggle";
import { createCourseMaterialAction, deleteMaterialAction, updateCourseMaterialAction } from "@/lib/adminContentActions";
import type { CourseMaterialEntry } from "@/lib/content/adminContract";
import { GENERAL_DEPARTMENT_ID, type CourseMaterialType } from "@/lib/courseMaterials";
import { parseYouTubeVideoId } from "@/lib/youtube";

const MATERIAL_TYPES: Array<{ value: CourseMaterialType; label: string; hint: string; chip: string }> = [
  { value: "pdf", label: "PDF", hint: "Link to the PDF", chip: "bg-[#F6C9C0] text-[#5A1A10]" },
  { value: "slides", label: "Slides", hint: "Link to the slides", chip: "bg-[#F2D57D] text-[#4A3500]" },
  { value: "past_questions", label: "Past Questions", hint: "Link to the past questions", chip: "bg-[#CFC3F2] text-[#2A1A5E]" },
  { value: "video", label: "Video (YouTube)", hint: "Paste the YouTube link", chip: "bg-[#E7B8C2] text-[#3B1019]" },
  { value: "link", label: "External link", hint: "https://", chip: "bg-[#BFE3CF] text-[#0F3D2E]" },
];

const inputClass =
  "min-h-[46px] w-full rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]";
const primaryButton = "min-h-[46px] rounded-full bg-[#8F6500] px-6 text-base font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50";
const removeButton = "min-h-[44px] rounded-full border border-[#5A4F3A] px-4 text-sm font-semibold text-[#F0A798] transition hover:bg-[#F0A798]/10";

const typeOf = (entry: CourseMaterialEntry) => entry.entryType ?? "material";

/**
 * General courses: created once, with their materials, and shown to every student in the
 * General courses panel. No year, no semester.
 */
export function GeneralCoursesBuilder({
  entries,
  onChanged,
  onNotice,
  onError,
}: {
  entries: CourseMaterialEntry[];
  onChanged: () => Promise<void> | void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [title, setTitle] = useState("");
  const [materialType, setMaterialType] = useState<CourseMaterialType>("pdf");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");

  const inGeneral = useMemo(() => entries.filter((entry) => entry.departmentId === GENERAL_DEPARTMENT_ID), [entries]);
  const courses = useMemo(() => inGeneral.filter((entry) => typeOf(entry) === "course").sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt)), [inGeneral]);
  const materialsOf = (courseId: string) => inGeneral.filter((entry) => typeOf(entry) === "material" && entry.parentId === courseId).sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
  const open = openId ? courses.find((course) => course.id === openId) ?? null : null;
  const normalized = query.trim().toLowerCase();
  const shown = courses.filter((course) => !normalized || `${course.courseCode ?? ""} ${course.courseTitle}`.toLowerCase().includes(normalized));
  const currentType = MATERIAL_TYPES.find((item) => item.value === materialType) ?? MATERIAL_TYPES[0];

  async function run(action: () => Promise<{ ok: boolean; error?: string }>, notice: string, after?: () => void) {
    setBusy(true);
    try {
      const result = await action();
      if (!result.ok) throw new Error(result.error ?? "That could not be saved.");
      after?.();
      onNotice(notice);
      await onChanged();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "That could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  function addCourse() {
    if (!title.trim()) return onError("Give the course a name.");
    void run(
      () => createCourseMaterialAction({ departmentId: GENERAL_DEPARTMENT_ID, entryType: "course", courseCode: code.trim() || undefined, courseTitle: title.trim(), url: "", status: "published" }),
      "General course added.",
      () => {
        setCode("");
        setTitle("");
      },
    );
  }

  function addMaterial() {
    if (!open) return;
    if (!materialTitle.trim()) return onError("Give the material a title.");
    const videoId = materialType === "video" ? parseYouTubeVideoId(materialUrl) : undefined;
    if (materialType === "video" && !videoId) return onError("Paste a YouTube link for a video.");
    void run(
      () =>
        createCourseMaterialAction({
          departmentId: GENERAL_DEPARTMENT_ID,
          entryType: "material",
          materialType,
          parentId: open.id,
          courseTitle: materialTitle.trim(),
          url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : materialUrl.trim(),
          provider: videoId,
          kind: videoId ? "youtube" : "link",
          status: "published",
        }),
      "Material added.",
      () => {
        setMaterialTitle("");
        setMaterialUrl("");
      },
    );
  }

  function setAvailable(entry: CourseMaterialEntry, available: boolean) {
    void run(() => updateCourseMaterialAction(entry.id, { available }), available ? "Marked available." : "Marked not available at the moment.");
  }

  function remove(entry: CourseMaterialEntry) {
    const extra = typeOf(entry) === "course" ? " Everything inside it is removed too." : "";
    if (typeof window !== "undefined" && !window.confirm(`Remove "${entry.courseTitle}"?${extra}`)) return;
    void run(() => deleteMaterialAction(entry.id), "Removed.", () => {
      if (entry.id === openId) setOpenId(null);
    });
  }

  if (open) {
    const materials = materialsOf(open.id);
    return (
      <section className="flex flex-col gap-3.5 rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
        <div>
          <button type="button" onClick={() => setOpenId(null)} className="min-h-[44px] text-[15px] font-bold text-[#E9BC3A]">
            ← All general courses
          </button>
          <h2 className="font-sans text-[30px] font-extrabold">
            {open.courseCode ? `${open.courseCode} · ` : ""}
            {open.courseTitle}
          </h2>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[15px] text-[#C9BFA6]">
            <span>{materials.length} materials, added once, the same for every programme.</span>
            <AvailabilityToggle available={open.available !== false} disabled={busy} onChange={(next) => setAvailable(open, next)} label={open.courseTitle} />
          </div>
        </div>
        {materials.length === 0 ? <p className="text-base text-[#C9BFA6]">No materials yet. Add the first one below.</p> : null}
        {materials.map((material) => {
          const type = MATERIAL_TYPES.find((item) => item.value === material.materialType);
          return (
            <div key={material.id} className={`flex flex-wrap items-center gap-3 border-t border-[#3A3428] py-3.5 ${material.available === false ? "opacity-70" : ""}`}>
              <span className={`min-w-[104px] rounded-full px-3 py-1.5 text-center text-[13px] font-extrabold ${type?.chip ?? "bg-[#BFE3CF] text-[#0F3D2E]"}`}>{type?.label.replace(" (YouTube)", "") ?? "Link"}</span>
              <span className="min-w-[200px] flex-1 text-lg font-semibold">{material.courseTitle}</span>
              <AvailabilityToggle available={material.available !== false} disabled={busy} onChange={(next) => setAvailable(material, next)} label={material.courseTitle} />
              <button type="button" disabled={busy} onClick={() => remove(material)} className={removeButton} aria-label={`Remove ${material.courseTitle}`}>
                Remove
              </button>
            </div>
          );
        })}
        <div className="flex flex-col gap-2.5 border-t border-[#3A3428] pt-4">
          <div className="text-[15px] font-bold">Add a material</div>
          <div className="flex flex-wrap gap-2.5">
            <select value={materialType} onChange={(event) => setMaterialType(event.target.value as CourseMaterialType)} aria-label="Material type" className={`${inputClass} flex-[1_1_170px]`}>
              {MATERIAL_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <input value={materialTitle} onChange={(event) => setMaterialTitle(event.target.value)} placeholder="Title" aria-label="Material title" className={`${inputClass} flex-[2_1_200px]`} />
            <input value={materialUrl} onChange={(event) => setMaterialUrl(event.target.value)} placeholder={currentType.hint} aria-label="Link address" className={`${inputClass} flex-[3_1_240px]`} />
            <button type="button" disabled={busy} onClick={addMaterial} className={primaryButton}>Add material</button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3 rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">New general course</div>
        <div className="flex flex-wrap gap-2.5">
          <input value={code} onChange={(event) => setCode(event.target.value)} placeholder="Code, e.g. GEN 251" aria-label="Course code" className={`${inputClass} flex-[0_1_190px]`} />
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Course title, e.g. Economics for Engineers" aria-label="Course title" className={`${inputClass} flex-[1_1_320px]`} />
          <button type="button" disabled={busy} onClick={addCourse} className={primaryButton}>Add general course</button>
        </div>
        <p className="text-[14px] text-[#C9BFA6]">No year or semester to choose. Students find it in General courses and can search it by name or code.</p>
      </section>

      <section className="rounded-[22px] bg-[#1A1814] p-3 text-[#F6EFDC]">
        <div className="p-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or code" aria-label="Search general courses" className={`${inputClass} max-w-[520px] rounded-full`} />
        </div>
        {shown.map((course) => {
          const materials = materialsOf(course.id);
          return (
            <div key={course.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] px-3 py-2.5 hover:bg-[#26231C]">
              {course.courseCode ? <span className="shrink-0 rounded-[6px] bg-[#E9BC3A] px-2 py-0.5 text-[12px] font-black text-[#1A1814]">{course.courseCode}</span> : null}
              <button type="button" onClick={() => setOpenId(course.id)} className="min-h-[44px] min-w-[200px] flex-1 text-left text-[19px] font-bold">
                {course.courseTitle}
              </button>
              <span className="shrink-0 text-[14px] text-[#C9BFA6]">{materials.length} materials</span>
              <AvailabilityToggle available={course.available !== false} disabled={busy} onChange={(next) => setAvailable(course, next)} label={course.courseTitle} />
              <button type="button" onClick={() => setOpenId(course.id)} className="shrink-0 font-bold text-[#E9BC3A]">Edit →</button>
              <button type="button" disabled={busy} onClick={() => remove(course)} className={removeButton} aria-label={`Remove ${course.courseTitle}`}>Remove</button>
            </div>
          );
        })}
        {shown.length === 0 ? (
          <div className="px-4 py-6 text-[16px] text-[#C9BFA6]">
            {courses.length === 0 ? "No general courses yet. Add the first one above." : `No general course matches "${query}". Add it once above for everyone.`}
          </div>
        ) : null}
      </section>
    </div>
  );
}
