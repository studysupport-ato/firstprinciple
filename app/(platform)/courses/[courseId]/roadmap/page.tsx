"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowRight, Check, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { getCompletedLessons } from "@/lib/courseProgress";
import { chapters, lessonSlug, weeks } from "@/lib/roadmapData";

export default function RoadmapPage() {
  const params = useParams();
  const courseId = params.courseId as string;
  const [completedLessons, setCompletedLessons] = useState<string[]>([]);
  const [previewWeek, setPreviewWeek] = useState<number | null>(null);

  useEffect(() => {
    setCompletedLessons(getCompletedLessons(courseId));
  }, [courseId]);

  return (
    <div className="mx-auto max-w-[1260px] px-5 py-8 md:px-10 md:py-12 xl:px-12">
      <div className="mb-10 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]">
        <Link href={`/courses/${courseId}`} className="transition-colors hover:text-[#111111]">Courses</Link>
        <span className="text-[#D1D5DB]">/</span>
        <Link href={`/courses/${courseId}`} className="font-semibold text-[#2563EB] transition-colors hover:text-[#1D4ED8]">MATH 151</Link>
        <span className="text-[#D1D5DB]">/</span>
        <span>Roadmap</span>
      </div>

      <div className="mb-14 grid grid-cols-1 gap-8 xl:grid-cols-12 xl:items-end">
        <AnimatedItem className="xl:col-span-8">
          <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#2563EB]">MATH 151</div>
          <h1 className="editorial-heading mb-5 text-5xl leading-[0.94] md:text-[5.2rem]">Algebra roadmap</h1>
          <p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252] md:text-[1.12rem]">
            Follow the course in order. Each topic opens as its own learning session, so you can move from the outline directly into the ideas and examples.
          </p>
        </AnimatedItem>

        <AnimatedItem delay={0.1} direction="left" className="xl:col-span-4">
          <div className="rounded-[30px] bg-[#121212] p-8 text-white shadow-[0_20px_45px_rgba(17,17,17,0.12)] md:p-9">
            <span className="mb-4 block font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#9CC3FF]">Course roadmap</span>
            <div className="mb-2 font-serif text-5xl leading-none">25</div>
            <p className="max-w-[16rem] font-sans text-base leading-relaxed text-[#D4D4D8]">
              teaching days across three parts of Algebra.
            </p>
          </div>
        </AnimatedItem>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {weeks.map((week, index) => {
          const chapter = chapters[index];
          const completedCount = week.days.filter((day) => completedLessons.includes(lessonSlug(day.title))).length;
          const isCurrent = index === 0 || weeks[index - 1].days.every((day) => completedLessons.includes(lessonSlug(day.title)));
          return (
            <AnimatedItem key={week.week} delay={index * 0.06}>
              <Link href={`/courses/${courseId}/roadmap/week/${week.week}`} onClick={(event) => { if (!isCurrent) { event.preventDefault(); setPreviewWeek(week.week); } }} className="group block h-full rounded-[26px] border border-[#E7E5E2] bg-[#F7F6F3] p-6 transition-all hover:-translate-y-1 hover:border-[#DAD5CE] hover:bg-white hover:shadow-[0_16px_36px_rgba(17,17,17,0.06)] md:p-8">
                <div className="mb-10 flex items-start justify-between gap-4">
                  <div>
                    <span className="mb-3 block font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">Week {week.week}</span>
                    <h2 className="font-serif text-3xl leading-tight text-[#111111] transition-colors group-hover:text-[#2563EB] md:text-4xl">{chapter.title}</h2>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E5E5E5] bg-white text-[#111111] transition-all group-hover:border-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white"><ArrowRight size={15} /></span>
                </div>
                <p className="max-w-lg font-sans text-sm leading-relaxed text-[#666666]">{chapter.description}</p>
                <div className="mt-8 border-t border-[#E5E5E5] pt-5">
                  <div className="mb-3 flex items-center justify-between font-sans text-[10px] font-bold uppercase tracking-[0.16em] text-[#777777]"><span>{completedCount} of {week.days.length} sessions</span><span className="inline-flex items-center gap-1">{isCurrent ? "Available" : <><LockKeyhole size={11} /> Upcoming</>}</span></div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#2563EB] transition-all" style={{ width: `${(completedCount / week.days.length) * 100}%` }} /></div>
                </div>
                {completedCount === week.days.length ? <div className="mt-4 inline-flex items-center gap-1 font-sans text-xs font-semibold text-[#059669]"><Check size={14} /> Week complete</div> : null}
              </Link>
            </AnimatedItem>
          );
        })}
      </div>

      {previewWeek ? (
        <div className="fixed left-1/2 top-1/2 z-50 w-[min(420px,calc(100vw-3rem))] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#F5D48A] bg-[#FFFBEB] p-5 shadow-[0_20px_50px_rgba(17,17,17,0.16)]" role="alert">
          <div className="flex items-start justify-between gap-4"><div><div className="font-sans text-sm font-semibold text-[#92400E]">Finish the previous week first</div><p className="mt-1 font-sans text-xs leading-relaxed text-[#A16207]">Complete the current week to keep the course progression clear.</p></div><button type="button" onClick={() => setPreviewWeek(null)} className="font-sans text-xs font-semibold text-[#A16207]">Dismiss</button></div>
        </div>
      ) : null}
    </div>
  );
}