"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { CourseDetail } from "@/components/course-materials/CourseDetail";
import { CourseMaterialsChrome } from "@/components/course-materials/CourseMaterialsChrome";
import { GENERAL_DEPARTMENT_ID, type CourseMaterialEntry } from "@/lib/courseMaterials";
import { createCourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import { deriveMaterialType, type MaterialRow } from "@/lib/courseMaterialsDisplay";

const BOOKMARK_STORAGE_KEY = "b2b-course-material-bookmarks-v1";

export default function GeneralCoursesPage() {
  const [entries, setEntries] = useState<CourseMaterialEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const repository = createCourseMaterialsRepository("supabase");
    repository
      .listCourseMaterials({ departmentId: GENERAL_DEPARTMENT_ID, visibility: "student" })
      .then((rows) => {
        if (active) setEntries(rows);
      })
      .catch((loadError) => {
        console.error("[Back2Basics with Kwamina] Failed to load general courses", loadError);
        if (active) setError(loadError instanceof Error ? loadError.message : "General courses could not be loaded.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    try {
      const saved = JSON.parse(window.localStorage.getItem(BOOKMARK_STORAGE_KEY) ?? "[]");
      setBookmarks(Array.isArray(saved) ? saved.filter((value): value is string => typeof value === "string") : []);
    } catch {
      setBookmarks([]);
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(BOOKMARK_STORAGE_KEY, JSON.stringify(bookmarks));
    } catch {
      /* bookmarks are a convenience */
    }
  }, [bookmarks, ready]);

  const courses = useMemo(() => {
    const byOrder = (a: CourseMaterialEntry, b: CourseMaterialEntry) => a.order - b.order || a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);
    return entries
      .filter((entry) => (entry.entryType ?? "material") === "course")
      .sort(byOrder)
      .map((course) => ({
        course,
        materials: entries
          .filter((entry) => (entry.entryType ?? "material") === "material" && entry.parentId === course.id)
          .sort(byOrder)
          .map<MaterialRow>((entry) => ({ ...entry, type: deriveMaterialType(entry) })),
      }));
  }, [entries]);

  const normalized = query.trim().toLowerCase();
  const results = courses.filter(({ course }) => !normalized || `${course.courseCode ?? ""} ${course.courseTitle}`.toLowerCase().includes(normalized));
  const active = selectedId ? courses.find(({ course }) => course.id === selectedId) ?? null : null;

  function toggleBookmark(materialId: string) {
    setBookmarks((current) => (current.includes(materialId) ? current.filter((id) => id !== materialId) : [...current, materialId]));
  }

  if (active) {
    return (
      <CourseMaterialsChrome>
        <CourseDetail
          course={{ courseCode: active.course.courseCode, courseTitle: active.course.courseTitle, credit: active.course.credit, topics: active.course.topics, outline: active.course.outline }}
          materials={active.materials}
          backLabel="General courses"
          onBack={() => setSelectedId(null)}
          bookmarks={bookmarks}
          toggleBookmark={toggleBookmark}
        />
      </CourseMaterialsChrome>
    );
  }

  return (
    <CourseMaterialsChrome>
      <div>
        <p className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-[#26231C]/60">Course Materials</p>
        <h1 className="font-sans text-[clamp(2.5rem,6vw,3.5rem)] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814]">General courses</h1>
        <p className="mt-3 max-w-[520px] text-[17px] font-medium text-[#26231C]/80">Taken across the College of Engineering, whatever your programme or year.</p>

        <div className="relative mt-6 max-w-[640px]">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[#F6EFDC]/60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or code, e.g. Economics"
            className="h-[56px] w-full rounded-full bg-[#1A1814] pl-[48px] pr-12 text-[16px] font-medium text-[#F6EFDC] shadow-sm outline-none placeholder:text-[#F6EFDC]/60 focus:ring-2 focus:ring-[#8F6500]"
            aria-label="Search general courses"
          />
          {query ? (
            <button type="button" onClick={() => setQuery("")} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#F6EFDC]/60 transition hover:bg-white/10" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        {!ready ? (
          <div className="mt-8 rounded-[24px] bg-[#1A1814] p-10 text-center font-bold text-[#F6EFDC]/60">Loading general courses...</div>
        ) : error ? (
          <div className="mt-8 rounded-[24px] bg-[#1A1814] p-10 text-center">
            <h3 className="text-base font-black text-[#F6EFDC]">General courses unavailable</h3>
            <p className="mt-2 text-sm font-medium text-[#F6EFDC]/60">{error}</p>
          </div>
        ) : (
          <>
            <p className="mt-6 text-[16px] font-semibold text-[#26231C]">
              {results.length} {results.length === 1 ? "general course" : "general courses"}
            </p>
            <div className="mt-3 rounded-[24px] bg-[#1A1814] p-2 shadow-[0_2px_14px_rgba(0,0,0,0.22)]">
              {results.map(({ course, materials }) => {
                const off = course.available === false;
                const count = materials.filter((material) => material.available !== false).length;
                const content = (
                  <>
                    {course.courseCode ? (
                      <span className={`shrink-0 rounded-[6px] px-2 py-0.5 text-[12px] font-black ${off ? "bg-[#3B372E] text-[#9A917B]" : "bg-[#E9BC3A] text-[#1A1814]"}`}>{course.courseCode}</span>
                    ) : null}
                    <span className="min-w-0 flex-1 basis-[220px]">
                      <span className="block text-[18px] font-bold">{course.courseTitle}</span>
                      {course.credit ? <span className="mt-0.5 block text-[12.5px] font-semibold text-[#E9BC3A]/90">Credit · {course.credit}</span> : null}
                    </span>
                    {off ? (
                      <span className="shrink-0 rounded-full border border-dashed border-[#6F6753] px-3 py-1.5 text-[13px] font-bold text-[#B8AE95]">Not available at the moment</span>
                    ) : (
                      <>
                        <span className="shrink-0 text-[14px] text-[#C9BFA6]">{count} {count === 1 ? "material" : "materials"}</span>
                        <span className="shrink-0 font-bold text-[#E9BC3A]">Open →</span>
                      </>
                    )}
                  </>
                );
                return off ? (
                  <div key={course.id} aria-disabled="true" className="flex min-h-[64px] cursor-not-allowed flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] px-4 py-3 text-[#8F8671]">
                    {content}
                  </div>
                ) : (
                  <button
                    key={course.id}
                    type="button"
                    onClick={() => setSelectedId(course.id)}
                    className="flex min-h-[64px] w-full flex-wrap items-center gap-x-4 gap-y-2 rounded-[14px] px-4 py-3 text-left text-[#F6EFDC] transition hover:bg-[#26231C]"
                  >
                    {content}
                  </button>
                );
              })}
              {results.length === 0 ? (
                <div className="px-4 py-6">
                  <div className="text-[20px] font-bold text-[#F6EFDC]">{courses.length === 0 ? "No general courses yet" : `Nothing matches "${query}"`}</div>
                  <p className="mt-1 text-[15px] text-[#C9BFA6]">
                    {courses.length === 0 ? "They will appear here once they are added." : "Check the spelling. If a course is missing, tell your course rep and it will be added once for everyone."}
                  </p>
                </div>
              ) : null}
            </div>
          </>
        )}
      </div>
    </CourseMaterialsChrome>
  );
}
