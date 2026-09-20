"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import {
  getAdminCourseStructureAction,
  getAdminQuestionsAction,
  getAdminAssessmentsAction,
  createWeekAction,
  deleteWeekAction,
} from "@/lib/adminContentActions";
import { BookOpen, FileText, Plus, Trash2, Upload } from "lucide-react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import type { AdminCourseStructure, Question, Assessment } from "@/lib/content/adminContract";

export default function AdminCourseCommandCenter() {
  const router = useRouter();
  const { courseId } = useParams<{ courseId: string }>();
  
  const [structure, setStructure] = useState<AdminCourseStructure | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isCreatingWeek, setIsCreatingWeek] = useState(false);
  const [weekTitle, setWeekTitle] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ weekId: string; title: string } | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [structRes, questRes, assessRes] = await Promise.all([
          getAdminCourseStructureAction(courseId),
          getAdminQuestionsAction(courseId),
          getAdminAssessmentsAction(courseId)
        ]);

        if (!structRes.ok) throw new Error(structRes.error);
        if (!questRes.ok) throw new Error(questRes.error);
        if (!assessRes.ok) throw new Error(assessRes.error);

        setStructure(structRes.data);
        setQuestions(questRes.data);
        setAssessments(assessRes.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load course data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [courseId, refreshTick]);

  const course = structure?.course;
  const weeks = useMemo(() => structure?.weeks.map(w => w.week).sort((a, b) => a.weekNumber - b.weekNumber) ?? [], [structure]);
  const chapters = structure?.chapters ?? [];
  const allDays = structure?.days ?? [];

  const nextWeekNumber = useMemo(() => Math.max(0, ...weeks.map((week) => week.weekNumber)) + 1, [weeks]);

  const quality = useMemo(() => {
    if (!structure) return null;
    let daysWithContent = 0;
    let contentBlocks = 0;
    const weekReports = structure.weeks.map((w) => {
      let readyDayCount = 0;
      w.days.forEach(day => {
        if (day.blocks && day.blocks.length > 0) {
          daysWithContent++;
          contentBlocks += day.blocks.length;
          readyDayCount++;
        }
      });
      return { week: w.week, dayCount: w.days.length, readyDayCount, issueCount: 0 };
    });
    return {
      readiness: (course?.status === "published" ? "published" : "draft") as any,
      metrics: { daysWithContent, days: allDays.length },
      errors: 0,
      warnings: 0,
      weeks: weekReports
    };
  }, [structure, allDays, course]);

  async function handleCreateWeek() {
    if (!course) return;
    const safeWeekTitle = weekTitle.trim() || `Week ${nextWeekNumber}`;
    const weekId = `${course.id}-week-${nextWeekNumber}`;

    const nextWeek = {
      id: weekId,
      courseId: course.id,
      title: safeWeekTitle,
      description: `${safeWeekTitle} for ${course.title}.`,
      weekNumber: nextWeekNumber,
    };

    const res = await createWeekAction(nextWeek);
    if (res.ok) {
      setIsCreatingWeek(false);
      setWeekTitle("");
      setChapterTitle("");
      router.push(`/admin/courses/${course.id}/weeks/${nextWeekNumber}`);
    } else {
      alert(res.error);
    }
  }

  function handleDeleteWeek(weekIdToDelete: string, weekTitleToDelete: string) {
    if (!course) return;
    setDeleteTarget({ weekId: weekIdToDelete, title: weekTitleToDelete });
  }

  async function confirmDeleteWeek() {
    if (!course || !deleteTarget) return;

    const res = await deleteWeekAction(course.id, deleteTarget.weekId);
    if (res.ok) {
      setDeleteTarget(null);
      setRefreshTick((value) => value + 1);
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  if (loading) return <div className="p-8 text-sm text-[#666666]">Loading...</div>;
  if (error) return <div className="p-8 text-sm text-[#E11D48]">{error}</div>;
  if (!course) return <div className="p-8 text-sm text-[#666666]">Course not found.</div>;

  return (
    <div>
      <AdminPageHeader title={course.title} description={course.description} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: course.code }]} />
      <div className="mb-8 flex flex-wrap gap-3"><Link href={`/courses/${course.id}/roadmap?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2563EB]">Preview as student</Link><Link href={`/admin/courses/${course.id}/import`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Upload size={15} />Import material</Link><button type="button" onClick={() => setIsCreatingWeek((current) => !current)} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111] hover:border-[#111111]"><Plus size={15} />Create week</button><Link href={`/admin/lessons/new?courseId=${course.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]"><Plus size={15} />Create day</Link><Link href={`/admin/courses/${course.id}/quality`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2.5 text-sm font-medium text-[#111111]">Review quality</Link></div>
      {isCreatingWeek ? <div className="mb-6 rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="grid gap-4 md:grid-cols-2"><label className="space-y-2"><span className="field-label">Week title</span><input value={weekTitle} onChange={(event) => setWeekTitle(event.target.value)} className="admin-input" placeholder={`Week ${nextWeekNumber}`} /></label><label className="space-y-2"><span className="field-label">Chapter title</span><input value={chapterTitle} onChange={(event) => setChapterTitle(event.target.value)} className="admin-input" placeholder={chapters[0]?.title ?? "Chapter 1"} /></label></div><div className="mt-4 flex gap-3"><button type="button" onClick={handleCreateWeek} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]">Create week</button><button type="button" onClick={() => { setIsCreatingWeek(false); setWeekTitle(""); setChapterTitle(""); }} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]">Cancel</button></div></div> : null}
      <ConfirmDialog open={!!deleteTarget} title="Delete week" description={deleteTarget ? `Delete "${deleteTarget.title}" and remove its lesson records from this course?` : "Delete this week?"} confirmLabel="Delete" onConfirm={confirmDeleteWeek} onCancel={() => setDeleteTarget(null)} />
      <div className="grid gap-4 md:grid-cols-4"><Metric label="Weeks" value={weeks.length} /><Metric label="Days" value={allDays.length} /><Metric label="Questions" value={questions.length} /><Metric label="Assessments" value={assessments.length} /></div>
      {quality ? <section className="mt-6 flex flex-col gap-4 rounded-[24px] border border-[#E5E5E5] bg-white p-5 md:flex-row md:items-center md:justify-between"><div><div className="field-label">Course readiness</div><div className="mt-2 flex flex-wrap items-center gap-3"><AdminStatusBadge status={quality.readiness} /><span className="text-sm text-[#666666]">{quality.metrics.daysWithContent} / {quality.metrics.days} Days with content · {quality.errors} errors · {quality.warnings} warnings</span></div></div><Link href={`/admin/courses/${course.id}/quality`} className="text-sm font-semibold text-[#111111] hover:text-[#2563EB]">Open quality report</Link></section> : null}
      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-6 flex items-center justify-between"><div><div className="field-label">Course curriculum</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">Weeks and days</h2></div><AdminStatusBadge status={quality?.readiness ?? "draft"} /></div><div className="space-y-4">{weeks.map((week) => { 
        const weekDays = structure?.weeks.find(w => w.week.id === week.id)?.days.map((lesson, index) => ({
          dayNumber: index + 1,
          lessonId: lesson.id,
          title: lesson.title || `Day ${index + 1}`,
          lesson
        })) ?? [];
        const weekReport = quality?.weeks.find((item) => item.week.id === week.id); 
        const createDayHref = `/admin/lessons/new?courseId=${course.id}&weekId=${week.id}`; 
        return <div key={week.id} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5 transition-colors hover:border-[#111111]"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div><div className="field-label">Week {week.weekNumber}</div><h3 className="mt-2 font-serif text-2xl text-[#111111]">{week.title}</h3><p className="mt-2 text-sm leading-6 text-[#666666]">{week.description}</p></div><div className="flex items-center gap-3"><div className="flex items-center gap-2 text-sm text-[#666666]"><BookOpen size={15} />{weekReport?.readyDayCount ?? 0} / {weekDays.length} Days ready</div><Link href={createDayHref} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-3 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111]">Create day</Link><button type="button" onClick={() => handleDeleteWeek(week.id, week.title)} className="inline-flex items-center gap-2 rounded-full border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-1.5 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEE2E2]"><Trash2 size={13} />Delete</button></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{weekDays.map((day) => <Link key={day.lessonId} href={day.lesson ? `/admin/lessons/${day.lesson.id}` : createDayHref} className="block rounded-xl border border-[#E5E5E5] bg-white px-3 py-3 hover:border-[#111111]"><div className="field-label">Day {day.dayNumber}</div><div className="mt-2 line-clamp-2 text-sm font-medium text-[#111111]">{day.title}</div><div className="mt-1 text-xs text-[#666666]">{day.lesson ? `${day.lesson.blocks?.length || 0} blocks` : "Needs content"}</div></Link>)}</div></div>; })}</div></section>
      <div className="mt-8 grid gap-4 md:grid-cols-2"><Link href={`/admin/questions?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><FileText size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Question bank</div><p className="mt-2 text-sm text-[#666666]">Manage {questions.length} questions for {course.code}.</p></Link><Link href={`/admin/assessments?courseId=${course.id}`} className="rounded-2xl border border-[#E5E5E5] bg-white p-5 hover:border-[#111111]"><BookOpen size={17} /><div className="mt-4 font-serif text-2xl text-[#111111]">Assessments</div><p className="mt-2 text-sm text-[#666666]">Manage {assessments.length} assessment definitions.</p></Link></div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5"><div className="field-label">{label}</div><div className="mt-5 font-serif text-4xl text-[#111111]">{value}</div></div>; }
