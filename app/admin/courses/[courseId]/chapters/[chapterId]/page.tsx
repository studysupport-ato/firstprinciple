import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getChapter, getLessons, getWeeks } from "@/lib/content/access";
import { ArrowRight, BookOpen, Clock3, NotebookText } from "lucide-react";
import Link from "next/link";

export default async function AdminChapterDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const { courseId, chapterId } = await params;
  const chapter = getChapter(chapterId) ?? {
    id: chapterId,
    courseId,
    title: chapterId.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
    description: "Academic chapter overview.",
    order: 1,
  };

  const chapterWeeks = getWeeks(courseId, chapterId);
  const chapterLessons = getLessons(courseId, chapterId);

  return (
    <div>
      <AdminPageHeader
        title={chapter.title}
        description={chapter.description}
        breadcrumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: "MATH 151", href: `/admin/courses/${courseId}` },
          { label: chapter.title },
        ]}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Weeks</span>
            <BookOpen size={16} className="text-[#111111]" />
          </div>
          <div className="mt-6 font-serif text-4xl text-[#111111]">{chapterWeeks.length}</div>
        </div>

        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lessons</span>
            <NotebookText size={16} className="text-[#111111]" />
          </div>
          <div className="mt-6 font-serif text-4xl text-[#111111]">{chapterLessons.length}</div>
        </div>

        <div className="rounded-[24px] border border-[#E5E5E5] bg-white p-5 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="flex items-center justify-between">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Status</span>
            <Clock3 size={16} className="text-[#111111]" />
          </div>
          <div className="mt-4"><AdminStatusBadge status="Published" /></div>
        </div>
      </div>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="mb-6 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Associated weeks</div>
        <div className="grid gap-4 md:grid-cols-2">
          {chapterWeeks.map((week) => (
            <Link
              key={week.id}
              href={`/admin/courses/${courseId}/chapters/${chapterId}/weeks/${week.id}`}
              className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 transition-colors hover:border-[#111111]"
            >
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">Week {week.weekNumber}</div>
              <div className="mt-3 font-serif text-2xl text-[#111111]">{week.title}</div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#111111]">
                Open week
                <ArrowRight size={15} />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
        <div className="mb-6 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson sequence</div>
        <div className="space-y-3">
          {chapterLessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/admin/lessons/${lesson.id}`}
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
