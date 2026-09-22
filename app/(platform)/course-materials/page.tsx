"use client";

import {
  ArrowUpRight,
  BookOpenText,
  Bookmark,
  FileText,
  FolderOpen,
  Globe,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

// Derive initials for the department icon placeholder
function getDeptInitials(name: string): string {
  return name
    .split(" ")
    .filter((w) => w.length > 2)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
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

    return (
      <div className="min-h-screen bg-transparent">
        <div className="mx-auto max-w-[1200px] px-6 py-10">
          {/* Back */}
          <button
            type="button"
            onClick={() => setSelectedDepartment(null)}
            className="mb-8 inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-4 py-2 text-sm font-black text-[#111111] shadow-[3px_3px_0_#111111] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
          >
            ← Back to Departments
          </button>

          <div className="mb-6 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[#111111] bg-[#FFBE00] shadow-[3px_3px_0_#111111]">
              <span className="text-xl font-black text-[#111111]">{getDeptInitials(selectedDepartment.name)}</span>
            </div>
            <div>
              <div className="inline-block rounded-full border-2 border-[#111111] bg-[#FFBE00] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111111] mb-1">
                {selectedDepartment.shortName ?? "Dept"}
              </div>
              <h1 className="font-sans text-3xl font-black text-[#111111]">{selectedDepartment.name}</h1>
            </div>
          </div>

          {/* Type filter */}
          <div className="mb-6 flex flex-wrap gap-2">
            {RESOURCE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`rounded-xl border-2 border-[#111111] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider transition shadow-[2px_2px_0_#111111] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                  typeFilter === t ? "bg-[#111111] text-[#FFBE00]" : "bg-white text-[#111111]"
                }`}
              >
                {t === "ALL" ? "All Types" : t}
              </button>
            ))}
          </div>

          {deptEntries.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#111111] bg-white p-12 text-center">
              <FolderOpen className="mx-auto h-10 w-10 text-[#111111]/30" />
              <p className="mt-4 font-bold text-[#111111]/60">No materials found for this department.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {deptEntries.map((entry) => {
                const isSaved = bookmarks.includes(entry.id);
                return (
                  <article key={entry.id} className="flex flex-col justify-between rounded-2xl border-2 border-[#111111] bg-white p-5 shadow-[4px_4px_0_#111111] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getTypeIcon(entry.type)}
                          <span className="text-[10px] font-black uppercase tracking-widest text-[#111111]/60">{entry.type}</span>
                        </div>
                        <button type="button" onClick={() => toggleBookmark(entry.id)} className="rounded-lg p-1 hover:bg-[#FFBE00]/20">
                          <Bookmark className={`h-4 w-4 ${isSaved ? "fill-[#FFBE00] text-[#FFBE00]" : "text-[#111111]/40"}`} />
                        </button>
                      </div>

                      <div>
                        {entry.courseCode && (
                          <span className="mb-1 inline-block text-[10px] font-black uppercase tracking-widest text-[#111111]/50">{entry.courseCode}</span>
                        )}
                        <h3 className="font-sans text-lg font-black leading-snug text-[#111111]">{entry.courseTitle}</h3>
                        <p className="mt-2 text-sm leading-relaxed text-[#111111]/60">{entry.description ?? "Course material resource for this department."}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-[#111111]/10 pt-4">
                      <span className="text-xs font-bold text-[#111111]/50">{entry.provider ?? "Academic source"}</span>
                      <a
                        href={entry.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-[#111111] bg-[#111111] px-4 py-2 text-xs font-black text-[#FFBE00] shadow-[2px_2px_0_#E53935] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      >
                        Open <ArrowUpRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Department card grid (main view) ─────────────────────────────────────
  return (
    <div className="min-h-screen bg-transparent">
      <div className="mx-auto max-w-[1200px] px-6 py-10">

        {/* Page header */}
        <div className="mb-10">
          <h1 className="font-sans text-4xl font-black uppercase tracking-tight text-[#111111] md:text-5xl">Course Materials</h1>
          <p className="mt-2 font-sans text-lg font-medium text-[#111111]/70">Browse resources by department. Find past questions, lecture slides and more.</p>
        </div>

        {/* Search bar */}
        <div className="mb-6 flex flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#111111]/50" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments by name or abbreviation..."
              className="w-full rounded-2xl border-2 border-[#111111] bg-white py-3.5 pl-11 pr-10 text-sm font-medium text-[#111111] outline-none shadow-[3px_3px_0_#111111] transition focus:shadow-none focus:translate-x-[2px] focus:translate-y-[2px] placeholder:text-[#111111]/40"
              aria-label="Search course materials"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-[#111111]/50 hover:text-[#111111]">
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-2xl border-2 border-[#111111] bg-white px-4 py-3 text-sm font-black text-[#111111] shadow-[3px_3px_0_#111111]">
              {directory.departments.filter((d) => d.status === "published").length} Departments
            </div>
            <button
              type="button"
              onClick={() => setShowBookmarksOnly((c) => !c)}
              className={`inline-flex items-center gap-2 rounded-2xl border-2 border-[#111111] px-4 py-3 text-sm font-black shadow-[3px_3px_0_#111111] transition hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none ${
                showBookmarksOnly ? "bg-[#111111] text-[#FFBE00]" : "bg-white text-[#111111]"
              }`}
            >
              <Bookmark className={`h-4 w-4 ${showBookmarksOnly ? "fill-[#FFBE00]" : ""}`} />
              Saved ({bookmarks.length})
            </button>
          </div>
        </div>

        {/* Active filters */}
        {activeFilters.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
            <span className="font-black text-[#111111]">Filters:</span>
            {activeFilters.map((f) => (
              <span key={f} className="rounded-lg border-2 border-[#111111] bg-white px-2.5 py-1 font-bold text-[#111111]">
                {f}
              </span>
            ))}
            <button type="button" onClick={clearFilters} className="font-black text-[#E53935] underline hover:no-underline">
              Reset All
            </button>
          </div>
        )}

        {/* States */}
        {!ready ? (
          <div className="rounded-2xl border-2 border-[#111111] bg-white p-10 text-center font-bold text-[#111111]/60 shadow-[4px_4px_0_#111111]">
            Loading departments...
          </div>
        ) : error ? (
          <div className="rounded-2xl border-2 border-[#E53935] bg-white p-10 text-center shadow-[4px_4px_0_#E53935]">
            <h3 className="text-base font-black text-[#E53935]">Course materials unavailable</h3>
            <p className="mt-2 text-sm font-medium text-[#111111]/60">{error}</p>
          </div>
        ) : visibleDepartments.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#111111] bg-white p-12 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-[#111111]/30" />
            <h3 className="mt-5 font-black text-[#111111]">No departments found</h3>
            <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-[#111111]/60">
              We could not find any departments matching your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#111111] px-5 py-2.5 text-xs font-black text-[#FFBE00] shadow-[3px_3px_0_#E53935] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* Department cards — GESA style */
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {visibleDepartments.map(({ department, entries, filteredEntries }) => {
              const totalCount = entries.length;
              const initials = getDeptInitials(department.name);

              return (
                <div
                  key={department.id}
                  className="flex flex-col rounded-3xl border-2 border-[#E5E5E5] bg-white p-6 shadow-sm transition-all hover:border-[#111111] hover:shadow-[4px_4px_0_#111111]"
                >
                  {/* Dept icon */}
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FAFAFA] border border-[#E5E5E5]">
                    <span className="text-xl font-black text-[#111111]">{initials}</span>
                  </div>

                  {/* Badge */}
                  <div className="mb-3 inline-flex">
                    <span className="rounded-full bg-[#FFBE00] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111111]">
                      {department.shortName ?? "DEPT"}
                    </span>
                  </div>

                  {/* Title & description */}
                  <h2 className="mb-2 font-sans text-xl font-black leading-tight text-[#111111]">{department.name}</h2>
                  <p className="mb-6 flex-1 text-sm leading-relaxed text-[#111111]/60">
                    {department.description ??
                      `Explore the academic resources and course materials for the ${department.name} at KNUST.`}
                  </p>

                  {/* Material count */}
                  <div className="mb-4 text-xs font-bold text-[#111111]/40 uppercase tracking-widest">
                    {totalCount} {totalCount === 1 ? "resource" : "resources"}
                    {filteredEntries.length !== totalCount && ` · ${filteredEntries.length} matching`}
                  </div>

                  {/* CTA */}
                  <button
                    type="button"
                    onClick={() => setSelectedDepartment(department)}
                    className="w-full rounded-2xl border-2 border-[#111111] bg-[#111111] py-3 text-sm font-black text-white transition hover:bg-[#333333]"
                  >
                    View Department
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Material detail modal */}
      {selectedMaterial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border-2 border-[#111111] bg-white shadow-[6px_6px_0_#111111]">
            <div className="flex items-start justify-between border-b-2 border-[#111111] p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-[#FFBE00] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#111111]">
                    {directory.departments.find((item) => item.id === selectedMaterial.departmentId)?.shortName ?? "Course"}
                  </span>
                  <span className="text-[11px] font-bold text-[#111111]/50">{selectedMaterial.courseCode ?? "Course material"}</span>
                </div>
                <h3 className="text-xl font-black text-[#111111]">{selectedMaterial.courseTitle}</h3>
              </div>
              <button type="button" onClick={() => setSelectedMaterial(null)} className="rounded-lg p-2 text-[#111111]/40 hover:bg-[#111111]/10 hover:text-[#111111]">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6 text-sm">
              <div>
                <h4 className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#111111]/40">Description</h4>
                <p className="leading-relaxed text-[#111111]/70">{selectedMaterial.description ?? "No description has been provided for this course material."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl border-2 border-[#111111]/10 bg-[#FAFAFA] p-4">
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#111111]/40">Resource Type</span>
                  <span className="mt-1 block font-black text-[#111111]">{selectedMaterial.type}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-black uppercase tracking-[0.16em] text-[#111111]/40">Source</span>
                  <span className="mt-1 block font-black text-[#111111]">{selectedMaterial.provider ?? "Back2Basics Directory"}</span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#111111]/40">Topic Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    selectedMaterial.type,
                    directory.departments.find((item) => item.id === selectedMaterial.departmentId)?.name ?? "Course",
                    selectedMaterial.courseCode ?? "Academic",
                  ].map((tag) => (
                    <span key={tag} className="rounded-lg border-2 border-[#111111] bg-white px-2.5 py-1 text-xs font-bold text-[#111111]">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t-2 border-[#111111]/10 p-5">
              <button
                type="button"
                onClick={() => toggleBookmark(selectedMaterial.id)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-white px-4 py-2.5 text-sm font-black text-[#111111] shadow-[3px_3px_0_#111111] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                <Bookmark className={`h-4 w-4 ${bookmarks.includes(selectedMaterial.id) ? "fill-[#FFBE00] text-[#FFBE00]" : "text-[#111111]/50"}`} />
                {bookmarks.includes(selectedMaterial.id) ? "Saved" : "Save Material"}
              </button>

              <a
                href={selectedMaterial.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[#111111] bg-[#111111] px-5 py-2.5 text-sm font-black text-[#FFBE00] shadow-[3px_3px_0_#E53935] transition hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
              >
                Open Material Source
                <ArrowUpRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
