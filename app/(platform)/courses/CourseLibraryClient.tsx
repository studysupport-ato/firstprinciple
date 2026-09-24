"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { EducationalText } from "@/components/learning/EducationalText";
import Link from "next/link";
import { ArrowRight, BookOpen, CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { getContinueLearning, getCourseCompletion } from "@/lib/progress";
import type { Course } from "@/lib/content/types/course";
import { getCourseWeeks, getWeekDays } from "@/lib/curriculum";

type LibraryCourse = Course & { weeks: number; days: number };

type CourseProgress = {
  percent: number;
  resumeLesson: string;
};

function courseThumbnail(index: number) {
  const slot = (index % 5) + 1;
  return `/hero-images/img${slot}${slot === 5 ? ".webp" : ".jpg"}`;
}

export default function CourseLibraryClient({ courses }: { courses: Course[] }) {
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});

  useEffect(() => {
    setProgress(
      Object.fromEntries(
        courses.map((course) => {
          const completion = getCourseCompletion(course.id);
          const next = getContinueLearning(course.id);
          return [
            course.id,
            {
              percent: completion.percent,
              resumeLesson: next
                ? `${next.status === "in_progress" ? "Resume" : "Begin"}: ${next.lessonTitle}`
                : "Course content coming soon",
            },
          ];
        }),
      ),
    );
  }, [courses]);

  const libraryCourses = useMemo<LibraryCourse[]>(
    () =>
      courses.map((course) => {
        const weeks = getCourseWeeks(course.id);
        const days = weeks.reduce((count, week) => count + getWeekDays(course.id, week).length, 0);
        return { ...course, weeks: weeks.length, days };
      }),
    [courses],
  );

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#FFC700] pb-10">
      {/* BUILDING — true overflow: page-level, bleeds off right edge */}
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

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          <div className="relative overflow-visible">
            <div className="mb-[14px] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.1em] text-[#111111]/60">
                <span>Learning space</span>
                <span className="text-[8px]">●</span>
                <span className="text-[#111111]/80">Courses</span>
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
              <AnimatedItem>
                <p className="mb-[6px] mt-[26px] font-sans text-[15px] font-normal text-[#1d1d1d]">Your programs,</p>
                <h1 className="max-w-[560px] font-sans text-[46px] font-black leading-[1.0] tracking-[-0.01em] text-[#0c0c0c] max-[900px]:text-[30px]">
                  COURSE
                  <span className="block">LIBRARY.</span>
                </h1>
                <p className="mb-[20px] mt-[12px] max-w-[470px] text-[13.5px] leading-[1.55] text-[#333]/75">
                  Your enrolled programs and available curriculum for the academic year.
                </p>
              </AnimatedItem>
            </div>

            <div className="mb-1 mt-8 text-[20px] font-black tracking-[-0.05em] text-[#111111]">Available Courses</div>
            <p className="mb-4 text-[13px] font-medium text-[#111111]/55">Explore other courses and expand your knowledge.</p>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {libraryCourses.map((course, i) => {
                const info = progress[course.id];
                return (
                  <AnimatedItem key={course.id} index={i} delay={0.08} direction="up" distance={18}>
                    <Link
                      href={`/courses/${course.id}/roadmap`}
                      className="group relative flex min-h-[240px] flex-col overflow-hidden rounded-[16px] bg-white p-5 pr-[128px] shadow-[0_2px_8px_rgba(0,0,0,0.06)] transition hover:-translate-y-1 hover:shadow-[0_10px_24px_rgba(0,0,0,0.10)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#F5A800]">{course.code}</span>
                        {info && info.percent > 0 ? (
                          <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#111111]/40">
                            {info.percent}% complete
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1.5 text-[17px] font-extrabold leading-snug text-[#111111]"><EducationalText text={course.title} /></div>
                      <p className="mt-1.5 line-clamp-2 text-[12.5px] leading-relaxed text-[#111111]/60"><EducationalText text={course.description} /></p>

                      <div className="mt-3 flex items-center gap-5 text-[12px] font-semibold text-[#111111]/55">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays size={14} strokeWidth={2.2} className="text-[#111111]/45" />
                          {course.weeks} {course.weeks === 1 ? "week" : "weeks"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BookOpen size={14} strokeWidth={2.2} className="text-[#111111]/45" />
                          {course.days} {course.days === 1 ? "day" : "days"}
                        </span>
                      </div>

                      {info ? (
                        <p className="mt-2 line-clamp-1 text-[11px] font-medium text-[#111111]/45">{info.resumeLesson}</p>
                      ) : null}

                      <div className="mt-auto flex items-center gap-1.5 pt-4 text-[13px] font-bold text-[#111111]">
                        View Course
                        <ArrowRight size={15} strokeWidth={2.6} className="text-[#F5A800] transition-transform group-hover:translate-x-1" />
                      </div>

                      <div className="pointer-events-none absolute inset-y-0 right-0 w-[112px] overflow-hidden">
                        <img src={courseThumbnail(i)} alt="" aria-hidden className="h-full w-full object-cover grayscale" />
                        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/20 to-transparent" />
                        <div className="absolute right-0 top-0 h-[44px] w-[18px] rounded-bl-[10px] bg-[#FFC700]" />
                      </div>
                    </Link>
                  </AnimatedItem>
                );
              })}
            </div>

            {libraryCourses.length === 0 ? (
              <p className="pb-6 text-[13px] font-medium text-[#111111]/60">No published courses are available yet.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
