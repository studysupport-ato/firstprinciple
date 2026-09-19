"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAssessments, getCourse, getQuestionsByCourse } from "@/lib/content/access";
import { getCourseWeeks, getWeekDays } from "@/lib/curriculum";
import { analyzeCourseQuality } from "@/lib/content/quality";
import { BookOpen, FileText, Plus, Upload } from "lucide-react";

export default function AdminCourseCommandCenter() {
  const { courseId } = useParams<{ courseId: string }>();
  const course = getCourse(courseId);
  const weeks = getCourseWeeks(courseId);
  const questions = getQuestionsByCourse(courseId);
  const assessments = getAssessments(courseId);
  const days = weeks.flatMap((week) => getWeekDays(courseId, week));
  const quality = analyzeCourseQuality(courseId);

  if (!course) return <div className="p-8 text-sm text-[#666666]">Course not found in the local curriculum.</div>;

  return (
    <div>
      <AdminPageHeader title={course.title} description={course.description} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.code }]} />
      <div className="mb-8 flex flex-wrap gap-3"><Link href={`/courses/${course.id}/roadmap?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">Preview as student</Link><Link href={`/admin/courses/${course.id}/import`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Upload size={15} />Import material</Link><Link href={`/admin/lessons/new?courseId=${course.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Plus size={15} />Create day</Link><Link href={`/admin/courses/${course.id}/quality`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]">Review quality</Link></div>
      <div className="grid gap-4 md:grid-cols-4"><Metric label="Weeks" value={weeks.length} /><Metric label="Days" value={days.length} /><Metric label="Questions" value={questions.length} /><Metric label="Assessments" value={assessments.length} /></div>
      {quality ? <section className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#E5E5E5] bg-white p-5 md:flex-row md:items-center md:justify-between"><div><div className="field-label">Course readiness</div><div className="mt-2 flex flex-wrap items-center gap-3"><AdminStatusBadge status={quality.readiness} /><span className="text-sm text-[#666666]">{quality.metrics.daysWithContent} / {quality.metrics.days} Days with content · {quality.errors} errors · {quality.warnings} warnings</span></div></div><Link href={`/admin/courses/${course.id}/quality`} className="text-sm font-semibold text-[#111111] hover:text-[#2563EB]">Open quality report</Link></section> : null}
      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-6 flex items-center justify-between"><div><div className="field-label">Course curriculum</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">Weeks and days</h2></div><AdminStatusBadge status={quality?.readiness ?? "draft"} /></div><div className="space-y-4">{weeks.map((week) => { const weekDays = getWeekDays(course.id, week); const weekReport = quality?.weeks.find((item) => item.week.id === week.id); return <Link key={week.id} href={`/admin/courses/${course.id}/weeks/${week.weekNumber}`} className="block rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5 transition-colors hover:border-[#111111]"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="field-label">Week {week.weekNumber}</div><h3 className="mt-2 font-serif text-2xl text-[#111111]">{week.title}</h3><p className="mt-2 text-sm leading-6 text-[#666666]">{week.description}</p></div><div className="flex items-center gap-2 text-sm text-[#666666]"><BookOpen size={15} />{weekReport?.readyDayCount ?? 0} / {weekDays.length} Days ready</div></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{weekDays.map((day) => <div key={day.lessonId} className="rounded-xl border border-[#E5E5E5] bg-white px-3 py-3"><div className="field-label">Day {day.dayNumber}</div><div className="mt-2 line-clamp-2 text-sm font-medium text-[#111111]">{day.title}</div><div className="mt-1 text-xs text-[#666666]">{day.lesson ? `${day.lesson.blocks.length} blocks` : "Needs content"}</div></div>)}</div></Link>; })}</div></section>
      <div className="mt-8 grid gap-4 md:grid-cols-2"><Link href={`/admin/questions?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><FileText size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Question bank</div><p className="mt-2 text-sm text-[#666666]">Manage {questions.length} questions for {course.code}.</p></Link><Link href={`/admin/assessments?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><BookOpen size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Assessments</div><p className="mt-2 text-sm text-[#666666]">Manage {assessments.length} assessment definitions.</p></Link></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5"><div className="field-label">{label}</div><div className="mt-5 font-serif text-4xl text-[#111111]">{value}</div></div>; }
