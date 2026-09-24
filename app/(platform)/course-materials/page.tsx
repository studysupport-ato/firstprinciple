"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  Bookmark,
  FileText,
  FolderOpen,
  Globe,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { createCourseMaterialsRepository, type CourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import { type CourseMaterialEntry, type CourseMaterialsDepartment, type CourseMaterialsDirectory } from "@/lib/courseMaterials";

type MaterialType = "PDF Document" | "Lecture Slides" | "Past Questions" | "Video Lecture" | "External Link";

type MaterialRow = CourseMaterialEntry & {
  type: MaterialType;
};

const RESOURCE_TYPES: Array<"ALL" | MaterialType> = ["ALL", "PDF Document", "Lecture Slides", "Past Questions", "Video Lecture", "External Link"];
const BOOKMARK_STORAGE_KEY = "b2b-course-material-bookmarks-v1";

function deriveMaterialType(entry: CourseMaterialEntry): MaterialType {
  const raw = `${entry.courseTitle} ${entry.description ?? ""} ${entry.provider ?? ""} ${entry.url}`.toLowerCase();

  if (/youtube|vimeo|video|mp4|stream/.test(raw)) return "Video Lecture";
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
      return <Globe className="h-4 w-4 text-sky-500" />;
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

// Derive initials for the department icon placeholder
function getDeptInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

// ─── Shared page chrome ────────────────────────────────────────────────────
// Yellow grid shell + building bleed + breadcrumb + profile chip + page heading.
// Shared by the department grid and the department detail view so both render an
// identical frame.
function CourseMaterialsChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#FFC700] pb-10">
      {/* BUILDING — true overflow: page-level, bleeds off the right edge, never clipped by a container */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 top-0 z-0"
        style={{ mixBlendMode: "multiply" }}
      >
        <div
          className="absolute right-[-40px] top-0 h-[400px] w-[82%] min-w-[760px] max-[900px]:left-0 max-[900px]:right-auto max-[900px]:h-[220px] max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:opacity-60"
          style={{
            backgroundImage: "url('/knust.jpg')",
            backgroundSize: "cover",
            backgroundPosition: "left center",
            filter: "grayscale(1) contrast(1.2) brightness(1.6)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 55%, transparent 82%)",
            WebkitMaskComposite: "source-in",
            maskImage: "linear-gradient(90deg, transparent 0%, #000 30%, #000 100%), linear-gradient(180deg, #000 0%, #000 55%, transparent 82%)",
            maskComposite: "intersect",
          }}
        />
      </div>

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">
            <div className="mb-[14px] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#111111]/60">
                <span>Learning space</span>
                <span className="text-[8px]">●</span>
                <span className="text-[#111111]/80">MATH 151</span>
              </div>

              <Link
                href="/settings"
                aria-label="Open profile settings"
                title="Profile settings"
                className="group flex items-center gap-2.5 rounded-full bg-black/[0.08] py-1 pl-1 pr-4 backdrop-blur-[2px]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#111111] text-[11px] font-black text-[#FFC700] transition-transform group-hover:scale-105">
                  KM
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block font-sans text-[13px] font-bold leading-tight text-[#111111]">Kwame Mensah</span>
                  <span className="block font-sans text-[11px] leading-tight text-[#111111]/55">Student profile</span>
                </span>
              </Link>
            </div>

            <div className="relative mb-[10px]">
              <p className="mb-[6px] mt-[26px] font-sans text-[15px] font-normal text-[#1d1d1d]">Your library,</p>
              <h1 className="max-w-[560px] font-sans text-[46px] font-black leading-[1.0] tracking-[-0.01em] text-[#0c0c0c] max-[900px]:text-[30px]">
                COURSE
                <span className="block">MATERIALS.</span>
              </h1>
              <p className="mb-[20px] mt-[12px] max-w-[470px] text-[13.5px] leading-[1.55] text-[#333]/75">
                Browse resources by department. Find past questions, lecture slides and more.
              </p>
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
    const deptEntries = filteredRows.filter((e) => e.departmentId === selectedDepartment.id);
    const deptInitials = getDeptInitials(selectedDepartment.name);

    return (
      <CourseMaterialsChrome>
        <button
          type="button"
          onClick={() => setSelectedDepartment(null)}
          className="inline-flex items-center gap-2 rounded-full border-[1.2px] border-black/50 px-[16px] py-[9px] text-[12px] font-bold text-[#0e0e0e] transition hover:bg-black/5"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          Back to Departments
        </button>

        <div className="mt-4 rounded-[20px] bg-white px-[20px] pb-[20px] pt-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-[20px] bg-[#FCF5E3] ring-1 ring-[#F2E6C6]">
              <span className="text-[22px] font-black tracking-tight text-[#121212]">{deptInitials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="inline-flex w-fit items-center rounded-full bg-[#FDF0C6] px-[13px] py-[6px] text-[10.5px] font-black uppercase tracking-[0.16em] text-[#C2891B]">
                {selectedDepartment.shortName ?? "DEPT"}
              </div>
              <h2 className="mt-[12px] font-sans text-[24px] font-extrabold leading-[1.15] tracking-[-0.015em] text-[#141414]">
                {selectedDepartment.name}
              </h2>
            </div>
          </div>

          <p className="mt-[16px] text-[14px] leading-[1.6] text-[#111111]/55">
            {selectedDepartment.description ?? `Explore the academic excellence and innovative initiatives of the ${selectedDepartment.name} at KNUST.`}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#111111]/10 pt-4">
            <div className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-[12.5px] font-black text-[#FFC700]">
              {deptEntries.length} {deptEntries.length === 1 ? "Resource" : "Resources"}
            </div>
            <FilterPills
              label="Type"
              options={RESOURCE_TYPES}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as "ALL" | MaterialType)}
            />
          </div>
        </div>

        {deptEntries.length === 0 ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-[#111111]/30 bg-white p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <FolderOpen className="mx-auto h-10 w-10 text-[#111111]/30" />
            <h3 className="mt-5 font-black text-[#111111]">No materials found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#111111]/65">
              No resources match this filter for {selectedDepartment.shortName ?? selectedDepartment.name} yet.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid gap-[22px] md:grid-cols-2 xl:grid-cols-3">
            {deptEntries.map((entry, index) => {
              const isSaved = bookmarks.includes(entry.id);

              return (
                <AnimatedItem key={entry.id} index={index} className="flex">
                  <article className="group relative flex w-full flex-col justify-between overflow-hidden rounded-[26px] border border-black/[0.05] bg-white p-[28px] shadow-[0_2px_10px_rgba(16,16,16,0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform hover:-translate-y-[8px] hover:border-black/[0.09] hover:shadow-[0_30px_60px_-22px_rgba(16,16,16,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                    {/* Yellow accent bar that grows across the top on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 h-[4px] w-0 rounded-r-full bg-[#FFC700] transition-[width] duration-500 ease-out group-hover:w-full"
                    />

                    <div className="relative">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[#FCF5E3] ring-1 ring-[#F2E6C6]">
                            {getTypeIcon(entry.type)}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#C2891B]">{entry.type}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleBookmark(entry.id)}
                          aria-label={isSaved ? "Remove from saved materials" : "Save this material"}
                          title={isSaved ? "Remove from saved" : "Save material"}
                          className="rounded-full p-1.5 transition hover:bg-black/5"
                        >
                          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-[#C2891B] text-[#C2891B]" : "text-[#111111]/30"}`} />
                        </button>
                      </div>

                      {entry.courseCode ? (
                        <span className="mt-[18px] block text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#111111]/35">
                          {entry.courseCode}
                        </span>
                      ) : null}

                      <h3 className="mt-[8px] font-sans text-[20px] font-extrabold leading-[1.2] tracking-[-0.015em] text-[#141414]">
                        {entry.courseTitle}
                      </h3>
                      <p className="mt-[14px] line-clamp-3 text-[14px] leading-[1.6] text-[#111111]/55">
                        {entry.description ?? "Course material resource for this department."}
                      </p>
                    </div>

                    <div className="relative mt-[24px] flex items-center justify-between gap-3 border-t border-[#111111]/10 pt-[18px]">
                      <span className="text-[12px] font-medium text-[#111111]/45">{entry.provider ?? "Academic source"}</span>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0B0F] px-[18px] py-[11px] text-[13px] font-extrabold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-[transform,background-color,box-shadow] duration-300 ease-out hover:bg-[#1b1b23] hover:shadow-[0_18px_32px_-16px_rgba(11,11,15,0.95)]"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                </AnimatedItem>
              );
            })}
          </div>
        )}
      </CourseMaterialsChrome>
    );
  }

  // ─── Department card grid (main view) ─────────────────────────────────────
  return (
    <CourseMaterialsChrome>
      <div className="rounded-[20px] bg-white px-[20px] pb-[20px] pt-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments by name or abbreviation..."
              className="w-full rounded-full border border-[#111111]/15 bg-white/75 py-3.5 pl-11 pr-10 text-sm font-medium text-[#111111] shadow-sm outline-none placeholder:text-[#111111]/45"
              aria-label="Search course materials"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#111111]/10 text-[#111111]/60 transition hover:bg-[#111111]/20" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-[#111111]/10 pt-4">
            <div className="flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-[12.5px] font-black text-[#FFC700]">
              {directory.departments.filter((d) => d.status === "published").length} Departments
            </div>
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((c) => !c)}
              className={`inline-flex items-center gap-1.5 rounded-full px-[16px] py-[9px] text-[12px] font-bold transition ${
                showBookmarksOnly ? "bg-[#0e0e0e] text-[#FFC700]" : "border-[1.2px] border-black/50 text-[#0e0e0e] hover:bg-black/5"
              }`}
            >
              <Bookmark className={`h-3.5 w-3.5 ${showBookmarksOnly ? "fill-current" : ""}`} />
              Saved
            </button>
            <FilterPills
              label="Type"
              options={RESOURCE_TYPES}
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as "ALL" | MaterialType)}
            />
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#111111]/10 pt-4 text-xs">
            <span className="font-black text-[#111111]">Filters:</span>
            {activeFilters.map((f) => (
              <span key={f} className="rounded-full bg-[#111111]/5 px-2.5 py-1 font-bold text-[#111111]">
                {f}
              </span>
            ))}
            <button type="button" onClick={clearFilters} className="font-black text-[#111111] underline underline-offset-2">
              Reset All
            </button>
          </div>
        )}

        {!ready ? (
          <div className="mt-4 rounded-[20px] bg-white p-10 text-center font-bold text-[#111111]/65 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            Loading departments...
          </div>
        ) : error ? (
          <div className="mt-4 rounded-[20px] bg-white p-10 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <h3 className="text-base font-black text-[#111111]">Course materials unavailable</h3>
            <p className="mt-2 text-sm font-medium text-[#111111]/65">{error}</p>
          </div>
        ) : visibleDepartments.length === 0 ? (
          <div className="mt-4 rounded-[20px] border border-dashed border-[#111111]/30 bg-white p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <FolderOpen className="mx-auto h-10 w-10 text-[#111111]/30" />
            <h3 className="mt-5 font-black text-[#111111]">No departments found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#111111]/65">
              We could not find any departments matching your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#111111] px-5 py-2.5 text-xs font-black text-[#FFC600]"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="mt-4 grid gap-[22px] md:grid-cols-2 xl:grid-cols-3">
            {visibleDepartments.map(({ department, entries, filteredEntries }, index) => {
              const totalCount = entries.length;
              const initials = getDeptInitials(department.name);

              return (
                <AnimatedItem key={department.id} index={index} className="flex">
                  <div className="group relative flex w-full flex-col overflow-hidden rounded-[26px] border border-black/[0.05] bg-white p-[28px] shadow-[0_2px_10px_rgba(16,16,16,0.06)] transition-[transform,box-shadow,border-color] duration-300 ease-out will-change-transform hover:-translate-y-[8px] hover:scale-[1.012] hover:border-black/[0.09] hover:shadow-[0_30px_60px_-22px_rgba(16,16,16,0.35)] focus-within:border-black/[0.09] focus-within:shadow-[0_24px_48px_-24px_rgba(16,16,16,0.3)] motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100">
                    {/* Yellow accent bar that grows across the top on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-0 h-[4px] w-0 rounded-r-full bg-[#FFC700] transition-[width] duration-500 ease-out group-hover:w-full"
                    />

                    {/* Soft radial warmth that fades in */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-[70px] -top-[70px] h-[200px] w-[200px] rounded-full bg-[#FFC700]/25 opacity-0 blur-[48px] transition-opacity duration-500 ease-out group-hover:opacity-100"
                    />

                    {/* Sheen sweep on hover */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-[42%] -translate-x-[130%] -skew-x-12 bg-gradient-to-r from-transparent via-[#FFC700]/25 to-transparent transition-transform duration-[900ms] ease-out group-hover:translate-x-[330%]"
                    />

                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-[20px] bg-[#FCF5E3] ring-1 ring-[#F2E6C6] transition-[transform,box-shadow,background-color] duration-300 ease-out group-hover:-rotate-[5deg] group-hover:scale-[1.07] group-hover:bg-[#FDEECB] group-hover:shadow-[0_16px_26px_-14px_rgba(214,160,32,0.8)]">
                        <span className="text-[22px] font-black tracking-tight text-[#121212]">{initials}</span>
                      </div>
                      <div className="pt-[8px] text-right text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#111111]/35 transition-colors duration-300 group-hover:text-[#111111]/55">
                        {totalCount} {totalCount === 1 ? "Resource" : "Resources"}
                        {filteredEntries.length !== totalCount && (
                          <span className="mt-[2px] block text-[#111111]/50">{filteredEntries.length} matching</span>
                        )}
                      </div>
                    </div>

                    <div className="relative mt-[26px] inline-flex w-fit items-center rounded-full bg-[#FDF0C6] px-[13px] py-[6px] text-[10.5px] font-black uppercase tracking-[0.16em] text-[#C2891B] transition-[background-color,transform] duration-300 ease-out group-hover:scale-[1.05] group-hover:bg-[#FBE38F]">
                      {department.shortName ?? "DEPT"}
                    </div>

                    <h2 className="relative mt-[16px] line-clamp-2 font-sans text-[24px] font-extrabold leading-[1.15] tracking-[-0.015em] text-[#141414] transition-colors duration-300 group-hover:text-[#0B0B0F]">
                      {department.name}
                    </h2>
                    <p className="relative mt-[16px] line-clamp-3 text-[14px] leading-[1.6] text-[#111111]/55 transition-colors duration-300 group-hover:text-[#111111]/70">
                      {department.description ?? `Explore the academic excellence and innovative initiatives of the ${department.name} at KNUST.`}
                    </p>

                    <div className="relative mt-auto pt-[28px]">
                      <button
                        type="button"
                        onClick={() => setSelectedDepartment(department)}
                        className="w-full rounded-full bg-[#0B0B0F] py-[17px] text-[16px] font-extrabold tracking-[-0.01em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] transition-[transform,background-color,box-shadow] duration-300 ease-out hover:bg-[#1b1b23] hover:shadow-[0_18px_32px_-16px_rgba(11,11,15,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]/30 focus-visible:ring-offset-2 group-hover:-translate-y-[3px] active:translate-y-0 active:scale-[0.99]"
                      >
                        View Department
                      </button>
                    </div>
                  </div>
                </AnimatedItem>
              );
            })}
          </div>
        )}
    </CourseMaterialsChrome>
  );
}
