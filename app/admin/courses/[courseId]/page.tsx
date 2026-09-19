"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getAssessments, getChapters, getCourse, getQuestionsByCourse } from "@/lib/content/access";
import { getCourseWeeks, getWeekDays } from "@/lib/curriculum";
import { analyzeCourseQuality } from "@/lib/content/quality";
import { removeLessonFromWeek, removeWeekRecord, saveCourseRecord, saveWeekRecord } from "@/lib/content/overrides";
import { BookOpen, FileText, Plus, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";

export default function AdminCourseCommandCenter() {
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();
  const course = getCourse(courseId);
  const weeks = getCourseWeeks(courseId);
  const chapters = getChapters(courseId);
  const questions = getQuestionsByCourse(courseId);
  const assessments = getAssessments(courseId);
  const days = weeks.flatMap((week) => getWeekDays(courseId, week));
  const quality = analyzeCourseQuality(courseId);
  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [weekTitle, setWeekTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ weekId: string; title: string } | null>(null);

  const nextWeekNumber = useMemo(() => Math.max(1, ...weeks.map((week) => week.weekNumber)) + 1, [weeks]);

  function handleCreateWeek() {
    if (!course) return;
    const safeWeekTitle = weekTitle.trim() || `Week ${nextWeekNumber}`;
    const safeChapterTitle = chapterTitle.trim() || chapters[0]?.title || "Chapter 1";
    const chapterId = chapters.find((chapter) => chapter.title.trim().toLowerCase() === safeChapterTitle.trim().toLowerCase())?.id ?? `${course.id}-chapter-${chapters.length + 1}`;
    const weekId = `${course.id}-week-${nextWeekNumber}`;

    if (!chapters.some((chapter) => chapter.id === chapterId)) {
      saveCourseRecord({ ...course, chapterIds: [...new Set([...course.chapterIds, chapterId])] });
    }

    const nextWeek = {
      id: weekId,
      courseId: course.id,
      chapterIds: [chapterId],
      title: safeWeekTitle,
      description: `${safeWeekTitle} for ${course.title}.`,
      weekNumber: nextWeekNumber,
      sessionIds: [],
    };

    saveWeekRecord(nextWeek);
    saveCourseRecord({ ...course, weekIds: [...new Set([...course.weekIds, nextWeek.id])] });
    setIsCreatingWeek(false);
    setWeekTitle("");
    setChapterTitle("");
    router.push(`/admin/courses/${course.id}/weeks/${nextWeekNumber}`);
  }

  function handleDeleteWeek(weekIdToDelete: string, weekTitleToDelete: string) {
    if (!course) return;
    const targetWeek = weeks.find((week) => week.id === weekIdToDelete);
    if (!targetWeek) return;

    setDeleteTarget({ weekId: targetWeek.id, title: weekTitleToDelete });
  }

  function confirmDeleteWeek() {
    if (!course || !deleteTarget) return;

    const targetWeek = weeks.find((week) => week.id === deleteTarget.weekId);
    if (!targetWeek) return;

    targetWeek.sessionIds.forEach((lessonId) => removeLessonFromWeek(lessonId, targetWeek.id));
    removeWeekRecord(targetWeek.id);

    const nextCourse = { ...course, weekIds: course.weekIds.filter((id) => id !== targetWeek.id) };
    saveCourseRecord(nextCourse);

    setDeleteTarget(null);
    router.refresh();
  }

  if (!course) return <div className="p-8 text-sm text-[#666666]">Course not found in the local curriculum.</div>;

  return (
    <div>
      <AdminPageHeader title={course.title} description={course.description} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.code }]} />
      <div className="mb-8 flex flex-wrap gap-3"><Link href={`/courses/${course.id}/roadmap?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">Preview as student</Link><Link href={`/admin/courses/${course.id}/import`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Upload size={15} />Import material</Link><button type="button" onClick={() => setIsCreatingWeek((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] hover:border-[#111111]"><Plus size={15} />Create week</button><Link href={`/admin/lessons/new?courseId=${course.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Plus size={15} />Create day</Link><Link href={`/admin/courses/${course.id}/quality`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]">Review quality</Link></div>
      {isCreatingWeek ? <div className="mb-6 rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Week title</span><input value={weekTitle} onChange={(event) => setWeekTitle(event.target.value)} className="admin-input" placeholder={`Week ${nextWeekNumber}`} /></label><label className="space-y-2"><span className="field-label">Chapter title</span><input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="admin-input" placeholder={chapters[0]?.title ?? "Chapter 1"} /></label></div><div className="mt-4 flex gap-3"><button type="button" onClick={handleCreateWeek} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]">Create week</button><button type="button" onClick={() => { setIsCreatingWeek(false); setWeekTitle(""); setChapterTitle(""); }} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]">Cancel</button></div></div> : null}
      <ConfirmDialog open={!!deleteTarget} title="Delete week" description={deleteTarget ? `Delete "${deleteTarget.title}" and remove its lesson records from this course?` : "Delete this week?"} confirmLabel="Delete" onConfirm={confirmDeleteWeek} onCancel={() => setDeleteTarget(null)} />
      <div className="grid gap-4 md:grid-cols-4"><Metric label="Weeks" value={weeks.length} /><Metric label="Days" value={days.length} /><Metric label="Questions" value={questions.length} /><Metric label="Assessments" value={assessments.length} /></div>
      {quality ? <section className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#E5E5E5] bg-white p-5 md:flex-row md:items-center md:justify-between"><div><div className="field-label">Course readiness</div><div className="mt-2 flex flex-wrap items-center gap-3"><AdminStatusBadge status={quality.readiness} /><span className="text-sm text-[#666666]">{quality.metrics.daysWithContent} / {quality.metrics.days} Days with content · {quality.errors} errors · {quality.warnings} warnings</span></div></div><Link href={`/admin/courses/${course.id}/quality`} className="text-sm font-semibold text-[#111111] hover:text-[#2563EB]">Open quality report</Link></section> : null}
      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-6 flex items-center justify-between"><div><div className="field-label">Course curriculum</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">Weeks and days</h2></div><AdminStatusBadge status={quality?.readiness ?? "draft"} /></div><div className="space-y-4">{weeks.map((week) => { const weekDays = getWeekDays(course.id, week); const weekReport = quality?.weeks.find((item) => item.week.id === week.id); const createDayHref = `/admin/lessons/new?courseId=${course.id}&chapterId=${week.chapterIds[0] ?? ""}&weekId=${week.id}`; return <div key={week.id} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5 transition-colors hover:border-[#111111]"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="field-label">Week {week.weekNumber}</div><h3 className="mt-2 font-serif text-2xl text-[#111111]">{week.title}</h3><p className="mt-2 text-sm leading-6 text-[#666666]">{week.description}</p></div><div className="flex items-center gap-3"><div className="flex items-center gap-2 text-sm text-[#666666]"><BookOpen size={15} />{weekReport?.readyDayCount ?? 0} / {weekDays.length} Days ready</div><Link href={createDayHref} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]">Create day</Link><button type="button" onClick={() => handleDeleteWeek(week.id, week.title)} className="inline-flex items-center gap-2 rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2]"><Trash2 size={13} />Delete</button></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{weekDays.map((day) => <Link key={day.lessonId} href={day.lesson ? `/admin/lessons/${day.lesson.id}` : createDayHref} className="block rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 hover:border-[#111111]"><div className="field-label">Day {day.dayNumber}</div><div className="mt-2 line-clamp-2 text-sm font-medium text-[#111111]">{day.title}</div><div className="mt-1 text-xs text-[#666666]">{day.lesson ? `${day.lesson.blocks.length} blocks` : "Needs content"}</div></Link>)}</div></div>; })}</div></section>
      <div className="mt-8 grid gap-4 md:grid-cols-2"><Link href={`/admin/questions?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><FileText size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Question bank</div><p className="mt-2 text-sm text-[#666666]">Manage {questions.length} questions for {course.code}.</p></Link><Link href={`/admin/assessments?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><BookOpen size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Assessments</div><p className="mt-2 text-sm text-[#666666]">Manage {assessments.length} assessment definitions.</p></Link></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5"><div className="field-label">{label}</div><div className="mt-5 font-serif text-4xl text-[#111111]">{value}</div></div>; }
