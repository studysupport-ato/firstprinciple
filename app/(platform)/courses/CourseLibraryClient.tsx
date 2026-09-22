"use client";

import { AnimatedItem } from "@/components/motion/AnimatedItem";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { useEffect, useState } from "react";
import { getContinueLearning, getCourseCompletion } from "@/lib/progress";
import type { Course } from "@/lib/content/types/course";

import { WelcomeBanner } from "@/components/platform/WelcomeBanner";

export default function CourseLibraryClient({ courses }: { courses: Course[] }) {
  const [progress, setProgress] = useState<Record<string, { percent: number; resumeLesson: string }>>({});
  useEffect(() => { setProgress(Object.fromEntries(courses.map((course) => { const completion = getCourseCompletion(course.id); const next = getContinueLearning(course.id); return [course.id, { percent: completion.percent, resumeLesson: next ? `${next.status === "in_progress" ? "Resume" : "Begin"}: ${next.lessonTitle}` : "Course content coming soon" }]; }))); }, [courses]);
  return (
    <div className="mx-auto max-w-[1200px] p-8 md:p-16">
      <WelcomeBanner />
      <div className="mb-16"><AnimatedItem><h1 className="editorial-heading mb-4 text-4xl md:text-5xl">Course Library</h1><p className="editorial-body max-w-2xl text-[#666666]">Your enrolled programs and available curriculum for the academic year.</p></AnimatedItem></div><div className="mb-20"><AnimatedItem delay={0.1}><div className="mb-6 flex items-center gap-3"><BookOpen size={18} /><h2 className="font-sans text-lg font-semibold text-[#111111]">Active Enrollment</h2></div></AnimatedItem><div className="grid grid-cols-1 gap-6 lg:grid-cols-2">{courses.map((course, index) => { const info = progress[course.id] ?? { percent: 0, resumeLesson: "Loading…" }; return <AnimatedItem key={course.id} index={index} delay={0.2} direction="up" distance={20}><Link href={`/courses/${course.id}/roadmap`} className="group block"><div className="rounded-2xl border border-[#E5E5E5] bg-white p-8 shadow-sm transition-all duration-300 hover:border-[#FFBE00] hover:shadow-md"><div className="mb-6 flex items-center justify-between"><span className="font-sans text-xs font-bold uppercase tracking-widest text-[#FFBE00]">{course.code}</span><span className="font-sans text-xs font-medium text-[#666666]">{info.percent}% Complete</span></div><h3 className="mb-4 font-serif text-3xl text-[#111111] transition-colors group-hover:text-[#E5AA00]">{course.title}</h3><p className="mb-8 font-sans text-sm leading-relaxed text-[#666666]">{course.description}</p><div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-[#F7F7F8]"><div className="h-full rounded-full bg-[#FFBE00] transition-all duration-1000" style={{ width: `${info.percent}%` }} /></div><div className="flex items-center justify-between border-t border-[#E5E5E5] pt-6"><span className="font-sans text-sm font-medium text-[#111111]">{info.resumeLesson}</span><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F7F7F8] transition-colors group-hover:bg-[#FFBE00] group-hover:text-white"><ArrowRight size={14} /></span></div></div></Link></AnimatedItem>; })}</div></div>{courses.length === 0 ? <div className="rounded-2xl border border-dashed border-[#E5E5E5] p-8 text-sm text-[#666666]">No published courses are available yet.</div> : null}<div><AnimatedItem delay={0.3}><h2 className="mb-6 font-sans text-lg font-semibold text-[#111111]">Upcoming Curriculum</h2></AnimatedItem><div className="rounded-2xl border border-dashed border-[#E5E5E5] p-6 text-sm text-[#666666]">Additional curriculum will appear here when it is published.</div></div>
    </div>
  );
}