"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { EducationalText } from "@/components/learning/EducationalText";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { readStudentDayProgressMap } from "@/lib/student/readProgress";
import type { DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

// Inline SVG diagrams keyed by chapter/week title keyword — purely decorative
function ChapterDiagram({ title }: { title: string }) {
  const t = title.toLowerCase();

  // Real Numbers — number line with open circle
  if (t.includes("real number")) {
    return (
      <svg viewBox="0 0 160 80" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="40" x2="150" y2="40" stroke="#E9BC3A" strokeWidth="1.5" />
        <polygon points="148,36 156,40 148,44" fill="#E9BC3A" />
        {[40, 65, 90, 115].map((x) => (
          <line key={x} x1={x} y1="35" x2={x} y2="45" stroke="#E9BC3A" strokeWidth="1.2" />
        ))}
        {/* filled dot */}
        <circle cx="65" cy="40" r="4" fill="#E9BC3A" />
        {/* open circle */}
        <circle cx="90" cy="40" r="4" fill="#1A1814" stroke="#E9BC3A" strokeWidth="1.5" />
        {/* arc above */}
        <path d="M 65 40 Q 77.5 18 90 40" stroke="#E9BC3A" strokeWidth="1.2" fill="none" />
      </svg>
    );
  }

  // Complex Numbers I — argand plane with angle
  if (t.includes("complex") && (t.includes(" i") || t.includes("1") || t.includes("one") || (!t.includes("ii") && !t.includes("2")))) {
    return (
      <svg viewBox="0 0 160 100" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="80" x2="150" y2="80" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="80" y1="95" x2="80" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        <polygon points="148,76 156,80 148,84" fill="#E9BC3A" />
        <polygon points="76,12 80,4 84,12" fill="#E9BC3A" />
        {/* vector */}
        <line x1="80" y1="80" x2="130" y2="35" stroke="#E9BC3A" strokeWidth="1.5" />
        {/* arc for angle */}
        <path d="M 100 80 Q 105 65 95 60" stroke="#E9BC3A" strokeWidth="1" fill="none" />
        {/* dot at tip */}
        <circle cx="130" cy="35" r="3.5" fill="#E9BC3A" />
        {/* dashed lines */}
        <line x1="130" y1="35" x2="130" y2="80" stroke="#E9BC3A" strokeWidth="0.8" strokeDasharray="4 3" />
        <line x1="80" y1="35" x2="130" y2="35" stroke="#E9BC3A" strokeWidth="0.8" strokeDasharray="4 3" />
      </svg>
    );
  }

  // Complex Numbers II — unit circle
  if (t.includes("complex")) {
    return (
      <svg viewBox="0 0 160 130" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="65" x2="150" y2="65" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="80" y1="120" x2="80" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        <circle cx="80" cy="65" r="44" stroke="#E9BC3A" strokeWidth="1.3" strokeDasharray="5 3" />
        {/* cardinal dots */}
        {[
          [80, 21], [124, 65], [80, 109], [36, 65],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4" fill="#E9BC3A" />
        ))}
      </svg>
    );
  }

  // Vector Algebra I — two vectors from origin
  if (t.includes("vector") && (t.includes(" i") || t.includes("1") || t.includes("one") || (!t.includes("ii") && !t.includes("2")))) {
    return (
      <svg viewBox="0 0 160 120" fill="none" className="h-full w-full opacity-60">
        <line x1="10" y1="100" x2="150" y2="100" stroke="#E9BC3A" strokeWidth="1.2" />
        <line x1="20" y1="110" x2="20" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
        {/* vector 1 */}
        <line x1="20" y1="100" x2="110" y2="30" stroke="#E9BC3A" strokeWidth="1.6" />
        <polygon points="106,24 115,28 108,34" fill="#E9BC3A" />
        {/* vector 2 */}
        <line x1="20" y1="100" x2="140" y2="60" stroke="#E9BC3A" strokeWidth="1.6" />
        <polygon points="135,54 145,57 138,65" fill="#E9BC3A" />
      </svg>
    );
  }

  // Vector Algebra II — parallelogram
  if (t.includes("vector")) {
    return (
      <svg viewBox="0 0 160 110" fill="none" className="h-full w-full opacity-60">
        {/* parallelogram */}
        <polygon points="30,90 120,90 140,30 50,30" stroke="#E9BC3A" strokeWidth="1.4" fill="none" />
        {/* diagonal dashed */}
        <line x1="30" y1="90" x2="140" y2="30" stroke="#E9BC3A" strokeWidth="0.9" strokeDasharray="5 3" />
        {/* arrow on bottom side */}
        <polygon points="115,86 125,90 115,94" fill="#E9BC3A" />
        {/* arrow on right side */}
        <polygon points="136,34 141,27 146,34" fill="#E9BC3A" />
      </svg>
    );
  }

  // Default — simple axes
  return (
    <svg viewBox="0 0 160 100" fill="none" className="h-full w-full opacity-60">
      <line x1="10" y1="80" x2="150" y2="80" stroke="#E9BC3A" strokeWidth="1.2" />
      <line x1="30" y1="95" x2="30" y2="10" stroke="#E9BC3A" strokeWidth="1.2" />
      <polygon points="148,76 156,80 148,84" fill="#E9BC3A" />
      <polygon points="26,12 30,4 34,12" fill="#E9BC3A" />
    </svg>
  );
}

export default function CourseOverviewClient({ course, weeks, days }: { course: Course; weeks: Week[]; days: Lesson[] }) {
  const [dayProgress, setDayProgress] = useState<Record<string, DayProgress>>({});

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        // Task 40C-2: same Supabase day-progress source as Roadmap / Week view,
        // so all three agree on completion. null when signed out.
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

  const dayStates = days.map((day) => dayProgress[day.id]);
  const completed = dayStates.filter((day) => day?.status === "completed").length;
  const percent = days.length ? Math.round((completed / days.length) * 100) : 0;
  const nextLesson = days.find((day) => dayProgress[day.id]?.status !== "completed") ?? days[0];
  const nextWeek = nextLesson ? weeks.find((week) => week.id === nextLesson.weekId) : undefined;
  const nextHref = nextLesson
    ? `/courses/${course.id}/chapter/${nextLesson.chapterId}/lesson/${nextLesson.id}?week=${nextWeek?.weekNumber ?? ""}`
    : undefined;

  const topicCount = weeks.length;
  const topicWord = (n: number) => {
    const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
    return words[n] ?? n.toString();
  };

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "linear-gradient(135deg, #f0c84a 0%, #E9BC3A 45%, #d4a82e 100%)" }}
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
            href="/courses"
            className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            Course library
          </Link>

          {/* ── BREADCRUMB ── */}
          <p className="mb-[2px] text-[11px] font-black uppercase tracking-[0.14em] text-[#1A1814]">
            {course.code} · {course.title}
          </p>

          {/* ── TITLE ── */}
          <AnimatedItem>
            <h1 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-[#1A1814] max-[900px]:text-[34px]">
              <EducationalText text={course.title} />
            </h1>
            <p className="mb-[32px] mt-[10px] max-w-[520px] text-[15px] font-medium leading-[1.55] text-[#1A1814]/65">
              {topicWord(topicCount)} topic{topicCount !== 1 ? "s" : ""}. Open one to see its lessons.
            </p>
          </AnimatedItem>

          {/* ── CHAPTER GRID ── */}
          <div className="grid gap-4 sm:grid-cols-2">
            {weeks.map((week, i) => {
              const weekDays = days.filter((day) => day.weekId === week.id);
              const weekCompleted = weekDays.filter((day) => dayProgress[day.id]?.status === "completed").length;
              const chapterId = weekDays[0]?.chapterId;
              const href = chapterId
                ? `/courses/${course.id}/chapter/${chapterId}/lesson/${weekDays[0]?.id}?week=${week.weekNumber}`
                : `/courses/${course.id}/roadmap`;

              return (
                <AnimatedItem key={week.id} index={i} delay={0.07} direction="up" distance={20}>
                  <Link
                    href={href}
                    className="group relative flex min-h-[180px] flex-col overflow-hidden rounded-[18px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.28)]"
                  >
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
                    <div className="pointer-events-none absolute right-4 top-4 h-[110px] w-[140px] opacity-100">
                      <ChapterDiagram title={week.title} />
                    </div>

                    {/* Content */}
                    <div className="relative flex flex-1 flex-col">
                      <h2 className="max-w-[55%] font-sans text-[20px] font-black leading-tight text-[#F6EFDC]">
                        <EducationalText text={week.title} />
                      </h2>

                      {weekCompleted > 0 && (
                        <p className="mt-1 text-[11px] font-semibold text-[#E9BC3A]/60">
                          {weekCompleted}/{weekDays.length} lessons done
                        </p>
                      )}

                      <div className="mt-auto pt-4">
                        <span className="inline-flex items-center gap-2 rounded-full bg-[#8F6500] px-5 py-2.5 text-[13px] font-bold text-[#F6EFDC] transition group-hover:brightness-110">
                          View lessons
                          <ArrowRight size={14} strokeWidth={2.5} />
                        </span>
                      </div>
                    </div>
                  </Link>
                </AnimatedItem>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}