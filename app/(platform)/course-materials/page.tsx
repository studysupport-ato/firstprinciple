"use client";

import {
  ArrowUpRight,
  BookOpenText,
  Bookmark,
  FileText,
  FolderOpen,
  Globe,
  Grid2x2,
  List,
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

function getDepartmentBadgeClass(departmentName: string) {
  switch (departmentName) {
    case "Computer Science":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Mathematics":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Engineering":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Science":
      return "border-violet-200 bg-violet-50 text-violet-700";
    case "Business":
      return "border-rose-200 bg-rose-50 text-rose-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
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

export default function CourseMaterialsPage() {
  const [directory, setDirectory] = useState<CourseMaterialsDirectory>({ departments: [], entries: [] });
  const [query, setQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState<"ALL" | MaterialType>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialRow | null>(null);
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

  const departmentList = useMemo(() => ["ALL", ...directory.departments.map((department) => department.name)], [directory.departments]);

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

  const filteredDepartments = useMemo(
    () =>
      directory.departments
        .filter((department) => departmentFilter === "ALL" || department.name === departmentFilter)
        .map((department) => ({
          department,
          entries: filteredRows.filter((entry) => entry.departmentId === department.id),
        }))
        .filter(({ entries }) => entries.length > 0),
    [departmentFilter, directory.departments, filteredRows],
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

  return (
    <div className="min-h-screen bg-transparent text-slate-800 antialiased">
      <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-200/80 bg-white px-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-lg font-bold text-white shadow-md shadow-sky-900/20">
            B2
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold leading-none tracking-tight text-slate-900">Back2Basics</span>
              <span className="rounded border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-sky-600">
                Academic Directory
              </span>
            </div>
            <span className="mt-0.5 text-[11px] font-medium text-slate-400">Course Materials Directory</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowBookmarksOnly((current) => !current)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-100"
        >
          <Bookmark className="h-3.5 w-3.5 text-amber-500" />
          <span>Saved</span>
          <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">{bookmarks.length}</span>
        </button>
      </header>

      <main className="flex min-h-[calc(100vh-64px)] flex-col overflow-hidden bg-transparent">
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[1200px] space-y-6">
            <section className="space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search departments, course codes, titles or sources..."
                    className="w-full rounded-xl border border-slate-200 bg-transparent py-3 pl-11 pr-10 text-sm text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20"
                    aria-label="Search course materials"
                  />
                  {query ? (
                    <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>

                <select
                  value={typeFilter}
                  onChange={(event) => setTypeFilter(event.target.value as "ALL" | MaterialType)}
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-3.5 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-500/20 md:w-56"
                >
                  {RESOURCE_TYPES.map((option) => (
                    <option key={option} value={option}>
                      {option === "ALL" ? "All Resource Types" : option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3">
                <div className="flex flex-wrap items-center gap-2 overflow-x-auto">
                  {departmentList.map((departmentName) => {
                    const active = departmentFilter === departmentName;
                    return (
                      <button
                        key={departmentName}
                        type="button"
                        onClick={() => setDepartmentFilter(departmentName)}
                        className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                          active ? "bg-slate-900 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {departmentName === "ALL" ? "All Departments" : departmentName}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-end gap-3">
                  <span className="text-xs font-semibold text-slate-500">{filteredRows.length} item{filteredRows.length === 1 ? "" : "s"}</span>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setViewMode("grid")}
                      className={`rounded-md p-1.5 ${viewMode === "grid" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500"}`}
                    >
                      <Grid2x2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("list")}
                      className={`rounded-md p-1.5 ${viewMode === "list" ? "bg-white text-slate-700 shadow-sm" : "text-slate-500"}`}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {activeFilters.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-medium">Active filters:</span>
                {activeFilters.map((filter) => (
                  <span key={filter} className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-slate-600">
                    {filter}
                  </span>
                ))}
                <button type="button" onClick={clearFilters} className="ml-1 font-semibold text-sky-600 hover:underline">
                  Reset All
                </button>
              </div>
            ) : null}

            {!ready ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading course materials...</div>
            ) : error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center text-sm text-red-700">
                <h3 className="text-base font-bold">Course materials unavailable</h3>
                <p className="mt-2">{error}</p>
              </div>
            ) : filteredDepartments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                  <FolderOpen className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-800">No course materials found</h3>
                <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">We couldn’t find any resources matching your search or filter criteria.</p>
                <button type="button" onClick={clearFilters} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
                  Reset Search Filters
                </button>
              </div>
            ) : (
              <div className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-3"}>
                {filteredDepartments.map(({ department, entries }) => (
                  <div key={department.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="mb-4 flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-600">{department.shortName ?? "Department"}</div>
                        <h2 className="mt-1 text-xl font-bold text-slate-900">{department.name}</h2>
                      </div>
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold text-slate-600">{entries.length}</span>
                    </div>

                    <div className={viewMode === "grid" ? "space-y-3" : "space-y-2.5"}>
                      {entries.map((entry) => {
                        const isSaved = bookmarks.includes(entry.id);
                        const deptBadge = getDepartmentBadgeClass(department.name);

                        return viewMode === "grid" ? (
                          <article key={entry.id} className="flex min-h-[220px] flex-col justify-between rounded-2xl border border-slate-200 bg-transparent p-4 transition hover:border-sky-300 hover:bg-white">
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-2">
                                <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${deptBadge}`}>
                                  {department.name}
                                </span>
                                <div className="flex items-center gap-2 text-slate-500">
                                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{entry.courseCode ?? "Course"}</span>
                                  <button type="button" onClick={() => toggleBookmark(entry.id)} className="rounded-md p-1 hover:bg-slate-200">
                                    <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                                  </button>
                                </div>
                              </div>

                              <div className="cursor-pointer" onClick={() => setSelectedMaterial({ ...entry, type: entry.type })}>
                                <h3 className="text-lg font-bold leading-snug text-slate-900">{entry.courseTitle}</h3>
                                <p className="mt-2 text-sm leading-6 text-slate-500">{entry.description ?? "Course material resource for this department."}</p>
                              </div>
                            </div>

                            <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs">
                              <div className="flex items-center gap-2 text-slate-600">
                                {getTypeIcon(entry.type)}
                                <span className="font-medium">{entry.type}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setSelectedMaterial({ ...entry, type: entry.type })} className="rounded-lg px-2.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-200">
                                  Details
                                </button>
                                <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 font-semibold text-white transition hover:bg-sky-700">
                                  <span>Open</span>
                                  <ArrowUpRight className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </article>
                        ) : (
                          <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-transparent p-3 md:flex-row md:items-center md:justify-between">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white">
                                {getTypeIcon(entry.type)}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="rounded border border-sky-100 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-700">{entry.courseCode ?? "Course"}</span>
                                  <span className={`rounded border px-2 py-0.5 text-[10px] font-semibold ${deptBadge}`}>{department.name}</span>
                                  <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-slate-400 md:inline">{entry.provider ?? "Academic source"}</span>
                                </div>
                                <h3 className="mt-1 truncate text-sm font-bold text-slate-900">{entry.courseTitle}</h3>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 md:justify-end">
                              <span className="hidden text-xs text-slate-500 lg:inline">{entry.type}</span>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => toggleBookmark(entry.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200">
                                  <Bookmark className={`h-3.5 w-3.5 ${isSaved ? "fill-amber-500 text-amber-500" : "text-slate-400"}`} />
                                </button>
                                <button type="button" onClick={() => setSelectedMaterial({ ...entry, type: entry.type })} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                                  Details
                                </button>
                                <a href={entry.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700">
                                  Open
                                  <ArrowUpRight className="h-3 w-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {selectedMaterial ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-100 bg-transparent p-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] ${getDepartmentBadgeClass(directory.departments.find((item) => item.id === selectedMaterial.departmentId)?.name ?? "General")}`}>
                    {directory.departments.find((item) => item.id === selectedMaterial.departmentId)?.shortName ?? "Course"}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">{selectedMaterial.courseCode ?? "Course material"}</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900">{selectedMaterial.courseTitle}</h3>
              </div>
              <button type="button" onClick={() => setSelectedMaterial(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 p-6 text-sm">
              <div>
                <h4 className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Description</h4>
                <p className="leading-relaxed text-slate-600">{selectedMaterial.description ?? "No description has been provided for this course material."}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-xl bg-transparent p-4">
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Resource Type</span>
                  <span className="mt-1 block font-semibold text-slate-700">{selectedMaterial.type}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Source</span>
                  <span className="mt-1 block font-semibold text-slate-700">{selectedMaterial.provider ?? "Back2Basics Directory"}</span>
                </div>
              </div>

              <div>
                <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Topic Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {[
                    selectedMaterial.type,
                    directory.departments.find((item) => item.id === selectedMaterial.departmentId)?.name ?? "Course",
                    selectedMaterial.courseCode ?? "Academic",
                  ].map((tag) => (
                    <span key={tag} className="rounded-md border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-transparent p-5">
              <button type="button" onClick={() => toggleBookmark(selectedMaterial.id)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100">
                <Bookmark className={`h-4 w-4 ${bookmarks.includes(selectedMaterial.id) ? "fill-amber-500 text-amber-500" : "text-slate-500"}`} />
                {bookmarks.includes(selectedMaterial.id) ? "Saved" : "Save Material"}
              </button>

              <a href={selectedMaterial.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700">
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
