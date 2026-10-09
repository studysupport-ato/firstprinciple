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
import { type CourseMaterialEntry, type CourseMaterialsDepartment, type CourseMaterialsDirectory } from "@/lib/courseMaterials";

type MaterialType = "PDF Document" | "Lecture Slides" | "Past Questions" | "Video Lecture" | "External Link";

type MaterialRow = CourseMaterialEntry & {
  type: MaterialType;
};

const RESOURCE_TYPES: Array<"ALL" | MaterialType> = ["ALL", "PDF Document", "Lecture Slides", "Past Questions", "Video Lecture", "External Link"];
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
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-[22px]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.055) 1px, transparent 1px)",
        backgroundSize: "18px 18px",
        maskImage: "linear-gradient(90deg, transparent 0%, #000 42%, #000 100%)",
      }}
    >
      <DepartmentDrawing
        name={name}
        className="absolute -right-1 top-1/2 h-36 w-56 -translate-y-1/2 text-white/30"
      />
    </div>
  );
}

// ─── Shared page chrome ────────────────────────────────────────────────────
// Shared page chrome for the department grid and department detail view.
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
    <div className="relative min-h-screen overflow-x-clip bg-[#FFC700] pb-10">
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
                href={authenticated === true ? "/settings" : "/courses"}
                aria-label={authenticated === true ? "Open profile settings" : "Sign in to your account"}
                title={authenticated === true ? "Profile settings" : "Sign in"}
                className="group flex items-center gap-2.5 rounded-full bg-black/[0.08] py-1 pl-1 pr-4 backdrop-blur-[2px]"
              >
                <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-[#111111] text-[11px] font-black text-[#FFC700] transition-transform group-hover:scale-105">
                  {initials}
                </span>
                <span className="hidden text-left sm:block">
                  <span className="block font-sans text-[13px] font-bold leading-tight text-[#111111]">{profileLabel}</span>
                  <span className="block font-sans text-[11px] leading-tight text-[#111111]/55">{profileSubLabel}</span>
                </span>
              </Link>
            </div>

            <div className="relative mb-7">
              <p className="mb-1 mt-6 font-serif text-[18px] italic leading-tight text-[#111111]">Your library,</p>
              <h1 className="font-serif text-[clamp(3rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-[#0c0c0c]">
                Course Materials.
              </h1>
              <p className="mt-2 max-w-[470px] font-serif text-[16px] leading-[1.4] text-[#333]/80">
                Pick your department, then your year.
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
    const departmentEntries = rows.filter((entry) => entry.departmentId === selectedDepartment.id);
    const filterLabel: Record<"ALL" | MaterialType, string> = {
      ALL: "All materials",
      "PDF Document": "PDFs",
      "Lecture Slides": "Slides",
      "Past Questions": "Past questions",
      "Video Lecture": "Videos",
      "External Link": "Links",
    };

    return (
      <CourseMaterialsChrome>
        <button
          type="button"
          onClick={() => setSelectedDepartment(null)}
          className="inline-flex items-center gap-2 rounded-full px-1 py-2 font-serif text-[14px] font-bold text-[#111111] transition hover:opacity-65"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.4} />
          All departments
        </button>

        <div className="mt-5">
          <h2 className="max-w-[900px] font-serif text-[clamp(2.6rem,7vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.045em] text-[#0c0c0c]">
            {selectedDepartment.name}
          </h2>
          {selectedDepartment.description ? (
            <p className="mt-3 max-w-[680px] font-serif text-[15px] leading-[1.5] text-[#111111]/65">
              {selectedDepartment.description}
            </p>
          ) : null}
        </div>

        <div
          role="tablist"
          aria-label="Filter materials by type"
          className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6"
        >
          {RESOURCE_TYPES.map((type) => {
            const count = type === "ALL"
              ? departmentEntries.length
              : departmentEntries.filter((entry) => entry.type === type).length;
            const selected = typeFilter === type;

            return (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTypeFilter(type)}
                className={`min-h-[72px] rounded-[16px] px-4 py-3 text-left transition ${
                  selected
                    ? "bg-[#111111] text-white shadow-[0_8px_20px_rgba(17,17,17,0.12)]"
                    : "bg-white text-[#111111] hover:bg-[#fffaf0]"
                }`}
              >
                <span className="block font-serif text-[15px] font-bold leading-tight">
                  {filterLabel[type]}
                </span>
                <span className={`mt-1 block text-[12px] font-semibold ${selected ? "text-white/65" : "text-[#111111]/50"}`}>
                  {count} {count === 1 ? "material" : "materials"}
                </span>
              </button>
            );
          })}
        </div>

        {deptEntries.length === 0 ? (
          <div className="mt-5 rounded-[22px] border border-dashed border-[#111111]/30 bg-white p-12 text-center shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
            <FolderOpen className="mx-auto h-10 w-10 text-[#111111]/30" />
            <h3 className="mt-5 font-black text-[#111111]">No materials found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#111111]/65">
              No resources match this filter for {selectedDepartment.shortName ?? selectedDepartment.name} yet.
            </p>
          </div>
        ) : (
          <div className="mt-5 overflow-hidden rounded-[22px] bg-white px-5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] sm:px-6">
            {deptEntries.map((entry, index) => {
              const isSaved = bookmarks.includes(entry.id);
              const videoId = getCourseMaterialVideoId(entry);

              return (
                <AnimatedItem key={entry.id} index={index}>
                  <article className="border-t border-[#e9e3d7] py-4 first:border-t-0 sm:py-[18px]">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] sm:h-[42px] sm:w-[42px] ${videoId ? "bg-[#FFC700]" : "bg-[#fff1c2]"}`}>
                        {videoId ? <Play className="h-4 w-4 fill-current text-[#111111]" /> : getTypeIcon(entry.type)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="text-[12px] font-serif italic leading-tight text-[#111111]/55">
                          {entry.type}{entry.courseCode ? ` · ${entry.courseCode}` : ""}
                        </p>
                        <h3 className="mt-1 font-serif text-[16px] font-bold leading-tight text-[#141414] sm:text-[18px]">
                          {entry.courseTitle}
                        </h3>
                        {entry.description ? (
                          <p className="mt-1 line-clamp-2 text-[12px] leading-[1.5] text-[#111111]/55 sm:text-[13px]">
                            {entry.description}
                          </p>
                        ) : null}
                      </div>

                      <button
                        type="button"
                        onClick={() => toggleBookmark(entry.id)}
                        aria-label={isSaved ? "Remove from saved materials" : "Save this material"}
                        title={isSaved ? "Remove from saved" : "Save material"}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[#111111]/45 transition hover:bg-black/5 hover:text-[#111111]"
                      >
                        <Bookmark className={`h-4 w-4 ${isSaved ? "fill-[#C2891B] text-[#C2891B]" : ""}`} />
                      </button>

                      {videoId ? (
                        <a
                          href={`#material-video-${entry.id}`}
                          className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#111111] px-4 py-2.5 font-serif text-[13px] font-bold text-white transition hover:bg-[#333333] sm:min-w-[78px]"
                        >
                          Watch
                        </a>
                      ) : (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center justify-center gap-1 rounded-full bg-[#111111] px-4 py-2.5 font-serif text-[13px] font-bold text-white transition hover:bg-[#333333] sm:min-w-[78px]"
                        >
                          Open <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>

                    {videoId ? (
                      <div id={`material-video-${entry.id}`} className="ml-0 mt-4 scroll-mt-6 sm:ml-[58px]">
                        <YouTubeEmbed videoId={videoId} title={entry.courseTitle} />
                      </div>
                    ) : null}
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
      <div>
        <div className="relative">
            <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#111111]/60" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments"
              className="h-[60px] w-full rounded-[19px] border border-white bg-white pl-12 pr-40 text-[15px] font-medium text-[#111111] shadow-[0_4px_16px_rgba(17,17,17,0.04)] outline-none placeholder:text-[#111111]/50 focus:border-[#111111]/20"
              aria-label="Search course materials"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="absolute right-[150px] top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-[#111111]/5 text-[#111111]/60 transition hover:bg-[#111111]/10" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
            <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2 font-serif text-sm italic text-[#111111]/60">
              {directory.departments.filter((d) => d.status === "published").length} departments
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((c) => !c)}
              className={`inline-flex items-center gap-1.5 rounded-full px-[16px] py-[9px] text-[12px] font-bold transition ${
                showBookmarksOnly ? "bg-[#111111] text-[#FFC700]" : "border border-black/25 bg-white/45 text-[#0e0e0e] hover:bg-white/75"
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
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            {visibleDepartments.map(({ department }, index) => {
              return (
                <AnimatedItem key={department.id} index={index} className="flex">
                  <article className="group relative flex min-h-[162px] w-full flex-col items-start overflow-hidden rounded-[22px] bg-[#171717] p-5 text-white shadow-[0_4px_12px_rgba(17,17,17,0.12)] transition-transform duration-300 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 md:p-[22px]">
                    <DepartmentBlueprint name={department.name} />
                    <div className="relative z-10 flex min-h-full w-full flex-1 flex-col items-start">
                      <h2 className="relative z-10 max-w-[78%] font-serif text-[21px] font-bold leading-[1.12] tracking-[-0.02em] text-white md:text-[23px]">
                        {department.name}
                      </h2>
                      <div className="mt-auto pt-6">
                      <button
                        type="button"
                        onClick={() => setSelectedDepartment(department)}
                        className="inline-flex min-h-[42px] items-center gap-2 rounded-full bg-[#FFC700] px-4 py-2 text-[13px] font-bold text-[#111111] transition-colors hover:bg-[#FFD633] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#171717] active:scale-[0.98]"
                      >
                        View course materials
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>
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
