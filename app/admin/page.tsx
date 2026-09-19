import { ArrowRight, BookOpen, ClipboardCheck, FileText, Layers3, Sparkles } from "lucide-react";
import Link from "next/link";

import { getAssessments, getCourses, getQuestions, getLessons, getCourse } from "@/lib/content/access";
import { getLessonOverrideIds, getQuestionOverrideIds } from "@/lib/content/overrides";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";

export default function AdminDashboardPage() {
  const course = getCourse("math151") ?? getCourses()[0];
  const lessons = getLessons();
  const questions = getQuestions();
  const assessments = getAssessments();
  const localLessonOverrideCount = getLessonOverrideIds().length;
  const localQuestionOverrideCount = getQuestionOverrideIds().length;
  const localOverrideCount = localLessonOverrideCount + localQuestionOverrideCount;
  const stats = [
    { label: "Courses", value: String(getCourses().length), detail: "Active course", icon: Layers3 },
    { label: "Lessons", value: String(lessons.length), detail: "Structured teaching units", icon: BookOpen },
    { label: "Questions", value: String(questions.length), detail: "Available in local bank", icon: FileText },
    { label: "Assessments", value: String(assessments.length), detail: "Blueprints and routes", icon: ClipboardCheck },
    { label: "Overrides", value: String(localOverrideCount), detail: "Local content edits", icon: Sparkles },
  ];

  const recentActivity = localOverrideCount
    ? [
        {
          title: "Local overrides are active",
          detail: `${localLessonOverrideCount} lesson${localLessonOverrideCount === 1 ? "" : "s"} and ${localQuestionOverrideCount} question${localQuestionOverrideCount === 1 ? "" : "s"} currently have local content changes.`,
          status: "Local",
        },
      ]
    : [
        {
          title: "No activity data yet",
          detail: "The admin is currently reading the canonical local content model without a persisted activity stream.",
          status: "Local",
        },
      ];

  return (
    <div>
      <AdminPageHeader
        title="Admin overview"
        description="A calm operational view of the Back2Basics with Kwamina learning platform and its local academic content."
        actionLabel="Create content"
        actionHref="/admin/courses"
        actionIcon={<Sparkles size={15} />}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, detail, icon: Icon }) => (
          <div key={label} className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">{label}</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F7F7F8] text-[#111111]">
                <Icon size={16} />
              </div>
            </div>
            <div className="mt-8 font-serif text-4xl text-[#111111]">{value}</div>
            <div className="mt-2 text-sm text-[#666666]">{detail}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Content overview</div>
              <h2 className="mt-2 font-serif text-3xl text-[#111111]">MATH 151</h2>
            </div>
            <AdminStatusBadge status="Published" />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl bg-[#F7F7F8] p-4">
              <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Chapters</div>
              <div className="mt-3 font-serif text-3xl text-[#111111]">{course.chapterIds.length}</div>
            </div>
            <div className="rounded-2xl bg-[#F7F7F8] p-4">
              <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Weeks</div>
              <div className="mt-3 font-serif text-3xl text-[#111111]">{course.weekIds.length}</div>
            </div>
            <div className="rounded-2xl bg-[#F7F7F8] p-4">
              <div className="font-sans text-[10px] uppercase tracking-[0.2em] text-[#666666]">Topics</div>
              <div className="mt-3 font-serif text-3xl text-[#111111]">{new Set(questions.map((question) => question.topic)).size}</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Quick actions</div>
          <div className="space-y-3">
            {[
              ["Create course", "/admin/courses"],
              ["Create lesson", "/admin/lessons"],
              ["Create question", "/admin/questions"],
              ["Create assessment", "/admin/assessments"],
            ].map(([label, href]) => (
              <Link
                key={label}
                href={href}
                className="flex items-center justify-between rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-3 text-sm font-medium text-[#111111] transition-colors hover:border-[#111111]"
              >
                {label}
                <ArrowRight size={15} />
              </Link>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Recent activity</div>
        <div className="space-y-3">
          {recentActivity.map((item) => (
            <div key={item.title} className="flex items-center justify-between gap-4 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
              <div>
                <div className="font-sans text-sm font-semibold text-[#111111]">{item.title}</div>
                <div className="mt-1 text-sm text-[#666666]">{item.detail}</div>
              </div>
              <AdminStatusBadge status={item.status} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
