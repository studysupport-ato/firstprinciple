"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getChapter, getCourse } from "@/lib/content/access";
import { getCourseWeek, getWeekDays } from "@/lib/curriculum";

export default function AdminWeekWorkspace() {
  const { courseId, week: weekParam } = useParams<{ courseId: string; week: string }>();
  const week = getCourseWeek(courseId, Number(weekParam));
  const course = getCourse(courseId);
  if (!week || !course) return <div className="p-8 text-sm text-[#666666]">Week not found in the local curriculum.</div>;
  const days = getWeekDays(courseId, week);
  const chapter = getChapter(week.chapterIds[0] ?? "");

  return <div><AdminPageHeader title={`Week ${week.weekNumber} — ${week.title}`} description={week.description} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.code, href: `/admin/courses/${course.id}` }, { label: `Week ${week.weekNumber}` }]} /><div className="mb-6 flex items-center gap-3"><Link href={`/admin/courses/${course.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"><ArrowLeft size={15} />Course</Link><AdminStatusBadge status={days.every((day) => day.lesson) ? "Ready" : "Needs content"} /></div><section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-6 flex items-start justify-between"><div><div className="field-label">Week content card</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">{chapter?.title ?? week.title}</h2><p className="mt-2 text-sm text-[#666666]">{days.length} days in this week.</p></div><BookOpen size={20} /></div><div className="space-y-3">{days.map((day) => <div key={day.lessonId} className="flex flex-col gap-4 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 md:flex-row md:items-center md:justify-between"><div><div className="field-label">Day {day.dayNumber}</div><div className="mt-2 font-serif text-2xl text-[#111111]">{day.title}</div><p className="mt-1 text-sm text-[#666666]">{day.description}</p><div className="mt-2 text-xs text-[#666666]">{day.lesson ? `${day.lesson.blocks.length} content blocks` : "No day content authored yet"}</div></div>{day.lesson ? <Link href={`/admin/lessons/${day.lesson.id}`} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]">Open day editor <ArrowRight size={15} /></Link> : <Link href={`/admin/lessons/new?courseId=${course.id}&chapterId=${week.chapterIds[0] ?? ""}&weekId=${week.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]">Create day <ArrowRight size={15} /></Link>}</div>)}</div></section></div>;
}
