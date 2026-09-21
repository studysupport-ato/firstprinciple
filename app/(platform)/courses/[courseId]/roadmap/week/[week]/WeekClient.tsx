"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { createProgressFactsRepository, STUDENT_ID, type DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

export default function WeekClient({ course, week, days }: { course: Course; week: Week; days: Lesson[] }) {
  const [dayProgress, setDayProgress] = useState<Record<string, DayProgress>>({});
  const authenticated = useAuthSession();
  const router = useRouter();

  // Destination the student tried to enter before being gated.
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const repository = createProgressFactsRepository("supabase");

    void (async () => {
      try {
        const rows = await repository.listDayProgressForCourse(STUDENT_ID, course.id);
        if (!active) return;
        setDayProgress(Object.fromEntries(rows.map((row) => [row.dayId, row])));
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to read day progress from Supabase", error);
        if (active) setDayProgress({});
      }
    })();

    return () => {
      active = false;
    };
  }, [course.id]);

  // When auth resolves from null → true, complete the pending navigation.
  // When it resolves from null → false, the modal will open (open={pendingHref !== null && authenticated === false}).
  useEffect(() => {
    if (pendingHref !== null && authenticated === true) {
      router.push(pendingHref);
      setPendingHref(null);
    }
  }, [authenticated, pendingHref, router]);

  function handleDayClick(event: React.MouseEvent, href: string) {
    // Preview mode: ?preview=1 is present — let the link through unconditionally.
    if (new URLSearchParams(window.location.search).get("preview") === "1") return;

    // Authenticated: let the normal Link navigate.
    if (authenticated === true) return;

    // Still resolving (null) or unauthenticated (false): intercept the click.
    // If null, we store the href and wait. The effect above will navigate once resolved.
    // If false, the modal will open because open={pendingHref !== null && authenticated === false}.
    event.preventDefault();
    setPendingHref(href);
  }

  const completed = days.filter((day) => dayProgress[day.id]?.status === "completed").length;

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-10 md:py-12 xl:px-12">
      {/* AuthModal — only shown when we know the student is unauthenticated (not while loading) */}
      <AuthModal
        open={pendingHref !== null && authenticated === false}
        onClose={() => setPendingHref(null)}
        initialView="signup"
        redirectTo={pendingHref ?? undefined}
        onSuccess={(destination) => {
          setPendingHref(null);
          router.push(destination);
        }}
      />

      <div className="mb-10 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]">
        <Link href={`/courses/${course.id}/roadmap`}>Roadmap</Link>
        <span>/</span>
        <span>Week {week.weekNumber}</span>
      </div>

      <div className="mb-14 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end">
        <AnimatedItem>
          <div className="mb-5 text-[10px] font-bold uppercase tracking-[0.22em] text-[#C96B2D]">
            {course.code} · Week {week.weekNumber}
          </div>
          <h1 className="editorial-heading mb-5 text-5xl md:text-[5.5rem]">{week.title}</h1>
          <p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252]">
            {week.description} Work through this week&apos;s published days.
          </p>
        </AnimatedItem>

        <AnimatedItem delay={0.1} direction="left">
          <div className="rounded-[26px] border border-[#E5E5E5] bg-white p-6">
            <div className="mb-3 flex justify-between text-[10px] font-bold uppercase tracking-[0.18em] text-[#777777]">
              <span>Weekly progress</span>
              <span>{completed}/{days.length}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F1F1F1]">
              <div
                className="h-full rounded-full bg-[#C96B2D]"
                style={{ width: `${days.length ? (completed / days.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </AnimatedItem>
      </div>

      <div className="space-y-4">
        {days.map((day, index) => {
          const isComplete = dayProgress[day.id]?.status === "completed";
          const href = `/courses/${course.id}/chapter/${day.chapterId}/lesson/${day.id}?week=${week.weekNumber}`;

          return (
            <AnimatedItem key={day.id} index={index} delay={0.06}>
              <Link
                href={href}
                onClick={(event) => handleDayClick(event, href)}
                className="group flex items-center justify-between gap-5 rounded-[24px] border border-[#E7E5E2] bg-white p-5 hover:border-[#C96B2D] md:p-7"
              >
                <div>
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">
                      Day {index + 1}
                    </span>
                    {isComplete ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-[#059669]">
                        <Check size={11} /> Complete
                      </span>
                    ) : null}
                  </div>
                  <h2 className="font-serif text-2xl text-[#111111] md:text-3xl">{day.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-[#666666]">{day.description}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E5] bg-[#F7F7F8]">
                  <ArrowRight size={15} />
                </span>
              </Link>
            </AnimatedItem>
          );
        })}
      </div>
    </div>
  );
}