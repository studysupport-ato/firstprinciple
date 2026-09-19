"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle, ArrowLeft, CheckCircle2, CircleAlert, ExternalLink, Send } from "lucide-react";
import { useState } from "react";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { analyzeCourseQuality, type CurriculumIssue } from "@/lib/content/quality";
import { saveCourseLifecycleState } from "@/lib/content/publishing";

export default function CourseQualityPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [refreshKey, setRefreshKey] = useState(0);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const report = analyzeCourseQuality(courseId);

  if (!report) return <div className="p-8 text-sm text-[#666666]">Course not found in the local curriculum.</div>;

  const errors = report.issues.filter((issue) => issue.severity === "error");
  const warnings = report.issues.filter((issue) => issue.severity === "warning");
  const canPublish = errors.length === 0;

  function publish() {
    if (!canPublish) return;
    setConfirmPublish(true);
  }

  function confirmPublishCourse() {
    saveCourseLifecycleState(courseId, "published");
    setConfirmPublish(false);
    setRefreshKey((value) => value + 1);
  }

  return (
    <div key={refreshKey}>
      <AdminPageHeader title="Course quality" description={`Inspect ${report.course.code} before making its local content state ready or published.`} breadcrumbs={[{ label: "Courses", href: "/admin/courses" }, { label: report.course.code, href: `/admin/courses/${courseId}` }, { label: "Quality" }]} />
      <ConfirmDialog open={confirmPublish} title="Publish course" description="Publish this course locally? This is a content lifecycle state, not an access-control permission." confirmLabel="Publish" onConfirm={confirmPublishCourse} onCancel={() => setConfirmPublish(false)} />

      <div className="mb-6 flex flex-wrap items-center gap-3"><Link href={`/admin/courses/${courseId}`} className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"><ArrowLeft size={15} />Course command center</Link><Link href={`/courses/${courseId}/roadmap?preview=1`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-4 py-2 text-sm font-medium text-[#111111]"><ExternalLink size={15} />Preview as student</Link><AdminStatusBadge status={report.readiness} />{canPublish ? <button type="button" onClick={publish} className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563EB]"><Send size={15} />Publish locally</button> : null}</div>

      <section className="grid gap-4 md:grid-cols-4"><Metric label="Weeks ready" value={`${report.metrics.completeWeeks} / ${report.metrics.weeks}`} /><Metric label="Days with content" value={`${report.metrics.daysWithContent} / ${report.metrics.days}`} /><Metric label="Content blocks" value={String(report.metrics.contentBlocks)} /><Metric label="Issues" value={String(report.issues.length)} /></section>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="field-label">Review queue</div><h2 className="mt-2 font-serif text-3xl text-[#111111]">{errors.length} errors · {warnings.length} warnings</h2></div>{canPublish ? <div className="inline-flex items-center gap-2 text-sm text-[#059669]"><CheckCircle2 size={16} />No blocking errors</div> : <div className="inline-flex items-center gap-2 text-sm text-[#E11D48]"><CircleAlert size={16} />Publishing blocked</div>}</div>{report.issues.length ? <div className="space-y-3">{report.issues.map((issue) => <IssueRow key={issue.id} issue={issue} />)}</div> : <div className="rounded-2xl bg-[#ECFDF5] p-5 text-sm text-[#047857]">This course has no detected structural issues.</div>}</section>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]"><div className="mb-5 field-label">Week health</div><div className="space-y-3">{report.weeks.map(({ week, dayCount, readyDayCount, issueCount }) => <Link key={week.id} href={`/admin/courses/${courseId}/weeks/${week.weekNumber}`} className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 hover:border-[#111111]"><div><div className="field-label">Week {week.weekNumber}</div><div className="mt-2 font-serif text-xl text-[#111111]">{week.title}</div></div><div className="flex items-center gap-4 text-sm text-[#666666]"><span>{readyDayCount} / {dayCount} Days ready</span>{issueCount ? <span className="inline-flex items-center gap-1 text-[#D97706]"><AlertTriangle size={15} />{issueCount}</span> : <CheckCircle2 size={15} className="text-[#059669]" />}</div></Link>)}</div></section>
    </div>
  );
}

function IssueRow({ issue }: { issue: CurriculumIssue }) {
  const isError = issue.severity === "error";
  return <div className="flex flex-col gap-3 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-3"><div className={isError ? "text-[#E11D48]" : "text-[#D97706]"}>{isError ? <CircleAlert size={17} /> : <AlertTriangle size={17} />}</div><div><div className="flex flex-wrap items-center gap-2"><span className="field-label">{issue.scope}</span><AdminStatusBadge status={issue.severity} /></div><div className="mt-2 font-medium text-[#111111]">{issue.title}</div><p className="mt-1 text-sm leading-6 text-[#666666]">{issue.description}</p></div></div>{issue.actionHref ? <Link href={issue.actionHref} className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-[#111111] hover:text-[#2563EB]">Open <ExternalLink size={14} /></Link> : null}</div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5"><div className="field-label">{label}</div><div className="mt-5 font-serif text-3xl text-[#111111]">{value}</div></div>; }
