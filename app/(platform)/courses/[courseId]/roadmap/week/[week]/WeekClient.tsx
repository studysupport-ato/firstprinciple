"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EducationalText } from "@/components/learning/EducationalText";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { readStudentDayProgressMap } from "@/lib/student/readProgress";
import type { DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

/**
 * TEMPORARY: true opens every lesson in a week for manual checking (no "Locked" lessons).
 * Set back to false to restore the normal order (finish a lesson to unlock the next).
 */
const UNLOCK_ALL_LESSONS = true;

export default function WeekClient({ course, week, days, preview = false }: { course: Course; week: Week; days: Lesson[]; preview?: boolean }) {
  const [dayProgress, setDayProgress] = useState<Record<string, DayProgress>>({});
  const { authenticated } = useAuthSession();
  const router = useRouter();

  const [pendingHref, setPendingHref] = useState<string | null>(null);

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

  useEffect(() => {
    if (pendingHref !== null && authenticated === true) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }, [authenticated, pendingHref, router]);

  function handleDayClick(event: React.MouseEvent, href: string, free: boolean) {
    if (preview) return;
    if (authenticated === true) return;
    // The first lesson of each topic opens without an account.
    if (free) return;

    event.preventDefault();
    setPendingHref(href);
  }

  const completed = days.filter((day) => dayProgress[day.id]?.status === "completed").length;
  const percent = days.length ? Math.round((completed / days.length) * 100) : 0;
  
  // Find the first non-completed lesson
  const firstIncompleteIndex = days.findIndex(day => dayProgress[day.id]?.status !== "completed");
  const nextLesson = firstIncompleteIndex !== -1 ? days[firstIncompleteIndex] : undefined;

  return (
    <div
      className="relative min-h-screen overflow-x-clip pb-16"
      style={{ background: "var(--gold-sweep)" }}
    >
      <AuthModal
        open={pendingHref !== null && authenticated === false}
        onClose={() => setPendingHref(null)}
        redirectTo={pendingHref ?? undefined}
        onSuccess={(destination) => {
          setPendingHref(null);
          router.push(destination);
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

      <div className="relative z-10 px-[40px] pt-[22px] max-[900px]:px-[18px] max-[900px]:pt-5">
        <div className="mx-auto max-w-[1220px]">
          
          {/* ── BACK LINK ── */}
          <Link
            href={`/courses/${course.id}/roadmap`}
            className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1A1814]/60 transition hover:text-[#1A1814]"
          >
            <ArrowLeft size={14} strokeWidth={2.5} />
            <EducationalText text={course.title} />
          </Link>

          {/* ── BREADCRUMB ── */}
          <p className="mb-[2px] text-[11px] font-bold uppercase tracking-[0.14em] text-[#26231C]/55">
            {course.code} · TOPIC
          </p>

          <div className="mb-10">
            <AnimatedItem>
              <h1 className="font-sans text-[52px] font-black leading-[1.0] tracking-[-0.02em] text-[#1A1814] max-[900px]:text-[34px]">
                <EducationalText text={week.title} />
              </h1>
              <p className="mb-[12px] mt-[8px] text-[17px] font-medium text-[#26231C]/80">
                {days.length} lessons
              </p>
            </AnimatedItem>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px]">
            {/* LEFT COLUMN: LESSONS CARD */}
            <div className="rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] md:p-8">
              <div className="mb-6 flex items-baseline justify-between border-b border-[#3A3428] pb-4">
                <h2 className="text-[26px] font-black tracking-[-0.02em] text-[#F6EFDC]">Lessons</h2>
                <span className="text-[13px] font-semibold text-[#F6EFDC]/60">{days.length} lessons</span>
              </div>
              
              <div className="grid gap-x-8 gap-y-0 sm:grid-cols-2">
                {days.map((day, index) => {
                  const status = dayProgress[day.id]?.status;
                  const isComplete = status === "completed";
                  
                  let visualState: "completed" | "in_progress" | "next_up" | "locked" = "locked";
                  if (isComplete) {
                    visualState = "completed";
                  } else if (index === firstIncompleteIndex) {
                    // This is the active lesson. If started in Supabase it's "in_progress", otherwise it's "next_up"
                    visualState = status === "in_progress" ? "in_progress" : "next_up";
                  } else if (index === firstIncompleteIndex + 1) {
                    // The lesson immediately following the active one
                    visualState = "next_up";
                  } else {
                    // Strictly lock anything that comes after (unless every lesson is temporarily open for checking)
                    visualState = UNLOCK_ALL_LESSONS ? "next_up" : "locked";
                  }
                  
                  const previewQuery = preview ? "&preview=1" : "";
                  const href = `/courses/${course.id}/chapter/${day.chapterId}/lesson/${day.id}?week=${week.weekNumber}${previewQuery}`;

                  let circleStyle = "";
                  let textStyle = "";
                  let statusText = "";
                  let statusColor = "";

                  switch (visualState) {
                    case "completed":
                      circleStyle = "border-[#E9BC3A] bg-[#E9BC3A] text-[#1A1814]";
                      textStyle = "text-[#F6EFDC]";
                      statusText = "Completed";
                      statusColor = "text-[#E9BC3A]";
                      break;
                    case "in_progress":
                      circleStyle = "border-[#E9BC3A] border-[2px] bg-transparent text-[#F6EFDC]";
                      textStyle = "text-[#F6EFDC]";
                      statusText = "In progress";
                      statusColor = "text-[#F6EFDC]";
                      break;
                    case "next_up":
                      circleStyle = "border-[#E9BC3A]/30 border text-[#F6EFDC]/80 bg-transparent";
                      textStyle = "text-[#F6EFDC]";
                      statusText = "Next up";
                      statusColor = "text-[#F6EFDC]/50";
                      break;
                    case "locked":
                      circleStyle = "bg-[#3A3428] text-[#F6EFDC]/60";
                      textStyle = "text-[#F6EFDC]/60";
                      statusText = "Locked";
                      statusColor = "text-[#F6EFDC]/30";
                      break;
                  }

                  if (index === 0 && authenticated === false && !isComplete) {
                    statusText = "Free lesson · no account needed";
                    statusColor = "text-[#E9BC3A]";
                  }

                  // Add bottom border to all except the last row(s) to match the separated rows look
                  const isLastRow = index >= days.length - 2 && (days.length % 2 === 0 ? true : index === days.length - 1);

                  return (
                    <AnimatedItem key={day.id} index={index} delay={0.06}>
                      <Link
                        href={href}
                        onClick={(event) => handleDayClick(event, href, index === 0)}
                        className={`group flex items-center gap-4 py-5 transition hover:opacity-80 ${!isLastRow ? 'border-b border-[#3A3428]/60' : ''}`}
                      >
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${circleStyle}`}>
                          {visualState === "completed" ? <Check size={16} strokeWidth={3} /> : (index + 1)}
                        </span>
                        <div>
                          <h3 className={`font-sans text-[15px] font-bold leading-tight ${textStyle} line-clamp-1`}>
                            <EducationalText text={day.title} />
                          </h3>
                          <p className={`mt-0.5 text-[12px] font-medium ${statusColor}`}>
                            {statusText}
                          </p>
                        </div>
                      </Link>
                    </AnimatedItem>
                  );
                })}
              </div>
            </div>

            {/* RIGHT COLUMN: SIDE CARDS */}
            <div className="flex flex-col gap-6">
              {/* Progress Card */}
              <AnimatedItem delay={0.1}>
                <div className="rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] md:p-8">
                  <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F6EFDC]">Your progress</h3>
                  <div className="mb-3 font-sans text-[64px] font-black leading-none tracking-[-0.02em] text-[#F6EFDC]">
                    {percent}%
                  </div>
                  <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-[#3A3428]">
                    <div className="h-full rounded-full bg-[#E9BC3A]" style={{ width: `${percent}%` }} />
                  </div>
                  <div className="text-[13px] font-medium text-[#F6EFDC]/90">
                    {completed} of {days.length} lessons finished
                  </div>
                </div>
              </AnimatedItem>

              {/* Up Next Card */}
              <AnimatedItem delay={0.2}>
                <div className="rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] md:p-8">
                  <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F6EFDC]">Up next</h3>
                  <div className="font-sans text-[26px] font-black leading-tight tracking-[-0.01em] text-[#F6EFDC]">
                    <EducationalText text={nextLesson?.title ?? "Course complete!"} />
                  </div>
                  {nextLesson && (
                    <>
                      <div className="mt-2 mb-6 text-[13px] font-medium text-[#F6EFDC]/70">
                        Lesson {firstIncompleteIndex + 1} · about 25 minutes
                      </div>
                      <Link
                        href={`/courses/${course.id}/chapter/${nextLesson.chapterId}/lesson/${nextLesson.id}?week=${week.weekNumber}${preview ? "&preview=1" : ""}`}
                        className="block w-full rounded-full bg-[#8F6500] py-3.5 text-center text-[14px] font-bold text-[#F6EFDC] transition hover:brightness-110"
                      >
                        Resume lesson
                      </Link>
                    </>
                  )}
                </div>
              </AnimatedItem>

              {/* Info Card */}
              <AnimatedItem delay={0.3}>
                <div className="rounded-[24px] bg-[#1A1814] p-6 shadow-[0_2px_14px_rgba(0,0,0,0.22)] md:p-8">
                  <p className="text-[13.5px] leading-relaxed text-[#F6EFDC]/90">
                    Each lesson ends with a five-question check. Finish it to unlock the next day.
                  </p>
                </div>
              </AnimatedItem>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}