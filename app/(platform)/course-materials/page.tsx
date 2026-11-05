"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Bookmark,
  FileText,
  FolderOpen,
  Globe,
  Play,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { CourseDetail } from "@/components/course-materials/CourseDetail";
import { CourseMaterialsChrome } from "@/components/course-materials/CourseMaterialsChrome";
import { DepartmentDrawing } from "@/components/course-materials/DepartmentDrawing";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { YouTubeEmbed } from "@/components/learning/YouTubeEmbed";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { getCourseMaterialVideoId, parseYouTubeVideoId } from "@/lib/youtube";
import { buildSemesters, hasUnassignedLegacy, linkHost, type CourseNode } from "@/lib/courseMaterialsTree";
import { createCourseMaterialsRepository, type CourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import { GENERAL_DEPARTMENT_ID, type CourseMaterialYear, type CourseMaterialsDepartment, type CourseMaterialsDirectory } from "@/lib/courseMaterials";
import { deriveMaterialType, type MaterialRow, type MaterialType } from "@/lib/courseMaterialsDisplay";

const RESOURCE_TYPES: Array<"ALL" | MaterialType> = ["ALL", "PDF Document", "Lecture Slides", "Past Questions", "Video Lecture", "Playlist", "External Link"];
const STUDY_YEARS: Array<{ value: CourseMaterialYear; label: string }> = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Fourth year" },
];
const BOOKMARK_STORAGE_KEY = "b2b-course-material-bookmarks-v1";

function getTypeIcon(type: MaterialType) {
  switch (type) {
    case "PDF Document":
      return <FileText className="h-4 w-4 text-red-500" />;
    case "Lecture Slides":
      return <BookOpenText className="h-4 w-4 text-amber-500" />;
    case "Past Questions":
      return <FileText className="h-4 w-4 text-indigo-500" />;
    case "Video Lecture":
      return <Play className="h-4 w-4 fill-current text-sky-500" />;
    default:
      return <Globe className="h-4 w-4 text-emerald-500" />;
  }
}

function FilterPills({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#111111]/45">{label}</span>
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-full px-[14px] py-[8px] text-[12px] font-bold transition ${
            value === opt ? "bg-[#0e0e0e] text-[#E9BC3A]" : "border-[1.2px] border-black/50 text-[#0e0e0e] hover:bg-black/5"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function DepartmentBlueprint({ name }: { name: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#E9BC3A 1px, transparent 1px), linear-gradient(90deg, #E9BC3A 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          opacity: 0.08,
        }}
      />
      <DepartmentDrawing
        name={name}
        className="absolute -right-1 top-1/2 h-[140px] w-[220px] -translate-y-1/2 text-[#F6EFDC] opacity-60"
      />
    </div>
  );
}

export default function CourseMaterialsPage() {
  const [directory, setDirectory] = useState<CourseMaterialsDirectory>({ departments: [], entries: [] });
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | MaterialType>("ALL");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<CourseMaterialsDepartment | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [selectedStudyYear, setSelectedStudyYear] = useState<CourseMaterialYear | null>(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repository: CourseMaterialsRepository = useMemo(() => createCourseMaterialsRepository("supabase"), []);

  useEffect(() => {
    let active = true;

    async function loadDirectory() {
      try {
        const [departments, entries] = await Promise.all([
          repository.listDepartments({ visibility: "student" }),
          repository.listCourseMaterials({ visibility: "student" }),
        ]);

        if (!active) return;

        setDirectory({ departments, entries });
        setError(null);
      } catch (loadError) {
        console.error("[Back2Basics with Kwamina] Failed to load course materials from Supabase", loadError);
        if (active) {
          setDirectory({ departments: [], entries: [] });
          setError(loadError instanceof Error ? loadError.message : "The course materials directory could not be loaded.");
        }
      } finally {
        if (active) {
          setReady(true);
        }
      }
    }

    void loadDirectory();

    try {
      const saved = JSON.parse(window.localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? "[]");
      setBookmarks(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []);
    } catch {
      setBookmarks([]);
    }

    return () => {
      active = false;
    };
  }, [repository]);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
  }, [bookmarks, ready]);

  const rows = useMemo<MaterialRow[]>(() => {
    return directory.entries
      .filter((entry) => directory.departments.some((department) => department.id === entry.departmentId && department.status === "published"))
      .map((entry) => ({ ...entry, type: deriveMaterialType(entry) }));
  }, [directory]);

  const filteredRows = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return rows.filter((entry) => {
      const department = directory.departments.find((item) => item.id === entry.departmentId);
      const inDepartment = departmentFilter === "ALL" || department?.name === departmentFilter;
      const inType = typeFilter === "ALL" || entry.type === typeFilter;
      const isBookmarked = bookmarks.includes(entry.id);
      const matchesText =
        !normalized ||
        `${department?.name ?? ""} ${department?.shortName ?? ""} ${entry.courseCode ?? ""} ${entry.courseTitle} ${entry.provider ?? ""} ${entry.description ?? ""}`
          .toLowerCase()
          .includes(normalized);

      return inDepartment && inType && (!showBookmarksOnly || isBookmarked) && matchesText;
    });
  }, [bookmarks, departmentFilter, directory.departments, query, rows, showBookmarksOnly, typeFilter]);

  // For the department card view: group entries by department
  const departmentsWithEntries = useMemo(
    () =>
      directory.departments
        .filter((d) => d.status === "published" && d.id !== GENERAL_DEPARTMENT_ID)
        .map((department) => ({
          department,
          entries: rows.filter((entry) => entry.departmentId === department.id),
          filteredEntries: filteredRows.filter((entry) => entry.departmentId === department.id),
        })),
    [directory.departments, rows, filteredRows],
  );

  // Departments matching search that have at least 1 material
  const departmentNames = useMemo(
    () =>
      directory.departments
        .filter((d) => d.status === "published" && d.id !== GENERAL_DEPARTMENT_ID)
        .map((d) => d.name),
    [directory]
  );

  const visibleDepartments = useMemo(
    () =>
      departmentsWithEntries.filter(({ department, filteredEntries }) => {
        if (filteredEntries.length === 0 && (query || showBookmarksOnly || typeFilter !== "ALL")) return false;
        if (departmentFilter !== "ALL" && department.name !== departmentFilter) return false;
        if (filteredEntries.length === 0 && !query && !showBookmarksOnly && typeFilter === "ALL") return true; // show even empty unless filtered
        return true;
      }),
    [departmentsWithEntries, query, showBookmarksOnly, typeFilter, departmentFilter],
  );

  function clearFilters() {
    setQuery("");
    setDepartmentFilter("ALL");
    setTypeFilter("ALL");
    setShowBookmarksOnly(false);
  }

  function toggleBookmark(materialId: string) {
    setBookmarks((current) => (current.includes(materialId) ? current.filter((id) => id !== materialId) : [...current, materialId]));
  }

  const activeFilters = [
    showBookmarksOnly ? "Saved only" : null,
    departmentFilter !== "ALL" ? departmentFilter : null,
    typeFilter !== "ALL" ? typeFilter : null,
    query ? `Query: "${query}"` : null,
  ].filter(Boolean) as string[];

  // ─── Department detail panel ───────────────────────────────────────────────
  if (selectedDepartment) {
    const semesters = buildSemesters(rows, selectedDepartment.id, selectedStudyYear);
    const hasUnassignedEntries = hasUnassignedLegacy(rows, selectedDepartment.id);
    const allCourses = semesters.flatMap((semester) => semester.courses);
    const materialCount = allCourses.reduce((total, course) => total + course.materials.length, 0);
    const activeCourse = selectedCourse ? allCourses.find((course) => course.key === selectedCourse) ?? null : null;
    const activeMaterials = activeCourse ? activeCourse.materials : [];

    const shortTypeLabel = (type: MaterialType) =>
      type === "PDF Document" ? "PDF" : type === "Lecture Slides" ? "Slides" : type === "Past Questions" ? "Past Qs" : type === "Video Lecture" ? "Video" : type === "Playlist" ? "Playlists" : "Links";

    const renderCourseCard = (course: CourseNode<MaterialRow>) => {
      const typeCounts = course.materials.reduce((acc, material) => {
        const label = shortTypeLabel(material.type);
        acc[label] = (acc[label] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const typeString = Object.entries(typeCounts).map(([type, count]) => `${type} ${count}`).join(" · ");
      if (!course.available) {
        return (
          <div
            key={course.key}
            aria-disabled="true"
            className="relative flex min-w-[280px] w-[280px] flex-col items-start overflow-hidden rounded-[24px] bg-[#3B372E] p-6 text-left md:min-w-[300px] md:w-[300px]"
          >
            {course.courseCode && (
              <span className="rounded-[4px] bg-[#4A4538] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.05em] text-[#9A917B]">{course.courseCode}</span>
            )}
            <h3 className="mt-4 font-sans text-[22px] font-black leading-tight text-[#9A917B] line-clamp-2">{course.courseTitle}</h3>
            {course.credit ? <p className="mt-2 line-clamp-2 text-[12.5px] font-semibold text-[#9A917B]">Credit · {course.credit}</p> : null}
            <div className="mt-10 rounded-full border border-dashed border-[#6F6753] px-4 py-2 text-[13px] font-bold text-[#B8AE95]">Not available at the moment</div>
          </div>
        );
      }
      return (
        <button
          key={course.key}
          onClick={() => {
            setTypeFilter("ALL");
            setSelectedCourse(course.key);
          }}
          className="group relative flex min-w-[280px] w-[280px] flex-col items-start overflow-hidden rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:min-w-[300px] md:w-[300px]"
        >
          <div className="flex w-full items-center gap-2">
            {course.courseCode && (
              <span className="rounded-[4px] bg-[#E9BC3A] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.05em] text-[#1A1814]">
                {course.courseCode}
              </span>
            )}
            {course.isNew && <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#F6EFDC]">NEW</span>}
          </div>

          <h3 className="mt-4 font-sans text-[22px] font-black leading-tight text-[#F6EFDC] line-clamp-2">{course.courseTitle}</h3>
          {course.credit ? (
            <p className="mt-2 line-clamp-2 text-[12.5px] font-semibold leading-snug text-[#E9BC3A]">
              <span className="font-medium text-[#F6EFDC]/60">Credit · </span>
              {course.credit}
            </p>
          ) : null}

          <div className="mt-10 flex w-full flex-row items-end justify-between">
            <div>
              <div className="text-[14px] font-bold text-[#F6EFDC]">{course.materials.length} materials</div>
              {typeString && <div className="mt-1 text-[11px] font-medium text-[#F6EFDC]/60">{typeString}</div>}
            </div>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </div>
          </div>
        </button>
      );
    };

    return (
      <CourseMaterialsChrome>
        {activeCourse ? (
          <CourseDetail
            course={activeCourse}
            materials={activeMaterials}
            backLabel={`${STUDY_YEARS.find((y) => y.value === selectedStudyYear)?.label || "First year"} · Semester ${activeCourse.semester}`}
            onBack={() => setSelectedCourse(null)}
            bookmarks={bookmarks}
            toggleBookmark={toggleBookmark}
          />
        ) : (
          <div>
            <button
              type="button"
              onClick={() => {
                setSelectedCourse(null);
                setSelectedDepartment(null);
              }}
              className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              {selectedDepartment.name}
            </button>

            <h1 className="font-sans text-[clamp(2.5rem,6vw,4rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">
              {STUDY_YEARS.find(y => y.value === selectedStudyYear)?.label || "First year"}
            </h1>
            <p className="mt-2 text-[17px] font-medium text-[#26231C]/80">
              {allCourses.length} courses · {materialCount} materials
            </p>

            <div className="mt-8 flex items-center gap-3 overflow-x-auto whitespace-nowrap pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible md:pb-0">
              {[
                ...STUDY_YEARS.map((year) => ({ value: year.value, label: year.label })),
                ...(hasUnassignedEntries ? [{ value: null, label: "Unassigned" }] : []),
              ].map((year) => {
                const selected = selectedStudyYear === year.value;
                return (
                  <button
                    key={year.label}
                    onClick={() => setSelectedStudyYear(year.value)}
                    className={`shrink-0 rounded-full px-5 py-2 text-[14px] font-bold transition ${selected ? "bg-[#8F6500] text-[#F6EFDC]" : "bg-[#1A1814] text-[#F6EFDC] hover:bg-[#333333]"}`}
                  >
                    {year.label}
                  </button>
                )
              })}
            </div>

            <div className="mt-12 space-y-12">
              {semesters.map((semester) => (
                <div key={semester.semester}>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="flex items-baseline gap-3 font-sans text-[32px] font-black tracking-[-0.02em] text-[#1A1814]">
                      Semester {semester.semester}
                      {semester.courses.length > 0 && (
                        <span className="text-[14px] font-semibold text-[#1A1814]/80">
                          {semester.courses.length} {semester.courses.length === 1 ? "course" : "courses"}
                        </span>
                      )}
                    </h2>
                  </div>

                  {semester.courses.length === 0 && semester.links.length === 0 ? (
                    <div className="rounded-[18px] bg-[#1A1814]/[0.12] p-6 text-[16px] font-medium text-[#26231C]">
                      No courses have been added to this semester yet.
                    </div>
                  ) : null}

                  {semester.courses.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {semester.courses.map((course) => renderCourseCard(course))}
                    </div>
                  ) : null}

                  {semester.links.length > 0 ? (
                    <div className="mt-2 rounded-[24px] bg-[#1A1814] px-6 py-5 shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
                      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#E9BC3A]">For the whole semester · External links</p>
                      {semester.links.map((link) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-[44px] items-center justify-between gap-3 border-t border-[#3A3428] py-3 text-[16px] font-semibold text-[#F6EFDC] transition hover:text-[#E9BC3A]"
                        >
                          <span>
                            {link.courseTitle} <span className="text-[13px] font-normal text-[#F6EFDC]/60">· {linkHost(link.url)}</span>
                          </span>
                          <span className="shrink-0 text-[#E9BC3A]">Open ↗</span>
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </CourseMaterialsChrome>
    );
  }

  // ─── Department card grid (main view) ─────────────────────────────────────
  return (
    <CourseMaterialsChrome>
      <div>
        <div className="relative mb-8">
          <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#26231C]/60">
            Course Materials
          </p>
          <h1 className="font-sans text-[clamp(2.5rem,6vw,3.5rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">
            Choose your department
          </h1>
          <p className="mt-3 max-w-[470px] text-[17px] font-medium text-[#26231C]/80">
            Pick a department, then a year and semester.
          </p>
        </div>

        <div className="relative max-w-[420px]">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#F6EFDC]/60" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search departments"
            className="h-[52px] w-full rounded-full bg-[#1A1814] pl-[46px] pr-12 text-[15px] font-medium text-[#F6EFDC] shadow-sm outline-none placeholder:text-[#F6EFDC]/60 focus:ring-2 focus:ring-[#8F6500]"
            aria-label="Search course materials"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#F6EFDC]/60 transition hover:bg-white/10" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!ready ? (
          <div className="mt-8 rounded-[24px] bg-[#1A1814] p-10 text-center font-bold text-[#F6EFDC]/60 shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
            Loading departments...
          </div>
        ) : error ? (
          <div className="mt-8 rounded-[24px] bg-[#1A1814] p-10 text-center shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
            <h3 className="text-base font-black text-[#F6EFDC]">Course materials unavailable</h3>
            <p className="mt-2 text-sm font-medium text-[#F6EFDC]/60">{error}</p>
          </div>
        ) : visibleDepartments.length === 0 ? (
          <div className="mt-8 rounded-[24px] border border-dashed border-[#1A1814]/30 bg-[#1A1814]/10 p-12 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-[#1A1814]/40" />
            <h3 className="mt-5 font-black text-[#1A1814]">No departments found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#1A1814]/70">
              We could not find any departments matching your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#1A1814] px-5 py-2.5 text-xs font-black text-[#E9BC3A]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {visibleDepartments.map(({ department }, index) => {
              return (
                <AnimatedItem key={department.id} index={index} className="flex">
                  <article className={`group relative flex min-h-[162px] w-full flex-col items-start overflow-hidden rounded-[24px] ${department.available === false ? "bg-[#3B372E]" : "bg-[#1A1814]"} p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-[28px]`}>
                    <DepartmentBlueprint name={department.name} />
                    <div className="relative z-10 flex min-h-full w-full flex-1 flex-col items-start">
                      <h2 className="relative z-10 max-w-[70%] font-sans text-[22px] font-black leading-tight text-[#F6EFDC] md:text-[24px]">
                        {department.name}
                      </h2>
                      <div className="mt-auto pt-8">
                      {department.available === false ? (
                        <span className="inline-flex min-h-[44px] items-center rounded-full border border-dashed border-[#6F6753] px-5 py-2 text-[14px] font-bold text-[#B8AE95]">
                          Not available at the moment
                        </span>
                      ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedStudyYear(1);
                          setSelectedDepartment(department);
                        }}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#8F6500] px-5 py-2 text-[14px] font-bold text-[#F6EFDC] transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8F6500] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A1814] active:scale-[0.98]"
                      >
                        View course materials
                        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      )}
                    </div>
                    </div>
                  </article>
                </AnimatedItem>
              );
            })}
          </div>
        )}
      </div>
    </CourseMaterialsChrome>
  );
}
