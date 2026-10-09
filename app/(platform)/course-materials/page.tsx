"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpenText, FileText, FolderOpen, Globe, Play, Search, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { DepartmentDrawing } from "@/components/course-materials/DepartmentDrawing";
import { YouTubeEmbed } from "@/components/learning/YouTubeEmbed";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { getCourseMaterialVideoId, parseYouTubeVideoId } from "@/lib/youtube";
import { createCourseMaterialsRepository, type CourseMaterialsRepository } from "@/lib/courseMaterialsRepository";
import { type CourseMaterialEntry, type CourseMaterialsDepartment, type CourseMaterialsDirectory } from "@/lib/courseMaterials";

type MaterialType = "PDF Document" | "Lecture Slides" | "Past Questions" | "Video Lecture" | "External Link";

type MaterialRow = CourseMaterialEntry & {
  type: MaterialType;
  year: Year;
};

type Year = 1 | 2 | 3 | 4;

const GEORGIA: CSSProperties = { fontFamily: 'Georgia, "Times New Roman", serif' };
const BODY_FONT: CSSProperties = { fontFamily: 'var(--font-inter), ui-sans-serif, system-ui, sans-serif' };
const YEARS: Array<{ year: Year; label: string }> = [
  { year: 1, label: "First year" },
  { year: 2, label: "Second year" },
  { year: 3, label: "Third year" },
  { year: 4, label: "Fourth year" },
];

function deriveMaterialType(entry: CourseMaterialEntry): MaterialType {
  if (entry.kind === "youtube" || parseYouTubeVideoId(entry.url) || parseYouTubeVideoId(entry.provider)) return "Video Lecture";
  const raw = `${entry.courseTitle} ${entry.description ?? ""} ${entry.provider ?? ""} ${entry.url}`.toLowerCase();

  if (/vimeo|video|mp4|stream/.test(raw)) return "Video Lecture";
  if (/past|exam|question|quiz|test/.test(raw)) return "Past Questions";
  if (/slides|ppt|powerpoint|deck/.test(raw)) return "Lecture Slides";
  if (/pdf/.test(raw)) return "PDF Document";
  return "External Link";
}

// KNUST course codes carry the year in the first digit of the number (ME 161 is a first-year course).
// Materials without a course code stay in First year, where everything uploaded so far belongs.
function deriveYear(entry: CourseMaterialEntry): Year {
  const digit = entry.courseCode?.match(/\d/)?.[0];
  const year = digit ? Number(digit) : 1;
  return year >= 1 && year <= 4 ? (year as Year) : 1;
}

function getTypeIcon(type: MaterialType) {
  switch (type) {
    case "Video Lecture":
      return <Play className="h-[18px] w-[18px] fill-[#141414] text-[#141414]" />;
    case "Lecture Slides":
      return <BookOpenText className="h-[18px] w-[18px] text-[#141414]" />;
    case "PDF Document":
    case "Past Questions":
      return <FileText className="h-[18px] w-[18px] text-[#141414]" />;
    default:
      return <Globe className="h-[18px] w-[18px] text-[#141414]" />;
  }
}

// ─── Shared page chrome ────────────────────────────────────────────────────
// Yellow grid shell + building bleed + breadcrumb + profile chip + page heading.
// Shared by the department grid and the department detail view so both render an
// identical frame.
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
    <div className="relative min-h-screen overflow-x-clip bg-[#FFC700] pb-10" style={GEORGIA}>
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

            <div className="relative mb-[10px]">
              <p className="mb-[6px] mt-[26px] text-[17px] italic text-[#1d1d1d]">Your library,</p>
              <h1 className="max-w-[560px] text-[52px] font-bold leading-[1.0] tracking-[-0.01em] text-[#0c0c0c] max-[900px]:text-[34px]">
                Course
                <span className="block">Materials.</span>
              </h1>
              <p className="mb-[20px] mt-[12px] max-w-[470px] text-[16px] leading-[1.55] text-[#3a3000]">
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
  const [selectedDepartment, setSelectedDepartment] = useState<CourseMaterialsDepartment | null>(null);
  const [selectedYear, setSelectedYear] = useState<Year>(1);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);
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

    return () => {
      active = false;
    };
  }, [repository]);

  const publishedDepartments = useMemo(
    () => directory.departments.filter((department) => department.status === "published"),
    [directory.departments],
  );

  const rows = useMemo<MaterialRow[]>(() => {
    return directory.entries
      .filter((entry) => publishedDepartments.some((department) => department.id === entry.departmentId))
      .map((entry) => ({ ...entry, type: deriveMaterialType(entry), year: deriveYear(entry) }));
  }, [directory.entries, publishedDepartments]);

  const visibleDepartments = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return publishedDepartments;
    return publishedDepartments.filter((department) => `${department.name} ${department.shortName ?? ""}`.toLowerCase().includes(normalized));
  }, [publishedDepartments, query]);

  function openDepartment(department: CourseMaterialsDepartment) {
    setSelectedDepartment(department);
    setSelectedYear(1);
    setOpenVideoId(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ─── Inside a department: year groups ─────────────────────────────────────
  if (selectedDepartment) {
    const departmentRows = rows.filter((entry) => entry.departmentId === selectedDepartment.id);
    const yearRows = departmentRows.filter((entry) => entry.year === selectedYear);
    const selectedYearLabel = YEARS.find((item) => item.year === selectedYear)?.label ?? "First year";

    return (
      <CourseMaterialsChrome>
        <button
          type="button"
          onClick={() => setSelectedDepartment(null)}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-full border-[1.5px] border-black/60 px-[18px] text-[15px] font-bold text-[#0e0e0e] transition hover:bg-black/5"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2.4} />
          All departments
        </button>

        <h2 className="mt-5 text-[40px] font-bold leading-[1.05] tracking-[-0.01em] text-[#141414] max-[900px]:text-[30px]">
          {selectedDepartment.name}
        </h2>

        <div role="tablist" aria-label="Year" className="mt-5 grid grid-cols-2 gap-[10px] md:grid-cols-4">
          {YEARS.map(({ year, label }) => {
            const count = departmentRows.filter((entry) => entry.year === year).length;
            const selected = year === selectedYear;
            return (
              <button
                key={year}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => {
                  setSelectedYear(year);
                  setOpenVideoId(null);
                }}
                className={`min-h-[76px] rounded-[16px] border-2 px-[18px] py-[14px] text-left transition ${
                  selected ? "border-[#141414] bg-[#141414] text-white" : "border-transparent bg-white text-[#141414] hover:border-[#141414]"
                }`}
              >
                <span className="block text-[19px] font-bold">{label}</span>
                <span className="mt-1 block text-[14px] italic opacity-75">
                  {count} {count === 1 ? "material" : "materials"}
                </span>
              </button>
            );
          })}
        </div>

        <section aria-live="polite" className="mt-4 rounded-[20px] bg-white p-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
          <h3 className="mb-2 text-[22px] font-bold text-[#141414]">{selectedYearLabel}</h3>

          {!ready ? (
            <p className="border-t border-[#ECE7D6] py-8 text-center text-[16px] italic text-[#5c5c5c]">Loading materials…</p>
          ) : yearRows.length === 0 ? (
            <div className="border-t border-[#ECE7D6] px-1 py-9 text-center">
              <FolderOpen className="mx-auto h-9 w-9 text-[#141414]/30" />
              <p className="mt-3 text-[18px] font-bold text-[#141414]">Nothing here yet.</p>
              <p className="mt-1 text-[15px] text-[#5c5c5c]">Materials for this year will appear here once they are added.</p>
            </div>
          ) : (
            <ul className="m-0 list-none p-0">
              {yearRows.map((entry) => {
                const videoId = getCourseMaterialVideoId(entry);
                const isVideo = Boolean(videoId);
                const isOpen = isVideo && openVideoId === entry.id;
                const meta = entry.courseCode ? `${entry.type} · ${entry.courseCode}` : entry.type;
                return (
                  <li key={entry.id} className="border-t border-[#ECE7D6] py-3">
                    <div className="flex items-center gap-4 px-1">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${isVideo ? "bg-[#FFC700]" : "bg-[#FFF3C4]"}`}
                      >
                        {getTypeIcon(entry.type)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[14px] italic text-[#5c5c5c]">{meta}</div>
                        <div className="mt-0.5 text-[17px] font-bold leading-snug text-[#141414]">{entry.courseTitle}</div>
                      </div>
                      {isVideo ? (
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpenVideoId(isOpen ? null : entry.id)}
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[#141414] px-[18px] text-[14px] font-bold text-white transition hover:bg-black"
                        >
                          {isOpen ? "Close" : "Watch"}
                        </button>
                      ) : (
                        <a
                          href={entry.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full bg-[#141414] px-[18px] text-[14px] font-bold text-white transition hover:bg-black"
                        >
                          Open <ArrowUpRight className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {isOpen && videoId ? (
                      <div className="mt-3 px-1">
                        {entry.description ? (
                          <p className="mb-3 max-w-[70ch] text-[15px] leading-[1.6] text-[#333]" style={BODY_FONT}>
                            {entry.description}
                          </p>
                        ) : null}
                        <YouTubeEmbed videoId={videoId} title={entry.courseTitle} />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </CourseMaterialsChrome>
    );
  }

  // ─── Department tiles (main view) ─────────────────────────────────────────
  return (
    <CourseMaterialsChrome>
      <div className="flex items-center gap-3 rounded-[18px] bg-white py-[10px] pl-[18px] pr-[10px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <Search className="h-5 w-5 shrink-0 text-[#5c5c5c]" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search departments"
          className="min-w-0 flex-1 bg-transparent py-3 text-[17px] text-[#141414] outline-none placeholder:text-[#141414]/45"
          aria-label="Search departments"
        />
        {query ? (
          <button type="button" onClick={() => setQuery("")} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#141414]/10 text-[#141414]/70 transition hover:bg-[#141414]/20" aria-label="Clear search">
            <X className="h-4 w-4" />
          </button>
        ) : null}
        <span className="whitespace-nowrap px-2 text-[15px] italic text-[#5c5c5c] max-[600px]:hidden">
          {publishedDepartments.length} departments
        </span>
      </div>

      {!ready ? (
        <div className="mt-4 rounded-[20px] bg-white p-10 text-center text-[16px] italic text-[#141414]/65">Loading departments…</div>
      ) : error ? (
        <div className="mt-4 rounded-[20px] bg-white p-10 text-center">
          <h3 className="text-[18px] font-bold text-[#141414]">Course materials unavailable</h3>
          <p className="mt-2 text-[15px] text-[#141414]/65">{error}</p>
        </div>
      ) : visibleDepartments.length === 0 ? (
        <div className="mt-4 rounded-[20px] border border-dashed border-[#141414]/30 bg-white p-12 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-[#141414]/30" />
          <h3 className="mt-5 text-[18px] font-bold text-[#141414]">No departments found</h3>
          <p className="mx-auto mt-2 max-w-sm text-[15px] text-[#141414]/65">We could not find any departments matching your search.</p>
          <button type="button" onClick={() => setQuery("")} className="mt-5 inline-flex min-h-[44px] items-center rounded-full bg-[#141414] px-5 text-[14px] font-bold text-[#FFC700]">
            Clear search
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-[14px] md:grid-cols-2">
          {visibleDepartments.map((department, index) => {
            const popped = poppedId === department.id;
            return (
              <AnimatedItem key={department.id} index={index} className="flex">
                <div
                  className={`group relative flex min-h-[172px] w-full flex-col items-start justify-between gap-[18px] overflow-hidden rounded-[18px] border-2 p-[22px] transition-[transform,box-shadow,border-color] duration-300 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none ${
                    popped ? "-translate-y-[5px] border-[#FFC700] shadow-[0_16px_30px_rgba(40,30,0,0.35)]" : "border-transparent hover:border-[#FFC700]"
                  }`}
                  style={{
                    backgroundColor: "#141414",
                    backgroundImage: "linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)",
                    backgroundSize: "18px 18px",
                  }}
                >
                  <DepartmentDrawing
                    name={department.name}
                    className={`pointer-events-none absolute -bottom-1 -right-1.5 h-auto w-[58%] max-w-[330px] origin-[70%_60%] transition-[transform,opacity,color] duration-500 [transition-timing-function:cubic-bezier(.34,1.56,.64,1)] motion-reduce:transition-none max-[640px]:w-[70%] ${
                      popped
                        ? "rotate-[-5deg] scale-[1.16] text-[#FFC700] opacity-100"
                        : "text-[#D9D4C3] opacity-[.38] group-hover:rotate-[-2deg] group-hover:scale-[1.04] group-hover:opacity-60"
                    }`}
                  />
                  <button
                    type="button"
                    aria-label={`Show the ${department.name} drawing`}
                    aria-pressed={popped}
                    onClick={() => setPoppedId(popped ? null : department.id)}
                    className="absolute inset-0 z-[1] rounded-[18px] focus-visible:outline focus-visible:outline-[3px] focus-visible:-outline-offset-4 focus-visible:outline-[#FFC700]"
                  />
                  <h2 className="pointer-events-none relative m-0 max-w-[62%] text-[21px] font-bold leading-[1.2] text-white max-[640px]:max-w-[80%]">
                    {department.name}
                  </h2>
                  <button
                    type="button"
                    onClick={() => openDepartment(department)}
                    className="relative z-[2] inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[#FFC700] px-4 text-[15px] font-bold text-[#141414] transition hover:brightness-95"
                  >
                    View course materials
                    <ArrowRight className="h-4 w-4" strokeWidth={2.4} />
                  </button>
                </div>
              </AnimatedItem>
            );
          })}
        </div>
      )}
    </CourseMaterialsChrome>
  );
}
