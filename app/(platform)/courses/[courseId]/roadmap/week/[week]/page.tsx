"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, LockKeyhole } from "lucide-react";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { getCourseRoadmap } from "@/lib/progress";
import { getChapter, getCourse } from "@/lib/content/access";
import { getCourseWeek, getCourseWeeks } from "@/lib/curriculum";

export default function WeekPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const courseId = params.courseId as string;
  const previewSuffix = searchParams.get("preview") === "1" ? "&preview=1" : "";
  const weekNumber = Number(params.week);
  const weeks = getCourseWeeks(courseId);
  const week = getCourseWeek(courseId, weekNumber);
  const course = getCourse(courseId);
  const courseRoadmap = getCourseRoadmap(courseId);
  const [previewWarning, setPreviewWarning] = useState<string | null>(null);

  if (!week) {
    return <div className="mx-auto max-w-[1100px] px-5 py-12 text-sm text-[#666666]">This week is not available in the local curriculum.</div>;
  }

  const days = courseRoadmap.find((entry) => entry.week.id === week.id)?.days ?? [];
  const chapter = getChapter(week.chapterIds[0] ?? "");
  const completedCount = days.filter((day) => day.state === "completed").length;
  const isWeekComplete = days.length > 0 && completedCount === days.length;
  const weekIndex = weeks.findIndex((candidate) => candidate.id === week.id);
  const nextWeek = weeks[weekIndex + 1];
  const previousWeek = weeks[weekIndex - 1];

  return (
    <div className="mx-auto max-w-[1100px] px-5 py-8 md:px-10 md:py-12 xl:px-12">
      <div className="mb-10 flex items-center gap-2 font-sans text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]"><Link href={`/courses/${courseId}/roadmap${previewSuffix ? "?preview=1" : ""}`} className="inline-flex items-center gap-2 hover:text-[#111111]"><ArrowLeft size={13} /> Roadmap</Link><span className="text-[#D1D5DB]">/</span><span>Week {week.weekNumber}</span></div>
      <div className="mb-14 grid gap-8 lg:grid-cols-[1fr_300px] lg:items-end"><AnimatedItem><div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">{course?.code ?? courseId} · Week {week.weekNumber}</div><h1 className="editorial-heading mb-5 text-5xl leading-[0.94] md:text-[5.5rem]">{chapter?.title ?? week.title}</h1><p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252]">{chapter?.description ?? week.description} Work through this week&apos;s days in order.</p></AnimatedItem><AnimatedItem delay={0.1} direction="left"><div className="rounded-[26px] border border-[#E5E5E5] bg-white p-6 shadow-[0_14px_32px_rgba(17,17,17,0.05)]"><div className="mb-3 flex items-center justify-between font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#777777]"><span>Weekly progress</span><span>{completedCount}/{days.length}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#F1F1F1]"><div className="h-full rounded-full bg-[#2563EB]" style={{ width: `${days.length ? (completedCount / days.length) * 100 : 0}%` }} /></div><p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">{isWeekComplete ? "This week is complete. You are ready for the next stage." : `${Math.max(days.length - completedCount, 0)} days remaining in this week.`}</p></div></AnimatedItem></div>
      <div className="space-y-4">{days.map((entry, dayIndex) => { const curriculumDay = entry.day; const locked = entry.state === "locked"; const completed = entry.state === "completed"; const lesson = curriculumDay.lesson; const isLocked = locked; const card = <div className={`group flex items-center justify-between gap-5 rounded-[24px] border p-5 md:p-7 ${lesson && !isLocked ? "border-[#E7E5E2] bg-white hover:-translate-y-0.5 hover:border-[#2563EB] hover:shadow-[0_14px_32px_rgba(17,17,17,0.06)]" : "border-[#E7E5E2] bg-[#FAF9F7]"}`}><div className="min-w-0 flex-1"><div className="mb-3 flex flex-wrap items-center gap-3"><span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Day {curriculumDay.dayNumber}</span>{completed ? <span className="inline-flex items-center gap-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-[#059669]"><Check size={11} /> Complete</span> : null}{isLocked ? <span className="inline-flex items-center gap-1 font-sans text-[9px] font-semibold uppercase tracking-[0.12em] text-[#999999]"><LockKeyhole size={11} /> Locked</span> : null}</div><h2 className="font-serif text-2xl leading-tight text-[#111111] md:text-3xl">{curriculumDay.title}</h2><p className="mt-2 max-w-2xl font-sans text-sm leading-relaxed text-[#666666]">{curriculumDay.description}</p></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#E5E5E5] bg-[#F7F7F8] text-[#111111]"><ArrowRight size={15} /></span></div>; return <AnimatedItem key={curriculumDay.lessonId} index={dayIndex} delay={0.06}>{lesson ? <Link href={`/courses/${courseId}/chapter/${lesson.chapterId}/lesson/${lesson.id}?week=${week.weekNumber}${previewSuffix}`} onClick={(event) => { if (isLocked) { event.preventDefault(); setPreviewWarning(curriculumDay.title); } }}>{card}</Link> : <div title="Day content has not been authored yet">{card}</div>}</AnimatedItem>; })}</div>
      <div className="mt-14 flex flex-col gap-4 border-t border-[#E5E5E5] pt-8 sm:flex-row sm:items-center sm:justify-between"><Link href={previousWeek ? `/courses/${courseId}/roadmap/week/${previousWeek.weekNumber}${previewSuffix ? "?preview=1" : ""}` : `/courses/${courseId}/roadmap${previewSuffix ? "?preview=1" : ""}`} className="inline-flex items-center gap-2 font-sans text-sm font-semibold text-[#666666] hover:text-[#111111]"><ArrowLeft size={15} /> {previousWeek ? `Week ${previousWeek.weekNumber}` : "Course roadmap"}</Link>{nextWeek && isWeekComplete ? <Link href={`/courses/${courseId}/roadmap/week/${nextWeek.weekNumber}${previewSuffix ? "?preview=1" : ""}`} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white hover:bg-[#2563EB]">Proceed to Week {nextWeek.weekNumber} <ArrowRight size={15} /></Link> : <span className="inline-flex items-center justify-center rounded-full bg-[#F1F1F1] px-6 py-3 font-sans text-sm font-semibold text-[#999999]">{nextWeek ? `Complete Week ${week.weekNumber} to continue` : "Course complete"}</span>}</div>
      {previewWarning ? <div className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#F5D48A] bg-[#FFFBEB] p-5 shadow-[0_20px_50px_rgba(17,17,17,0.16)]"><div className="flex items-start justify-between gap-4"><div><div className="font-sans text-sm font-semibold text-[#92400E]">Complete the previous day first</div><p className="mt-1 font-sans text-xs leading-relaxed text-[#A16207]">Continue through the week in order.</p></div><button type="button" onClick={() => setPreviewWarning(null)} className="font-sans text-xs font-semibold text-[#A16207]">Dismiss</button></div></div> : null}
    </div>
  );
}
