"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { Check } from "lucide-react";
import { getActiveStudentId } from "@/lib/auth/mock";
import { createProgressFactsRepository, type DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

export default function RoadmapClient({ course, weeks, daysByWeek }: { course: Course; weeks: Week[]; daysByWeek: Record<string, Lesson[]> }) {
  const [dayProgress, setDayProgress] = useState<Record<string, DayProgress>>({});

  useEffect(() => {
    let active = true;
    const repository = createProgressFactsRepository("local");

    void (async () => {
      try {
        const studentId = getActiveStudentId();
        const rows = await repository.listDayProgressForCourse(studentId, course.id);
        if (!active) return;
        setDayProgress(Object.fromEntries(rows.map((row) => [row.dayId, row])));
      } catch (error) {
        console.error("[Back2Basics with Kwamina] Failed to read day progress from local", error);
        if (active) setDayProgress({});
      }
    })();

    return () => {
      active = false;
    };
  }, [course.id]);

  const totalDays = Object.values(daysByWeek).reduce((total, days) => total + days.length, 0);
  return <div className="mx-auto max-w-[1260px] px-5 py-8 md:px-10 md:py-12 xl:px-12"><div className="mb-10 flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-[#666666]"><Link href={`/courses/${course.id}`}>Courses</Link><span>/</span><span className="font-semibold text-[#FFBE00]">{course.code}</span><span>/</span><span>Roadmap</span></div><div className="mb-14 grid gap-8 xl:grid-cols-12 xl:items-end"><AnimatedItem className="xl:col-span-8"><div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#FFBE00]">{course.code}</div><h1 className="editorial-heading mb-5 text-5xl md:text-[5.2rem]">{course.title} roadmap</h1><p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#525252]">Follow the published course structure from week to week.</p></AnimatedItem><AnimatedItem delay={0.1} direction="left" className="xl:col-span-4"><div className="rounded-[30px] bg-[#121212] p-8 text-white"><span className="mb-4 block text-[10px] font-bold uppercase tracking-[0.2em] text-[#F3C27A]">Course roadmap</span><div className="mb-2 font-serif text-5xl">{totalDays}</div><p className="text-[#D4D4D8]">teaching days across {weeks.length} weeks.</p></div></AnimatedItem></div><div className="grid gap-5 md:grid-cols-2">{weeks.map((week, index) => { const days = daysByWeek[week.id] ?? []; const completed = days.filter((day) => dayProgress[day.id]?.status === "completed").length; return <AnimatedItem key={week.id} delay={index * 0.06}><Link href={`/courses/${course.id}/roadmap/week/${week.weekNumber}`} className="group block h-full rounded-[26px] border border-[#E7E5E2] bg-[#F7F6F3] p-6 transition-all hover:-translate-y-1 hover:bg-white md:p-8"><span className="mb-3 block text-[10px] font-bold uppercase tracking-[0.24em] text-[#FFBE00]">Week {week.weekNumber}</span><h2 className="font-serif text-3xl text-[#111111] md:text-4xl">{week.title}</h2><p className="mt-4 text-sm leading-relaxed text-[#666666]">{week.description}</p><div className="mt-8 border-t border-[#E5E5E5] pt-5"><div className="mb-3 flex justify-between text-[10px] font-bold uppercase tracking-[0.16em] text-[#777777]"><span>{completed} of {days.length} days</span>{completed === days.length && days.length ? <span className="inline-flex items-center gap-1 text-[#059669]"><Check size={14} /> Complete</span> : <span>Available</span>}</div><div className="h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-[#FFBE00]" style={{ width: `${days.length ? completed / days.length * 100 : 0}%` }} /></div></div></Link></AnimatedItem>; })}</div></div>;
}