"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";

import type { QuestionDirectorySummary } from "@/lib/questions/repository";
import type { Course } from "@/lib/content/types/course";

// ── Year definitions ─────────────────────────────────────────────────────────
const YEARS = [
  { value: 1, label: "First year" },
  { value: 2, label: "Second year" },
  { value: 3, label: "Third year" },
  { value: 4, label: "Fourth year" },
] as const;

type YearValue = 1 | 2 | 3 | 4;

// ── Helpers ──────────────────────────────────────────────────────────────────
function coursesForYear(courses: Course[], year: YearValue) {
  // Courses don't carry a year field directly; infer from course code number
  // (e.g. MATH 151 → year 1, MATH 251 → year 2). Fall back to all if unknown.
  return courses.filter((c) => {
    const match = c.code?.match(/(\d)/);
    if (!match) return true;
    return parseInt(match[1], 10) === year;
  });
}

function questionsForCourses(questions: QuestionDirectorySummary[], courseIds: Set<string>) {
  return questions.filter((q) => courseIds.has(q.courseId));
}

export default function QuestionsExperience({
  initialQuestions,
  courses,
  preview,
}: {
  initialQuestions: QuestionDirectorySummary[];
  courses: Course[];
  preview: boolean;
}) {
  const [selectedYear, setSelectedYear] = useState<YearValue | null>(null);

  // Pre-compute stats per year
  const yearStats = useMemo(() =>
    YEARS.map(({ value, label }) => {
      const yearCourses = coursesForYear(courses, value);
      const courseIds = new Set(yearCourses.map((c) => c.id));
      const questionCount = questionsForCourses(initialQuestions, courseIds).length;
      return { value, label, courseCount: yearCourses.length, questionCount, courses: yearCourses };
    }),
  [courses, initialQuestions]);

  // If a year is selected, show its courses
  if (selectedYear !== null) {
    const year = yearStats.find((y) => y.value === selectedYear)!;
    const yearCourses = year.courses;
    const courseIds = new Set(yearCourses.map((c) => c.id));

    return (
      <div
        className="relative min-h-screen overflow-x-clip pb-16"
        style={{ background: "var(--gold-sweep)" }}
      >
        {/* Grid overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        {/* Building image */}
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-[position:62%_center] opacity-25 grayscale mix-blend-multiply"
          style={{ backgroundImage: "url('/last.jpeg')" }}
        />

        <div className="relative z-10 px-[40px] pt-[40px] max-[900px]:px-[18px]">
          <div className="mx-auto max-w-[1220px]">
            <button
              onClick={() => setSelectedYear(null)}
              className="mb-5 inline-flex items-center gap-1.5 text-[14px] font-bold text-[#1A1814]/80 transition hover:text-[#1A1814]"
            >
              ← Practice questions
            </button>

            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/70">
              Question Bank
            </p>
            <h1 className="font-sans text-[clamp(3.5rem,8vw,5.5rem)] font-black leading-[1.0] tracking-[-0.03em] text-[#1A1814]">
              {year.label}
            </h1>
            <p className="mt-3 text-[20px] font-medium text-[#1A1814]/80">
              Choose a course to practise.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {yearCourses.length === 0 ? (
                <div className="col-span-2 rounded-[24px] bg-[#1A1814]/10 p-10 text-center font-bold text-[#1A1814]/60">
                  No courses available for this year yet.
                </div>
              ) : (
                yearCourses.map((course) => {
                  const qCount = initialQuestions.filter((q) => q.courseId === course.id).length;
                  const firstChapterId = initialQuestions.find((q) => q.courseId === course.id)?.chapterId ?? "";
                  const href = firstChapterId
                    ? `/courses/${course.id}/chapter/${firstChapterId}/practice?limit=10${preview ? "&preview=1" : ""}`
                    : "#";

                  return (
                    <Link
                      key={course.id}
                      href={href}
                      className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:px-7 md:py-6"
                    >
                      <div className="flex items-center gap-5">
                        <span className="flex h-[32px] shrink-0 items-center justify-center rounded-[8px] bg-[#E9BC3A] px-3 text-[11px] font-black uppercase tracking-[0.08em] text-[#1A1814]">
                          {course.code}
                        </span>
                        <div>
                          <div className="font-sans text-[22px] font-black leading-[1.1] text-[#F6EFDC] md:text-[24px]">
                            {course.title}
                          </div>
                          <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/60">
                            {course.chapterIds?.length || 0} lessons · {qCount} questions
                          </div>
                        </div>
                      </div>
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                        <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Main year-selection view ──────────────────────────────────────────────
  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "var(--gold-sweep)" }}
    >
      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: "linear-gradient(#1A1814 1px, transparent 1px), linear-gradient(90deg, #1A1814 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />
      {/* Building image */}
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-[position:62%_center] opacity-25 grayscale mix-blend-multiply"
        style={{ backgroundImage: "url('/last.jpeg')" }}
      />

      <div className="relative z-10 px-[40px] pt-[40px] max-[900px]:px-[18px]">
        <div className="mx-auto max-w-[1220px]">
          {/* Header */}
          <p className="mb-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#1A1814]/60">
            Question Bank
          </p>
          <h1 className="font-sans text-[clamp(2.8rem,7vw,5rem)] font-black leading-[1.0] tracking-[-0.025em] text-[#1A1814]">
            Practice questions
          </h1>
          <p className="mt-3 text-[18px] font-medium text-[#26231C]/75">
            Choose your year, then a course.
          </p>

          {/* Year cards grid */}
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {yearStats.map(({ value, label, courseCount, questionCount }) => (
              <button
                key={value}
                onClick={() => setSelectedYear(value)}
                className="group flex items-center justify-between gap-4 rounded-[24px] bg-[#1A1814] p-6 text-left shadow-[0_2px_14px_rgba(0,0,0,0.22)] transition-transform duration-300 hover:-translate-y-1 md:p-7"
              >
                <div>
                  <div className="font-sans text-[22px] font-black text-[#F6EFDC] md:text-[24px]">
                    {label}
                  </div>
                  <div className="mt-1 text-[13px] font-medium text-[#F6EFDC]/55">
                    {courseCount} courses · {questionCount} questions
                  </div>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#8F6500] text-[#F6EFDC] transition group-hover:bg-[#A37400]">
                  <ArrowRight className="h-5 w-5" strokeWidth={2.5} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
