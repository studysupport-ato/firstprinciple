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

import { DepartmentDrawing } from "@/components/course-materials/DepartmentDrawing";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { YouTubeEmbed } from "@/components/learning/YouTubeEmbed";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { getCourseMaterialVideoId, parseYouTubeVideoId } from "@/lib/youtube";
import { createCourseMaterialsRepository, type CourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import { type CourseMaterialEntry, type CourseMaterialYear, type CourseMaterialsDepartment, type CourseMaterialsDirectory } from "@/lib/courseMaterials";

type MaterialType = "PDF Document" | "Lecture Slides" | "Past Questions" | "Video Lecture" | "External Link";

type MaterialRow = CourseMaterialEntry & {
  type: MaterialType;
};

const RESOURCE_TYPES: Array<"ALL" | MaterialType> = ["ALL", "PDF Document", "Lecture Slides", "Past Questions", "Video Lecture", "External Link"];
const STUDY_YEARS: Array<{ value: CourseMaterialYear; label: string }> = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Fourth year" },
];
const BOOKMARK_STORAGE_KEY = "b2b-course-material-bookmarks-v1";

function deriveMaterialType(entry: CourseMaterialEntry): MaterialType {
  if (entry.kind === "youtube" || parseYouTubeVideoId(entry.url) || parseYouTubeVideoId(entry.provider)) return "Video Lecture";
  const raw = `${entry.courseTitle} ${entry.description ?? ""} ${entry.provider ?? ""} ${entry.url}`.toLowerCase();

  if (/vimeo|video|mp4|stream/.test(raw)) return "Video Lecture";
  if (/past|exam|question|quiz|test/.test(raw)) return "Past Questions";
  if (/slides|ppt|powerpoint|deck/.test(raw)) return "Lecture Slides";
  if (/pdf/.test(raw)) return "PDF Document";
  return "External Link";
}

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
            value === opt ? "bg-[#0e0e0e] text-[#FFC700]" : "border-[1.2px] border-black/50 text-[#0e0e0e] hover:bg-black/5"
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
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[24px]"
      style={{
        backgroundImage:
          "linear-gradient(#E9BC3A 1px, transparent 1px), linear-gradient(90deg, #E9BC3A 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        opacity: 0.08,
      }}
    >
      <DepartmentDrawing
        name={name}
        className="absolute -right-1 top-1/2 h-[140px] w-[220px] -translate-y-1/2 text-[#F6EFDC] opacity-100"
      />
    </div>
  );
}

// ─── Shared page chrome ────────────────────────────────────────────────────
function CourseMaterialsChrome({ children }: { children: ReactNode }) {
  const { authenticated, student } = useAuthSession();
  const displayName = (student?.displayName ?? "").trim();
  const profileLabel = authenticated === true ? (displayName || "Student") : "Sign in";
  const profileSubLabel = authenticated === true ? "Student profile" : "Access your account";
  const initials =
    authenticated === true
      ? displayName
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0]?.toUpperCase() ?? "")
          .join("") || "S"
      : "SI";

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-10"
      style={{ background: "linear-gradient(135deg, #f0c84a 0%, #E9BC3A 45%, #d4a82e 100%)" }}
    >
      {/* PAGE BACKGROUND GRID */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">
            
            {/* ── TOP BAR ── */}
            <div className="mb-[14px] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#26231C]/55">
                <span>Learning space</span>
                <span className="text-[8px]">·</span>
                <span className="text-[#26231C]/80">MATH 151</span>
              </div>

              <Link
                href={authenticated === true ? "/settings" : "/courses"}
                aria-label={authenticated === true ? "Open profile settings" : "Sign in to your account"}
                title={authenticated === true ? "Profile settings" : "Sign in"}
                className="group flex items-center gap-2.5 rounded-full bg-[#1A1814]/[0.10] py-1 pl-1 pr-4 backdrop-blur-[2px]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#1A1814] text-[11px] font-black text-[#E9BC3A] transition-transform group-hover:scale-105">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block font-sans text-[13px] font-bold leading-tight text-[#1A1814]">{profileLabel}</span>
                  <span className="block font-sans text-[11px] leading-tight text-[#1A1814]/50">{profileSubLabel}</span>
                </span>
              </Link>
            </div>

            {children}
          </div>
        </div>
      </div>
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
        .filter((d) => d.status === "published")
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
        .filter((d) => d.status === "published")
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
    const departmentEntries = rows.filter((entry) => entry.departmentId === selectedDepartment.id);
    const hasUnassignedEntries = departmentEntries.some((entry) => entry.studyYear == null);
    const deptEntries = filteredRows.filter((entry) =>
      entry.departmentId === selectedDepartment.id &&
      (entry.studyYear ?? null) === selectedStudyYear
    );

    const coursesMap = new Map<string, {
      courseCode: string;
      courseTitle: string;
      materials: MaterialRow[];
      semester: 1 | 2;
      isNew: boolean;
    }>();

    for (const entry of deptEntries) {
      const code = (entry.courseCode || "").trim();
      const title = entry.courseTitle;
      const key = `${code}-${title}`;
      if (!coursesMap.has(key)) {
        let semester: 1 | 2 = 1;
        const match = code.match(/(\d+)$/);
        if (match) {
          semester = parseInt(match[1].slice(-1), 10) % 2 === 0 ? 2 : 1;
        }
        coursesMap.set(key, { courseCode: code, courseTitle: title, materials: [], semester, isNew: false });
      }
      const c = coursesMap.get(key)!;
      c.materials.push(entry);
      // Rough heuristic for 'NEW' tag: if any material is less than 14 days old
      if (Date.now() - new Date(entry.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000) {
        c.isNew = true;
      }
    }
    const courses = Array.from(coursesMap.values());
    const semester1 = courses.filter(c => c.semester === 1);
    const semester2 = courses.filter(c => c.semester === 2);

    const activeCourseKey = selectedCourse;
    const activeCourse = activeCourseKey ? courses.find(c => `${c.courseCode}-${c.courseTitle}` === activeCourseKey) : null;
    const activeMaterials = activeCourse ? activeCourse.materials : deptEntries;

    return (
      <CourseMaterialsChrome>
        {activeCourse ? (
          <div>
            {/* ── BACK ── */}
            <button
              type="button"
              onClick={() => setSelectedCourse(null)}
              className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
            >
              <ArrowLeft className="h-4 w-4" strokeWidth={2.5} />
              {STUDY_YEARS.find(y => y.value === selectedStudyYear)?.label || "First year"} · Semester {activeCourse.semester}
            </button>

            {/* ── COURSE BADGE + TITLE ── */}
            {activeCourse.courseCode && (
              <div className="mb-3">
                <span className="rounded-[6px] bg-[#E9BC3A] px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
                  {activeCourse.courseCode}
                </span>
              </div>
            )}
            <h1 className="font-sans text-[clamp(2.2rem,6vw,4rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">
              {activeCourse.courseTitle}
            </h1>

            {/* ── STATS ── */}
            {(() => {
              const typeCounts = activeCourse.materials.reduce((acc, m) => {
                let short = "";
                if (m.type === "PDF Document") short = "PDF";
                else if (m.type === "Lecture Slides") short = "slides";
                else if (m.type === "Past Questions") short = "past questions";
                else if (m.type === "Video Lecture") short = "video";
                if (short) acc[short] = (acc[short] || 0) + 1;
                return acc;
              }, {} as Record<string, number>);
              const parts = Object.entries(typeCounts).map(([type, count]) => `${count} ${type}`);
              return (
                <p className="mt-2 text-[16px] font-medium text-[#26231C]/75">
                  {activeCourse.materials.length} materials{parts.length ? ` · ${parts.join(" · ")}` : ""}
                </p>
              );
            })()}

            {/* ── FILTER PILLS ── */}
            {(() => {
              const types: Array<"ALL" | MaterialType> = ["ALL", ...([...new Set(activeCourse.materials.map(m => m.type))] as MaterialType[])];
              const pillLabel: Record<string, string> = {
                ALL: "All",
                "PDF Document": "PDF",
                "Lecture Slides": "Slides",
                "Past Questions": "Past Questions",
                "Video Lecture": "Video",
                "External Link": "Links",
              };
              return (
                <div className="mt-6 flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-x-visible md:pb-0">
                  {types.map(t => (
                    <button
                      key={t}
                      onClick={() => setTypeFilter(t)}
                      className={`shrink-0 rounded-full px-6 py-2 text-[14px] font-bold transition ${typeFilter === t ? "bg-[#8F6500] text-[#F6EFDC]" : "bg-[#1A1814] text-[#F6EFDC] hover:bg-[#333333]"}`}
                    >
                      {pillLabel[t] ?? t}
                    </button>
                  ))}
                </div>
              );
            })()}

            {/* ── MATERIALS LIST ── */}
            <div className="mt-6 overflow-hidden rounded-[24px] bg-[#1A1814] shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
              {activeMaterials
                .filter(entry => typeFilter === "ALL" || entry.type === typeFilter)
                .map((entry, index, arr) => {
                  const isSaved = bookmarks.includes(entry.id);
                  const videoId = getCourseMaterialVideoId(entry);
                  const isLast = index === arr.length - 1;

                  // Icon background: gold for video, medium brown for others
                  const iconBg = videoId ? "bg-[#E9BC3A]" : "bg-[#F0C84A]";
                  const iconEl = videoId
                    ? <Play className="h-5 w-5 fill-current text-[#1A1814]" />
                    : <BookOpenText className="h-5 w-5 text-[#1A1814]" strokeWidth={2} />;

                  const ActionLabel = videoId ? "Watch" : "Open";
                  const ActionHref = videoId ? `#material-video-${entry.id}` : entry.url;

                  return (
                    <AnimatedItem key={entry.id} index={index}>
                      <article className={`flex flex-col px-5 py-6 sm:px-7 sm:py-6 ${!isLast ? "border-b border-[#3A3428]" : ""}`}>
                        <div className="flex items-start sm:items-center gap-4">
                          {/* Icon */}
                          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] ${iconBg}`}>
                            {iconEl}
                          </span>

                          {/* Text */}
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#F6EFDC]">
                              {entry.type}
                            </p>
                            <h3 className="mt-[2px] font-sans text-[20px] sm:text-[17px] font-black leading-[1.15] tracking-tight text-[#F6EFDC]">
                              {entry.courseTitle}
                            </h3>
                            {entry.description && entry.description !== entry.courseTitle && (
                              <p className="mt-1.5 text-[14px] sm:text-[13px] leading-snug text-[#F6EFDC]/70">
                                {entry.description}
                              </p>
                            )}
                          </div>

                          {/* Actions (Desktop) */}
                          <div className="hidden shrink-0 items-center gap-2 sm:flex">
                            <a
                              href={ActionHref}
                              target={videoId ? undefined : "_blank"}
                              rel={videoId ? undefined : "noreferrer"}
                              className="inline-flex h-10 items-center justify-center rounded-full bg-[#8F6500] px-5 text-[13px] font-bold text-[#F6EFDC] transition hover:brightness-110"
                            >
                              {ActionLabel}
                            </a>
                            <button
                              type="button"
                              onClick={() => toggleBookmark(entry.id)}
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition ${isSaved ? "border-[#E9BC3A] text-[#E9BC3A]" : "border-[#3A3428] text-[#F6EFDC]/40 hover:border-[#F6EFDC]/40 hover:text-[#F6EFDC]"}`}
                            >
                              <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Actions (Mobile Full Width) */}
                        <div className="mt-5 w-full sm:hidden">
                          <a
                            href={ActionHref}
                            target={videoId ? undefined : "_blank"}
                            rel={videoId ? undefined : "noreferrer"}
                            className="flex h-12 w-full items-center justify-center rounded-full bg-[#8F6500] text-[15px] font-bold text-[#F6EFDC] transition hover:brightness-110"
                          >
                            {ActionLabel}
                          </a>
                        </div>

                        {videoId ? (
                          <div id={`material-video-${entry.id}`} className="ml-[60px] mt-4 scroll-mt-6">
                            <YouTubeEmbed videoId={videoId} title={entry.courseTitle} />
                          </div>
                        ) : null}
                      </article>
                    </AnimatedItem>
                  );
                })}
            </div>
          </div>
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
              {courses.length} courses · {deptEntries.length} materials
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
              {semester1.length > 0 && (
                <div>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="flex items-baseline gap-3 font-sans text-[32px] font-black tracking-[-0.02em] text-[#1A1814]">
                      Semester 1 <span className="text-[14px] font-semibold text-[#1A1814]/80">{semester1.length} courses</span>
                    </h2>
                    <button className="hidden text-[13px] font-bold text-[#1A1814] hover:underline md:block">See all</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {semester1.map(course => {
                      const typeCounts = course.materials.reduce((acc, m) => {
                        let shortType = "Other";
                        if (m.type === "PDF Document") shortType = "PDF";
                        else if (m.type === "Lecture Slides") shortType = "Slides";
                        else if (m.type === "Past Questions") shortType = "Past Qs";
                        else if (m.type === "Video Lecture") shortType = "Video";
                        acc[shortType] = (acc[shortType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const typeString = Object.entries(typeCounts).map(([type, count]) => `${type} ${count}`).join(" · ");
                      return (
                        <button
                          key={`${course.courseCode}-${course.courseTitle}`}
                          onClick={() => setSelectedCourse(`${course.courseCode}-${course.courseTitle}`)}
                          className="group relative flex min-w-[280px] w-[280px] flex-col items-start overflow-hidden rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:min-w-[300px] md:w-[300px]"
                        >
                          <div className="flex w-full items-center gap-2">
                            {course.courseCode && (
                              <span className="rounded-[4px] bg-[#E9BC3A] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.05em] text-[#1A1814]">
                                {course.courseCode}
                              </span>
                            )}
                            {course.isNew && (
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#F6EFDC]">
                                NEW
                              </span>
                            )}
                          </div>
                          
                          <h3 className="mt-4 font-sans text-[22px] font-black leading-tight text-[#F6EFDC] line-clamp-2">
                            {course.courseTitle}
                          </h3>
                          
                          <div className="mt-10 flex w-full flex-row items-end justify-between">
                            <div>
                              <div className="text-[14px] font-bold text-[#F6EFDC]">
                                {course.materials.length} materials
                              </div>
                              {typeString && (
                                <div className="mt-1 text-[11px] font-medium text-[#F6EFDC]/60">
                                  {typeString}
                                </div>
                              )}
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {semester2.length > 0 && (
                <div>
                  <div className="mb-4 flex items-baseline justify-between">
                    <h2 className="flex items-baseline gap-3 font-sans text-[32px] font-black tracking-[-0.02em] text-[#1A1814]">
                      Semester 2 <span className="text-[14px] font-semibold text-[#1A1814]/80">{semester2.length} courses</span>
                    </h2>
                    <button className="hidden text-[13px] font-bold text-[#1A1814] hover:underline md:block">See all</button>
                  </div>
                  <div className="flex gap-4 overflow-x-auto pb-6 pt-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {semester2.map(course => {
                      const typeCounts = course.materials.reduce((acc, m) => {
                        let shortType = "Other";
                        if (m.type === "PDF Document") shortType = "PDF";
                        else if (m.type === "Lecture Slides") shortType = "Slides";
                        else if (m.type === "Past Questions") shortType = "Past Qs";
                        else if (m.type === "Video Lecture") shortType = "Video";
                        acc[shortType] = (acc[shortType] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      const typeString = Object.entries(typeCounts).map(([type, count]) => `${type} ${count}`).join(" · ");
                      return (
                        <button
                          key={`${course.courseCode}-${course.courseTitle}`}
                          onClick={() => setSelectedCourse(`${course.courseCode}-${course.courseTitle}`)}
                          className="group relative flex min-w-[280px] w-[280px] flex-col items-start overflow-hidden rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:min-w-[300px] md:w-[300px]"
                        >
                          <div className="flex w-full items-center gap-2">
                            {course.courseCode && (
                              <span className="rounded-[4px] bg-[#E9BC3A] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.05em] text-[#1A1814]">
                                {course.courseCode}
                              </span>
                            )}
                            {course.isNew && (
                              <span className="text-[10px] font-black uppercase tracking-[0.1em] text-[#F6EFDC]">
                                NEW
                              </span>
                            )}
                          </div>
                          
                          <h3 className="mt-4 font-sans text-[22px] font-black leading-tight text-[#F6EFDC] line-clamp-2">
                            {course.courseTitle}
                          </h3>
                          
                          <div className="mt-10 flex w-full flex-row items-end justify-between">
                            <div>
                              <div className="text-[14px] font-bold text-[#F6EFDC]">
                                {course.materials.length} materials
                              </div>
                              {typeString && (
                                <div className="mt-1 text-[11px] font-medium text-[#F6EFDC]/60">
                                  {typeString}
                                </div>
                              )}
                            </div>
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
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
                  <article className="group relative flex min-h-[162px] w-full flex-col items-start overflow-hidden rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-[28px]">
                    <DepartmentBlueprint name={department.name} />
                    <div className="relative z-10 flex min-h-full w-full flex-1 flex-col items-start">
                      <h2 className="relative z-10 max-w-[70%] font-sans text-[22px] font-black leading-tight text-[#F6EFDC] md:text-[24px]">
                        {department.name}
                      </h2>
                      <div className="mt-auto pt-8">
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
