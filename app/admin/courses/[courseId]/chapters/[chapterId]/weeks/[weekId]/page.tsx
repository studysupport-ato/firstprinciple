import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getLessonsByWeek, getWeek } from "@/lib/content/access";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import Link from "next/link";

export default async function AdminWeekDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string; weekId: string }>;
}) {
  const { courseId, chapterId, weekId } = await params;
  const week = getWeek(weekId) ?? {
    id: weekId,
    courseId,
    chapterIds: [chapterId],
    title: "Week",
    description: "Academic week overview.",
    weekNumber: 1,
    sessionIds: [],
  };
  const lessons = getLessonsByWeek(weekId);

  return (
    <div>
      <AdminPageHeader
        title={`Week ${week.weekNumber}: ${week.title}`}
        description={week.description}
        breadcrumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: "MATH 151", href: `/admin/courses/${courseId}` },
          { label: "Chapter", href: `/admin/courses/${courseId}/chapters/${chapterId}` },
          { label: `Week ${week.weekNumber}` },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lessons</span>
            <BookOpen size={16} className="text-[#111111]" />
          </div>
          <div className="mt-6 font-serif text-4xl text-[#111111]">{lessons.length}</div>
        </div>

        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Sessions</span>
            <Clock3 size={16} className="text-[#111111]" />
          </div>
          <div className="mt-6 font-serif text-4xl text-[#111111]">{week.sessionIds.length}</div>
        </div>

        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Status</span>
            <span className="text-[#111111]">•</span>
          </div>
          <div className="mt-4"><AdminStatusBadge status="Published" /></div>
        </div>
      </div>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="mb-6 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lessons in this week</div>
        <div className="space-y-3">
          {lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/admin/courses/${courseId}/chapters/${chapterId}/weeks/${weekId}/lessons/${lesson.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 transition-colors hover:border-[#111111]"
            >
              <div>
                <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson {lesson.order}</div>
                <div className="mt-2 font-medium text-[#111111]">{lesson.title}</div>
              </div>
              <ArrowRight size={15} className="text-[#666666]" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
