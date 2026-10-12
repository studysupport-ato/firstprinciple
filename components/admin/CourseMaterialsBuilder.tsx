"use client";

import { useMemo, useState } from "react";

import {
  createCourseMaterialAction,
  deleteMaterialAction,
  updateCourseMaterialAction,
} from "@/lib/adminContentActions";
import type { CourseMaterialEntry } from "@/lib/content/adminContract";
import type { CourseMaterialSemester, CourseMaterialType, CourseMaterialYear } from "@/lib/courseMaterials";
import { linkHost } from "@/lib/courseMaterialsTree";
import { parseYouTubeVideoId } from "@/lib/youtube";

const YEARS: Array<{ value: CourseMaterialYear; label: string }> = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Fourth year" },
];

const MATERIAL_TYPES: Array<{ value: CourseMaterialType; label: string; hint: string; chip: string }> = [
  { value: "pdf", label: "PDF", hint: "Link to the PDF", chip: "bg-[#F6C9C0] text-[#5A1A10]" },
  { value: "slides", label: "Slides", hint: "Link to the slides", chip: "bg-[#F2D57D] text-[#4A3500]" },
  { value: "past_questions", label: "Past Questions", hint: "Link to the past questions", chip: "bg-[#CFC3F2] text-[#2A1A5E]" },
  { value: "video", label: "Video (YouTube)", hint: "Paste the YouTube link", chip: "bg-[#E7B8C2] text-[#3B1019]" },
  { value: "link", label: "External link", hint: "https://", chip: "bg-[#BFE3CF] text-[#0F3D2E]" },
];

const inputClass =
  "min-h-[46px] w-full rounded-xl border border-[#5A4F3A] bg-[#26231C] px-3.5 text-base text-[#F6EFDC] placeholder:text-[#8F8671] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E9BC3A]";
const primaryButton =
  "min-h-[46px] rounded-full bg-[#8F6500] px-6 text-base font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-50";
const removeButton =
  "min-h-[44px] rounded-full border border-[#5A4F3A] px-4 text-sm font-semibold text-[#F0A798] transition hover:bg-[#F0A798]/10";

function typeOf(entry: CourseMaterialEntry) {
  return entry.entryType ?? "material";
}

export function CourseMaterialsBuilder({
  departmentId,
  entries,
  onChanged,
  onNotice,
  onError,
}: {
  departmentId: string;
  entries: CourseMaterialEntry[];
  onChanged: () => Promise<void> | void;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [year, setYear] = useState<CourseMaterialYear>(1);
  const [semester, setSemester] = useState<CourseMaterialSemester>(1);
  const [openCourseId, setOpenCourseId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [courseCode, setCourseCode] = useState("");
  const [courseTitle, setCourseTitle] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [materialType, setMaterialType] = useState<CourseMaterialType>("pdf");
  const [materialTitle, setMaterialTitle] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");

  const inDepartment = useMemo(() => entries.filter((entry) => entry.departmentId === departmentId), [entries, departmentId]);
  const courses = useMemo(() => inDepartment.filter((entry) => typeOf(entry) === "course"), [inDepartment]);
  const legacy = useMemo(() => inDepartment.filter((entry) => typeOf(entry) === "material" && !entry.parentId), [inDepartment]);

  const semesterCourses = courses.filter((course) => course.studyYear === year && course.semester === semester).sort((a, b) => a.order - b.order);
  const semesterLinks = inDepartment
    .filter((entry) => typeOf(entry) === "semester_link" && entry.studyYear === year && entry.semester === semester)
    .sort((a, b) => a.order - b.order);
  const openCourse = openCourseId ? courses.find((course) => course.id === openCourseId) ?? null : null;
  const openMaterials = openCourse ? inDepartment.filter((entry) => typeOf(entry) === "material" && entry.parentId === openCourse.id) : [];
  const semesterTitle = `${YEARS[year - 1].label} · Semester ${semester}`;
  const materialCountFor = (courseId: string) => inDepartment.filter((entry) => typeOf(entry) === "material" && entry.parentId === courseId).length;

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
    if (!courseTitle.trim()) return onError("Give the course a name.");
    void run(
      () =>
        createCourseMaterialAction({
          departmentId,
          entryType: "course",
          courseCode: courseCode.trim() || undefined,
          courseTitle: courseTitle.trim(),
          studyYear: year,
          semester,
          url: "",
          status: "published",
        }),
      `Course added to ${semesterTitle}.`,
      () => {
        setCourseCode("");
        setCourseTitle("");
      },
    );
  }

  function addSemesterLink() {
    if (!linkTitle.trim()) return onError("Give the link a title.");
    void run(
      () =>
        createCourseMaterialAction({
          departmentId,
          entryType: "semester_link",
          materialType: "link",
          courseTitle: linkTitle.trim(),
          studyYear: year,
          semester,
          url: linkUrl.trim(),
          status: "published",
        }),
      `External link added to ${semesterTitle}.`,
      () => {
        setLinkTitle("");
        setLinkUrl("");
      },
    );
  }

  function addMaterial() {
    if (!openCourse) return;
    if (!materialTitle.trim()) return onError("Give the material a title.");
    const videoId = materialType === "video" ? parseYouTubeVideoId(materialUrl) : undefined;
    if (materialType === "video" && !videoId) return onError("Paste a YouTube link for a video.");
    void run(
      () =>
        createCourseMaterialAction({
          departmentId,
          entryType: "material",
          materialType,
          parentId: openCourse.id,
          courseTitle: materialTitle.trim(),
          studyYear: openCourse.studyYear ?? year,
          semester: openCourse.semester ?? semester,
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

  function remove(entry: CourseMaterialEntry, what: string) {
    const extra = typeOf(entry) === "course" ? " Everything inside it is removed too." : "";
    if (typeof window !== "undefined" && !window.confirm(`Remove "${entry.courseTitle}"?${extra}`)) return;
    void run(() => deleteMaterialAction(entry.id), `${what} removed.`, () => {
      if (entry.id === openCourseId) setOpenCourseId(null);
    });
  }

  function moveLegacy(entry: CourseMaterialEntry, courseId: string) {
    const course = courses.find((item) => item.id === courseId);
    if (!course) return;
    void run(
      () => updateCourseMaterialAction(entry.id, { parentId: course.id, studyYear: course.studyYear, semester: course.semester, entryType: "material" }),
      `Moved into ${course.courseTitle}.`,
    );
  }

  const currentType = MATERIAL_TYPES.find((item) => item.value === materialType) ?? MATERIAL_TYPES[0];

  return (
    <div className="flex flex-wrap items-start gap-5">
      {/* STRUCTURE */}
      <nav aria-label="Years and semesters" className="flex min-w-[240px] max-w-[320px] flex-1 basis-[250px] flex-col gap-3.5 rounded-[22px] bg-[#1A1814] p-5 text-[#F6EFDC]">
        <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">Structure</div>
        {YEARS.map((item) => (
          <div key={item.value} className="flex flex-col gap-1.5">
            <div className="text-lg font-bold">{item.label}</div>
            {([1, 2] as const).map((sem) => {
              const selected = year === item.value && semester === sem;
              const count = courses.filter((course) => course.studyYear === item.value && course.semester === sem).length;
              return (
                <button
                  key={sem}
                  type="button"
                  onClick={() => {
                    setYear(item.value);
                    setSemester(sem);
                    setOpenCourseId(null);
                  }}
                  aria-pressed={selected}
                  className={`flex min-h-[44px] items-center justify-between gap-2 rounded-xl px-3.5 text-left text-base font-semibold ${selected ? "bg-[#8F6500]" : "bg-[#26231C] hover:bg-[#33302A]"}`}
                >
                  <span>Semester {sem}</span>
                  <span className="text-[13px] opacity-85">{count} {count === 1 ? "course" : "courses"}</span>
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* SEMESTER VIEW */}
      {!openCourse ? (
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
          <section className="flex flex-col gap-3.5 rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">{semesterTitle}</div>
              <h2 className="mt-1 font-sans text-[28px] font-extrabold">Courses</h2>
            </div>
            {semesterCourses.length === 0 ? <p className="text-base text-[#C9BFA6]">No courses yet. Add the first one below.</p> : null}
            {semesterCourses.map((course) => (
              <div key={course.id} className="flex flex-wrap items-center gap-3 border-t border-[#3A3428] py-3.5">
                {course.courseCode ? <span className="rounded-md bg-[#E9BC3A] px-2 py-0.5 text-xs font-extrabold text-[#1A1814]">{course.courseCode}</span> : null}
                <span className="min-w-[160px] flex-1 text-[19px] font-semibold">{course.courseTitle}</span>
                <span className="text-sm text-[#C9BFA6]">{materialCountFor(course.id)} materials</span>
                <button type="button" onClick={() => setOpenCourseId(course.id)} className="min-h-[44px] rounded-full bg-[#8F6500] px-[18px] text-[15px] font-bold text-[#F6EFDC] hover:brightness-110">
                  Open materials →
                </button>
                <button type="button" disabled={busy} onClick={() => remove(course, "Course")} className={removeButton} aria-label={`Remove ${course.courseTitle}`}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex flex-col gap-2.5 border-t border-[#3A3428] pt-4">
              <div className="text-[15px] font-bold">Add a course to {semesterTitle}</div>
              <div className="flex flex-wrap gap-2.5">
                <input value={courseCode} onChange={(event) => setCourseCode(event.target.value)} placeholder="Code, e.g. EE 151" aria-label="Course code" className={`${inputClass} flex-[1_1_130px]`} />
                <input value={courseTitle} onChange={(event) => setCourseTitle(event.target.value)} placeholder="Course name, e.g. Applied Electricity" aria-label="Course name" className={`${inputClass} flex-[3_1_240px]`} />
                <button type="button" disabled={busy} onClick={addCourse} className={primaryButton}>Add course</button>
              </div>
            </div>
          </section>

          <section className="flex flex-col gap-3.5 rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">The one exception</div>
              <h2 className="mt-1 font-sans text-[28px] font-extrabold">External links for {semesterTitle}</h2>
              <p className="mt-1 text-[15px] text-[#C9BFA6]">These sit at semester level, beside the courses. Students see them under the course cards.</p>
            </div>
            {semesterLinks.map((link) => (
              <div key={link.id} className="flex flex-wrap items-center gap-3 border-t border-[#3A3428] py-3.5">
                <span className="min-w-[200px] flex-1 text-lg font-semibold">
                  {link.courseTitle} <span className="text-sm font-normal text-[#C9BFA6]">· {linkHost(link.url)}</span>
                </span>
                <button type="button" disabled={busy} onClick={() => remove(link, "Link")} className={removeButton} aria-label={`Remove ${link.courseTitle}`}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2.5 border-t border-[#3A3428] pt-4">
              <input value={linkTitle} onChange={(event) => setLinkTitle(event.target.value)} placeholder="Link title" aria-label="Link title" className={`${inputClass} flex-[2_1_200px]`} />
              <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://" aria-label="Link address" className={`${inputClass} flex-[3_1_240px]`} />
              <button type="button" disabled={busy} onClick={addSemesterLink} className={primaryButton}>Add link</button>
            </div>
          </section>

          <p className="rounded-[18px] bg-[#1A1814]/[0.14] px-5 py-4 text-[15px] leading-6 text-[#26231C]">
            PDFs, slides, past questions and videos are not added here. Open a course to add those.
          </p>
        </div>
      ) : (
        /* COURSE VIEW */
        <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-4">
          <section className="flex flex-col gap-3.5 rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
            <div>
              <button type="button" onClick={() => setOpenCourseId(null)} className="min-h-[44px] text-[15px] font-bold text-[#E9BC3A]">
                ← {semesterTitle}
              </button>
              <h2 className="font-sans text-[30px] font-extrabold">
                {openCourse.courseCode ? `${openCourse.courseCode} · ` : ""}
                {openCourse.courseTitle}
              </h2>
              <div className="mt-1 text-[15px] text-[#C9BFA6]">{openMaterials.length} materials</div>
            </div>
            {openMaterials.length === 0 ? <p className="text-base text-[#C9BFA6]">No materials yet. Add the first one below.</p> : null}
            {openMaterials.map((material) => {
              const type = MATERIAL_TYPES.find((item) => item.value === material.materialType);
              return (
                <div key={material.id} className="flex flex-wrap items-center gap-3 border-t border-[#3A3428] py-3.5">
                  <span className={`min-w-[104px] rounded-full px-3 py-1.5 text-center text-[13px] font-extrabold ${type?.chip ?? "bg-[#BFE3CF] text-[#0F3D2E]"}`}>{type?.label.replace(" (YouTube)", "") ?? "Link"}</span>
                  <span className="min-w-[200px] flex-1 text-lg font-semibold">{material.courseTitle}</span>
                  <button type="button" disabled={busy} onClick={() => remove(material, "Material")} className={removeButton} aria-label={`Remove ${material.courseTitle}`}>
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
        </div>
      )}

      {/* OLDER LOOSE MATERIALS */}
      {legacy.length > 0 ? (
        <section className="basis-full rounded-[22px] bg-[#1A1814] p-6 text-[#F6EFDC]">
          <div className="text-xs font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">Added before courses existed</div>
          <h2 className="mt-1 font-sans text-[24px] font-extrabold">Older materials ({legacy.length})</h2>
          <p className="mt-1 text-[15px] text-[#C9BFA6]">Students still see these. Move each into a course above when you are ready, or remove it.</p>
          {legacy.map((entry) => (
            <div key={entry.id} className="mt-1 flex flex-wrap items-center gap-3 border-t border-[#3A3428] py-3">
              <span className="min-w-[200px] flex-1 text-base font-semibold">
                {entry.courseCode ? `${entry.courseCode} · ` : ""}
                {entry.courseTitle}
                <span className="ml-2 text-sm font-normal text-[#C9BFA6]">{YEARS.find((item) => item.value === entry.studyYear)?.label ?? "No year"}</span>
              </span>
              <select
                aria-label={`Move ${entry.courseTitle} into a course`}
                defaultValue=""
                disabled={busy || courses.length === 0}
                onChange={(event) => event.target.value && moveLegacy(entry, event.target.value)}
                className={`${inputClass} max-w-[280px] flex-[0_1_280px]`}
              >
                <option value="">{courses.length === 0 ? "Add a course first" : "Move into a course…"}</option>
                {courses.map((course) => (
                  <option key={course.id} value={course.id}>
                    {YEARS.find((item) => item.value === course.studyYear)?.label} · S{course.semester} · {course.courseTitle}
                  </option>
                ))}
              </select>
              <button type="button" disabled={busy} onClick={() => remove(entry, "Material")} className={removeButton}>Remove</button>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
