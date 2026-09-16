"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { getCompletedLessons } from "@/lib/courseProgress";
import { chapters, intensityClasses, intensityLabel, lessonEntries, lessonSlug, weeks, type DayBlock } from "@/lib/roadmapData";

export default function WeekPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const weekNumber = Number(params.week);
  const weekIndex = Math.min(Math.max(weekNumber - 1, 0), weeks.length - 1);
  const week = weeks[weekIndex];
  const chapter = chapters[weekIndex];
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);

  useEffect(() => {
    setCompletedLessons(getCompletedLessons(courseId));
  }, [courseId]);

  const completedSet = new Set(completedLessons);
  const completedCount = week.days.filter((day) => completedSet.has(lessonSlug(day.title))).length;
  const isWeekComplete = completedCount === week.days.length;
  const nextWeek = weeks[weekIndex + 1];
  const previousWeek = weeks[weekIndex - 1];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-10 md:py-12 xl:px-12">
      <div className="mb-10 flex items-center gap-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]">
        <Link href={`/courses/${courseId}/roadmap`} className="inline-flex items-center gap-2 transition-colors hover:text-[#111111]"><ArrowLeft size={13} /> Roadmap</Link>
        <span className="text-[#D1D5DB]">/</span>
        <span>Week {week.week}</span>
      </div>

      <div className="mb-14 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end">
        <AnimatedItem>
          <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">MATH 151 · Week {week.week}</div>
          <h1 className="editorial-heading mb-5 text-5xl leading-[0.94] md:text-[5.5rem]">{chapter.title}</h1>
          <p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252]">{chapter.description} Work through this week&apos;s focused sessions in order.</p>
        </AnimatedItem>
        <AnimatedItem delay={0.1} direction="left">
          <div className="rounded-[26px] border border-[#E5E5E5] bg-white p-6 shadow-[0_14px_32px_rgba(17,17,17,0.05)]">
            <div className="mb-3 flex items-center justify-between font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#777777]"><span>Weekly progress</span><span>{completedCount}/{week.days.length}</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-[#F1F1F1]"><div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${(completedCount / week.days.length) * 100}%` }} /></div>
            <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">{isWeekComplete ? "This week is complete. You are ready for the next stage." : `${week.days.length - completedCount} sessions remaining in this week.`}</p>
          </div>
        </AnimatedItem>
      </div>

      <div className="space-y-4">
        {week.days.map((day: DayBlock, dayIndex) => {
          const slug = lessonSlug(day.title);
          const entryIndex = lessonEntries.findIndex((entry) => entry.slug === slug && entry.weekIndex === weekIndex);
          const previousLesson = lessonEntries[entryIndex - 1];
          const isComplete = completedSet.has(slug);
          const isLocked = entryIndex > 0 && Boolean(previousLesson) && !completedSet.has(previousLesson.slug);

          return (
            <AnimatedItem key={day.title} index={dayIndex} delay={0.06}>
              <Link
                href={`/courses/${courseId}/chapter/${chapter.slug}/lesson/${slug}?week=${week.week}`}
                onClick={(event) => {
                  if (isLocked) {
                    event.preventDefault();
                    setPreviewWarning(slug);
                  }
                }}
                className={`group flex items-center justify-between gap-5 rounded-[24px] border p-5 transition-all md:p-7 ${isLocked ? "border-[#E7E5E2] bg-[#FAF9F7]" : "border-[#E7E5E2] bg-white hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-[0_14px_32px_rgba(17,17,17,0.06)]"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-center gap-3">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{day.days}</span>
                    <span className={`inline-flex rounded-full border border-current/10 px-2 py-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] ${intensityClasses(day.intensity)}`}>{intensityLabel(day.intensity)}</span>
                    {isComplete ? <span className="inline-flex items-center gap-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-[#059669]"><Check size={11} /> Complete</span> : null}
                    {isLocked ? <span className="inline-flex items-center gap-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-[#999999]"><LockKeyhole size={11} /> Locked</span> : null}
                  </div>
                  <h2 className="font-serif text-2xl leading-tight text-[#111111] transition-colors group-hover:text-[#2563EB] md:text-3xl">{day.title}</h2>
                  <p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#666666]">{day.note}</p>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E5] bg-[#F7F7F8] text-[#111111] transition-all group-hover:border-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white"><ArrowRight size={15} /></span>
              </Link>
            </AnimatedItem>
          );
        })}
      </div>

      <div className="mt-14 flex flex-col gap-4 border-t border-[#E5E5E5] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <Link href={previousWeek ? `/courses/${courseId}/roadmap/week/${previousWeek.week}` : `/courses/${courseId}/roadmap`} className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={15} /> {previousWeek ? `Week ${previousWeek.week}` : "Course roadmap"}</Link>
        {nextWeek ? (
          isWeekComplete ? (
            <Link href={`/courses/${courseId}/roadmap/week/${nextWeek.week}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white shadow-[0_10px_22px_rgba(17,17,17,0.14)] transition-colors hover:bg-[#2563EB]">Proceed to Week {nextWeek.week} <ArrowRight size={15} /></Link>
          ) : (
            <span className="inline-flex items-center justify-center rounded-full bg-[#F1F1F1] px-6 py-3 font-sans text-sm font-semibold text-[#999999]">Complete Week {week.week} to continue</span>
          )
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-[#E7F5EC] px-6 py-3 font-sans text-sm font-semibold text-[#2E7D57]"><Check size={15} /> Course complete</span>
        )}
      </div>

      {previewWarning ? (() => {
        const previewEntry = lessonEntries.find((entry) => entry.slug === previewWarning && entry.weekIndex === weekIndex);
        return (
          <div className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#F5D48A] bg-[#FFFBEB] p-5 shadow-[0_20px_50px_rgba(17,17,17,0.16)]" role="alert">
            <div className="flex items-start justify-between gap-4"><div><div className="font-sans text-sm font-semibold text-[#92400E]">Complete the previous session first</div><p className="mt-1 font-sans text-xs leading-relaxed text-[#A16207]">You can continue in order or preview this topic without changing your progress.</p></div><button type="button" onClick={() => setPreviewWarning(null)} className="font-sans text-xs font-semibold text-[#A16207] hover:text-[#92400E]">Dismiss</button></div>
            {previewEntry ? <div className="mt-4 flex justify-end"><Link href={`/courses/${courseId}/chapter/${chapter.slug}/lesson/${previewEntry.slug}?week=${week.week}`} className="inline-flex items-center rounded-full bg-[#111111] px-4 py-2 font-sans text-xs font-semibold text-white hover:bg-[#2563EB]">Preview anyway <ArrowRight size={13} className="ml-2" /></Link></div> : null}
          </div>
        );
      })() : null}
    </div>
  );
}
