"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { EducationalText } from "@/components/learning/EducationalText";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { readStudentDayProgressForCourses } from "@/lib/student/readProgress";
import type { Course } from "@/lib/content/types/course";
import type { PublishedCourseStructureSummary } from "@/lib/content/publishedStructure";
import { useAuthSession } from "@/lib/auth/useAuthSession";

type LibraryCourse = Course & { weeks: number; days: number };

type CourseProgress = {
  percent: number;
  resumeLesson: string;
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Task 40C-3 / 40F.2 — completion + resume derived from real Supabase facts.
 *
 * The student's `student_day_progress` rows supply completion state (40C-3);
 * the authoritative published Course -> Week -> Day structure supplies the day
 * list and its order (40F.2), replacing the local curriculum fixtures that only
 * represented 3 days while the published course has 25.
 */
function deriveCourseProgress(
  summary: PublishedCourseStructureSummary | undefined,
  statusByDayId: Map<string, string>,
): CourseProgress {
  const publishedDays = summary?.days ?? [];

  const roadmapDays = publishedDays.map((day) => ({
    dayId: day.dayId,
    title: day.title,
    state:
      statusByDayId.get(day.dayId) === "completed"
        ? ("completed" as const)
        : statusByDayId.get(day.dayId) === "in_progress"
          ? ("in_progress" as const)
          : ("not_started" as const),
  }));

  // Completion: completed / total published days, clamped 0..100.
  const completedDays = roadmapDays.filter((entry) => entry.state === "completed").length;
  const totalDays = roadmapDays.length;
  const percent = totalDays ? clampPercent((completedDays / totalDays) * 100) : 0;

  // Resume: the first in-progress day, else the first not-started day.
  // Null once every authored day is complete — same rule as before, including
  // the existing empty-state copy, so the rendered text is unchanged.
  const next = roadmapDays.find((entry) => entry.state !== "completed");

  return {
    percent,
    resumeLesson: next
      ? `${next.state === "in_progress" ? "Resume" : "Begin"}: ${next.title}`
      : "Course content coming soon",
  };
}

export default function CourseLibraryClient({
  courses,
  structure,
}: {
  courses: Course[];
  structure: Record<string, PublishedCourseStructureSummary>;
}) {
  const { authenticated, student } = useAuthSession();
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
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

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        // ONE bounded query for every card. Returns null when signed out, so
        // public browsing issues no private progress query at all.
        const rows = await readStudentDayProgressForCourses(courses.map((course) => course.id));
        if (!active) return;

        const statusByDayId = new Map((rows ?? []).map((row) => [row.dayId, row.status]));

        setProgress(
          Object.fromEntries(
            courses.map((course) => [course.id, deriveCourseProgress(structure[course.id], statusByDayId)]),
          ),
        );
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to read course library progress from Supabase", error);
        if (!active) return;
        // Signed-out / failed read: no local progress is consulted as a fallback.
        setProgress(
          Object.fromEntries(
            courses.map((course) => [course.id, deriveCourseProgress(structure[course.id], new Map())]),
          ),
        );
      }
    })();

    return () => {
      active = false;
    };
  }, [courses]);

  const libraryCourses = useMemo<LibraryCourse[]>(
    () =>
      courses.map((course) => {
        // Task 40F.2: authoritative published week/day counts.
        const summary = structure[course.id];
        return { ...course, weeks: summary?.weekCount ?? 0, days: summary?.dayCount ?? 0 };
      })
      // A course with no published lessons yet stays off the library until it has some.
      .filter((course) => course.days > 0),
    [courses, structure],
  );

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-10"
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

      {/* BUILDING IMAGE — kept, bleeds off right edge */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 top-0 z-0" style={{ mixBlendMode: "multiply" }}>
        <div
          className="absolute right-[-40px] top-0 h-[400px] w-[82%] min-w-[760px] max-[900px]:left-0 max-[900px]:right-auto max-[900px]:h-[220px] max-[900px]:w-full max-[900px]:min-w-0 max-[900px]:opacity-60"
          style={{
            backgroundImage: "url('/courses.jpeg')",
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

      <div className="relative z-10 px-[40px] pt-[28px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">

            {/* ── TOP BREADCRUMB ── */}
            <div className="mb-[20px] flex items-center gap-2 text-[12px] font-black uppercase tracking-[0.12em] text-[#1A1814]">
              <span className="opacity-55">Learning space</span>
              <span className="opacity-55">·</span>
              <span>Courses</span>
            </div>

            {/* ── PAGE HEADER ── */}
            <div className="relative mb-[32px]">
              <AnimatedItem>
                <h1 className="font-sans text-[clamp(2.8rem,5.5vw,4.5rem)] font-black leading-[0.95] tracking-[-0.04em] text-[#1A1814] max-[900px]:text-[32px]">
                  Course library
                </h1>
                <p className="mt-[10px] max-w-[520px] text-[15px] font-medium leading-[1.55] text-[#1A1814]/65">
                  Your enrolled programs and available curriculum for the academic year.
                </p>
              </AnimatedItem>
            </div>

            {/* ── AVAILABLE COURSES ── */}
            <div className="mb-5 text-[20px] font-black tracking-[-0.03em] text-[#1A1814]">
              Available courses
            </div>

            <div className="flex flex-col gap-4 max-w-[540px]">
              {libraryCourses.map((course, i) => {
                const info = course.comingSoon ? undefined : progress[course.id];
                const cardClass = "group flex items-center gap-5 rounded-[18px] bg-[#1A1814] px-5 py-5 shadow-[0_4px_20px_rgba(0,0,0,0.25)]";
                const card = (
                  <>
                      {/* Icon square — solid gold */}
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[12px] bg-[#E9BC3A]">
                        <BookOpen size={24} strokeWidth={2} className="text-[#1A1814]" />
                      </div>

                      {/* Text */}
                      <div className="min-w-0 flex-1">
                        <div className="text-[20px] font-black leading-tight tracking-[-0.02em] text-[#F6EFDC]">
                          <EducationalText text={course.title} />
                        </div>
                        <div className="mt-1 text-[12px] font-bold uppercase tracking-[0.08em] text-[#F6EFDC]/40">
                          {course.code}{course.weeks > 0 ? ` · ${course.weeks} weeks` : ""}
                        </div>
                        {course.comingSoon ? (
                          <div className="mt-2 text-[13px] font-semibold text-[#F6EFDC]/50">Coming soon</div>
                        ) : info ? (
                          <div className="mt-2 text-[13px] font-semibold text-[#F6EFDC] truncate">
                            {info.resumeLesson}
                          </div>
                        ) : null}
                      </div>

                      {/* Arrow button */}
                      {course.comingSoon ? null : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8F6500] transition group-hover:brightness-110">
                          <ArrowRight size={18} strokeWidth={2.5} className="text-[#F6EFDC]" />
                        </div>
                      )}
                  </>
                );
                return (
                  <AnimatedItem key={course.id} index={i} delay={0.08} direction="up" distance={18}>
                    {course.comingSoon ? (
                      <div aria-disabled="true" className={`${cardClass} cursor-not-allowed opacity-60 grayscale`}>
                        {card}
                      </div>
                    ) : (
                      <Link href={`/courses/${course.id}`} className={`${cardClass} transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(0,0,0,0.32)]`}>
                        {card}
                      </Link>
                    )}
                  </AnimatedItem>
                );
              })}
            </div>

            {libraryCourses.length === 0 ? (
              <p className="pb-6 text-[13px] font-medium text-[#1A1814]/60">No published courses are available yet.</p>
            ) : null}

          </div>
        </div>
      </div>
    </div>
  );
}
