"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Map, Play } from "lucide-react";
import { AnimatedItem } from "@/components/motion/AnimatedItem";
import { getActiveStudentId } from "@/lib/auth/mock";
import { createProgressFactsRepository, type DayProgress } from "@/lib/progress";
import type { Course, Week } from "@/lib/content/types/course";
import type { Lesson } from "@/lib/content/types/lesson";

export default function CourseOverviewClient({ course, weeks, days }: { course: Course; weeks: Week[]; days: Lesson[] }) {
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

  const dayStates = days.map((day) => dayProgress[day.id]);
  const completed = dayStates.filter((day) => day?.status === "completed").length;
  const percent = days.length ? Math.round((completed / days.length) * 100) : 0;
  const nextLesson = days.find((day) => dayProgress[day.id]?.status !== "completed") ?? days[0];
  const nextWeek = nextLesson ? weeks.find((week) => week.id === nextLesson.weekId) : undefined;
  const nextHref = nextLesson ? `/courses/${course.id}/chapter/${nextLesson.chapterId}/lesson/${nextLesson.id}?week=${nextWeek?.weekNumber ?? ""}` : undefined;

  return <div className="mx-auto max-w-[1200px] p-8 md:p-16"><div className="mb-12 flex items-center gap-2"><Link href="/courses" className="font-sans text-[10px] font-semibold uppercase tracking-widest text-[#666666]">Courses</Link><span className="text-[#E5E5E5]">/</span><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#FFBE00]">{course.code}</span></div><div className="grid gap-12 xl:grid-cols-12"><div className="flex flex-col gap-12 xl:col-span-8"><AnimatedItem><h1 className="editorial-heading mb-6 text-5xl md:text-6xl">{course.title}</h1><p className="editorial-body max-w-2xl text-lg leading-relaxed text-[#666666]">{course.description}</p></AnimatedItem><AnimatedItem delay={0.1}><div className="relative overflow-hidden rounded-2xl bg-[#111111] p-8 text-white"><span className="mb-4 block font-sans text-[10px] font-bold uppercase tracking-widest text-[#FFBE00]">{nextLesson ? "Up Next" : "Course Status"}</span><h3 className="mb-2 font-serif text-3xl">{nextLesson?.title ?? "Building the learning path"}</h3>{nextHref ? <Link href={nextHref} className="mt-6 inline-flex items-center gap-3 rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#111111]"><Play size={16} fill="currentColor" />Resume Learning</Link> : null}</div></AnimatedItem><div className="grid gap-6 md:grid-cols-3"><div className="rounded-2xl border border-[#E5E5E5] bg-white p-6"><span className="field-label">Days Completed</span><div className="mt-2 font-serif text-3xl">{completed}/{days.length}</div></div><div className="rounded-2xl border border-[#E5E5E5] bg-white p-6"><span className="field-label">Course Progress</span><div className="mt-2 font-serif text-3xl">{percent}%</div></div><div className="rounded-2xl border border-[#E5E5E5] bg-white p-6"><span className="field-label">Weeks</span><div className="mt-2 font-serif text-3xl">{weeks.length}</div></div></div></div><div className="flex flex-col gap-6 xl:col-span-4"><div className="rounded-2xl border border-[#E5E5E5] bg-white p-6"><h4 className="font-sans font-semibold text-[#111111]">Course Progress</h4><div className="mt-6 font-serif text-5xl">{percent}%</div><div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-transparent"><div className="h-full rounded-full bg-[#FFBE00]" style={{ width: `${percent}%` }} /></div></div><Link href={`/courses/${course.id}/roadmap`} className="flex items-center gap-4 rounded-2xl border border-[#E5E5E5] bg-white p-6 hover:border-[#111111]"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-transparent"><Map size={18} /></span><span><strong className="block">Spatial Roadmap</strong><small className="text-[#666666]">View full curriculum</small></span></Link></div></div></div>;
}