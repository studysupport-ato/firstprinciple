"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EducationalText } from "@/components/learning/EducationalText";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { Check } from "lucide-react";
import { readStudentDayProgressMap } from "@/lib/student/readProgress";
import type { DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

// Inline SVG diagrams keyed by chapter/week title keyword — purely decorative
function ChapterDiagram({ title }: { title: string }) {
  const t = title.toLowerCase();

  if (t.includes("real number")) {
    return (
      <svg viewBox="0 0 160 80" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="40" x2="150" y2="40" stroke="#E9BC3A" strokeWidth="1.5" />
        <polygon points="148,36 156,40 148,44" fill="#E9BC3A" />
        {[40, 65, 90, 115].map((x) => (
          <line key={x} x1={x} y1="35" x2={x} y2="45" stroke="#E9BC3A" strokeWidth="1.2" />
        ))}
        <circle cx="65" cy="40" r="4" fill="#E9BC3A" />
        <circle cx="90" cy="40" r="4" fill="#1A1814" stroke="#E9BC3A" strokeWidth="1.5" />
        <path d="M 65 40 Q 77.5 18 90 40" stroke="#E9BC3A" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  if (t.includes("complex") && (t.includes(" i") || t.includes("1") || t.includes("one") || (!t.includes("ii") && !t.includes("2")))) {
    return (
      <svg viewBox="0 0 160 100" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="80" x2="150" y2="80" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="80" y1="95" x2="80" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        <polygon points="148,76 156,80 148,84" fill="#E9BC3A" />
        <polygon points="76,12 80,4 84,12" fill="#E9BC3A" />
        <line x1="80" y1="80" x2="130" y2="35" stroke="#E9BC3A" strokeWidth="1.5" />
        <path d="M 100 80 Q 105 65 95 60" stroke="#E9BC3A" strokeWidth="1" fill="none" />
        <circle cx="130" cy="35" r="3.5" fill="#E9BC3A" />
        <line x1="130" y1="35" x2="130" y2="80" stroke="#E9BC3A" strokeWidth="0.8" strokeDasharray="4 3" />
        <line x1="80" y1="35" x2="130" y2="35" stroke="#E9BC3A" strokeWidth="0.8" strokeDasharray="4 3" />
      </svg>
    );
  }

  if (t.includes("complex")) {
    return (
      <svg viewBox="0 0 160 130" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="65" x2="150" y2="65" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="80" y1="120" x2="80" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        <circle cx="80" cy="65" r="44" stroke="#E9BC3A" strokeWidth="1.3" strokeDasharray="5 3" />
        {[
          [80, 21], [124, 65], [80, 109], [36, 65],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="#E9BC3A" />
        ))}
      </svg>
    );
  }

  if (t.includes("vector") && (t.includes(" i") || t.includes("1") || t.includes("one") || (!t.includes("ii") && !t.includes("2")))) {
    return (
      <svg viewBox="0 0 160 120" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="100" x2="150" y2="100" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="20" y1="110" x2="20" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="20" y1="100" x2="110" y2="30" stroke="#E9BC3A" strokeWidth="1.6" />
        <polygon points="106,24 115,28 108,34" fill="#E9BC3A" />
        <line x1="20" y1="100" x2="140" y2="60" stroke="#E9BC3A" strokeWidth="1.6" />
        <polygon points="135,54 145,57 138,65" fill="#E9BC3A" />
      </svg>
    );
  }

  if (t.includes("vector")) {
    return (
      <svg viewBox="0 0 160 110" fill="none" className="h-full w-full opacity-60">
        <polygon points="30,90 120,90 140,30 50,30" stroke="#E9BC3A" strokeWidth="1.4" fill="none" />
        <line x1="30" y1="90" x2="140" y2="30" stroke="#E9BC3A" strokeWidth="0.9" strokeDasharray="5 3" />
        <polygon points="115,86 125,90 115,94" fill="#E9BC3A" />
        <polygon points="136,34 141,27 146,34" fill="#E9BC3A" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 160 100" fill="none" className="h-full w-full opacity-60">
      <line x1="10" y1="80" x2="150" y2="80" stroke="#E9BC3A" strokeWidth="1.2" />
      <line x1="30" y1="95" x2="30" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
      <polygon points="148,76 156,80 148,84" fill="#E9BC3A" />
      <polygon points="26,12 30,4 34,12" fill="#E9BC3A" />
    </svg>
  );
}

export default function RoadmapClient({ course, weeks, daysByWeek, preview = false }: { course: Course; weeks: Week[]; daysByWeek: Record<string, Lesson[]>; preview?: boolean }) {
  const [dayProgress, setDayProgress] = useState<Record<string, DayProgress>>({});

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const map = await readStudentDayProgressMap(course.id);
        if (!active) return;
        setDayProgress(map ?? {});
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to read day progress from Supabase", error);
        if (active) setDayProgress({});
      }
    })();

    return () => {
      active = false;
    };
  }, [course.id]);

  const totalDays = Object.values(daysByWeek).reduce((total, days) => total + days.length, 0);
  const previewQuery = preview ? "?preview=1" : "";

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "var(--gold-sweep)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      {/* BUILDING IMAGE */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 top-0 z-0" style={{ mixBlendMode: "multiply" }}>
        <div
          className="absolute right-[-40px] top-0 h-[420px] w-[82%] min-w-[700px] max-[900px]:left-0 max-[900px]:right-auto max-[900px]:h-[240px] max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:opacity-55"
          style={{
            backgroundImage: "url('/courses.jpeg')",
            backgroundSize: "cover",
            backgroundPosition: "left center",
            filter: "grayscale(1) contrast(1.2) brightness(1.6)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 25%, #000 100%), linear-gradient(180deg, #000 0%, #000 60%, transparent 85%)",
            WebkitMaskComposite: "source-in",
            maskImage: "linear-gradient(90deg, transparent 0%, #000 25%, #000 100%), linear-gradient(180deg, #000 0%, #000 60%, transparent 85%)",
            maskComposite: "intersect",
          }}
        />
      </div>

      <div className="relative z-10 px-[40px] pt-[28px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          
          {/* ── BACK LINK ── */}
          <Link
            href={`/courses`}
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Course library
          </Link>

          {/* ── BREADCRUMB ── */}
          <p className="mb-[2px] text-[11px] font-black uppercase tracking-[0.14em] text-[#1A1814]">
            {course.code} · {course.title}
          </p>

          <div className="mb-10">
            <AnimatedItem>
              <h1 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-[#1A1814] max-[900px]:text-[34px]">
                <EducationalText text={course.title} />
              </h1>
              <p className="mt-[10px] max-w-[520px] text-[15px] font-medium leading-[1.55] text-[#1A1814]/65">
                {weeks.length} topic{weeks.length !== 1 ? "s" : ""}. Open one to see its lessons.
              </p>
            </AnimatedItem>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {weeks.map((week, index) => {
              const days = daysByWeek[week.id] ?? [];
              const completed = days.filter((day) => dayProgress[day.id]?.status === "completed").length;
              const comingSoon = week.comingSoon ?? false;

              const cardContent = (
                <>
                  {/* Faint grid-paper texture */}
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.06]"
                    style={{
                      backgroundImage:
                        "linear-gradient(#E9BC3A 1px, transparent 1px), linear-gradient(90deg, #E9BC3A 1px, transparent 1px)",
                      backgroundSize: "24px 24px",
                    }}
                  />

                  {/* Math diagram — top-right decorative */}
                  {!comingSoon && (
                    <div className="pointer-events-none absolute right-4 top-4 h-[110px] w-[140px] opacity-100">
                      <ChapterDiagram title={week.title} />
                    </div>
                  )}

                  {/* Content */}
                  <div className="relative flex flex-1 flex-col">
                    <span className={`mb-1 block text-[10px] font-bold uppercase tracking-[0.14em] ${comingSoon ? "text-[#F6EFDC]/30" : "text-[#E9BC3A]/70"}`}>
                      Week {week.weekNumber}
                    </span>
                    <h2 className={`max-w-[55%] font-sans text-[20px] font-black leading-tight ${comingSoon ? "text-[#F6EFDC]/50" : "text-[#F6EFDC]"}`}>
                      <EducationalText text={week.title} />
                    </h2>
                    
                    <p className={`mt-2 max-w-[55%] text-[12px] leading-relaxed line-clamp-2 ${comingSoon ? "text-[#F6EFDC]/30" : "text-[#F6EFDC]/50"}`}>
                      <EducationalText text={week.description} />
                    </p>

                    <div className="mt-auto pt-6 flex items-end justify-between">
                      {comingSoon ? (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#1A1814] border border-[#3A3428] px-5 py-2.5 text-[13px] font-bold text-[#F6EFDC]/40">
                          Coming soon
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#8F6500] px-5 py-2.5 text-[13px] font-bold text-[#F6EFDC] transition group-hover:brightness-110">
                          View lessons
                          <ArrowRight size={14} strokeWidth={2.5} />
                        </span>
                      )}
                      
                      {!comingSoon && days.length > 0 && (
                        <span className="text-[11px] font-semibold text-[#E9BC3A]/60">
                          {completed}/{days.length} done
                        </span>
                      )}
                    </div>
                  </div>
                </>
              );

              return (
                <AnimatedItem key={week.id} delay={index * 0.06} direction="up" distance={20}>
                  {comingSoon ? (
                    <div aria-disabled="true" className="group relative flex min-h-[180px] flex-col overflow-hidden rounded-[18px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] grayscale cursor-not-allowed">
                      {cardContent}
                    </div>
                  ) : (
                    <Link
                      href={`/courses/${course.id}/roadmap/week/${week.weekNumber}${previewQuery}`}
                      className="group relative flex min-h-[180px] flex-col overflow-hidden rounded-[18px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                    >
                      {cardContent}
                    </Link>
                  )}
                </AnimatedItem>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}