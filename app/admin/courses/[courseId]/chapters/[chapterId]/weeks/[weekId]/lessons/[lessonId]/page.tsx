import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { getLesson } from "@/lib/content/access";
import type { ContentBlock, Lesson } from "@/lib/content/types";

function summarizeBlock(block: ContentBlock) {
  switch (block.type) {
    case "text":
      return block.body.slice(0, 120);
    case "heading":
      return block.text;
    case "math":
      return block.expression;
    case "worked-example":
      return `${block.title}: ${block.prompt}`;
    case "callout":
      return block.text;
    case "image":
      return `${block.alt || "Image"} (${block.src})`;
    case "video":
      return block.title;
    case "interactive":
      return `Provider: ${block.provider}`;
    case "question":
      return `Question reference: ${block.questionId}`;
    case "markdown":
      return block.markdown.split("\n")[0] || "Markdown content";
    default:
      return "Block content";
  }
}

export default async function AdminLessonDetailPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string; weekId: string; lessonId: string }>;
}) {
  const { courseId, chapterId, weekId, lessonId } = await params;
  const lesson = getLesson(lessonId) ?? {
    id: lessonId,
    courseId,
    chapterId,
    weekId,
    title: "Lesson",
    description: "Structured lesson preview.",
    order: 1,
    estimatedMinutes: 10,
    objectives: [],
    blocks: [],
  } satisfies Lesson;

  const uniqueSteps = Array.from(new Set(lesson.blocks.map(b => b.step ?? 1))).sort((a, b) => a - b);
  const totalSteps = uniqueSteps.length || 1;

  return (
    <div>
      <AdminPageHeader
        title={lesson.title}
        description={lesson.description}
        breadcrumbs={[
          { label: "Courses", href: "/admin/courses" },
          { label: "MATH 151", href: `/admin/courses/${courseId}` },
          { label: "Chapter", href: `/admin/courses/${courseId}/chapters/${chapterId}` },
          { label: `Week ${weekId}`, href: `/admin/courses/${courseId}/chapters/${chapterId}/weeks/${weekId}` },
          { label: lesson.title },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <div className="font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Lesson preview</div>
              <h2 className="mt-2 font-serif text-3xl text-[#111111]">Structured lesson renderer</h2>
            </div>
            <AdminStatusBadge status="Published" />
          </div>

          <div className="space-y-6">
            {uniqueSteps.map((step) => {
              return (
                <div key={step} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
                  <LessonRenderer lesson={lesson} step={step} />
                </div>
              );
            })}
          </div>
        </section>

        <aside className="rounded-[28px] border border-[#E5E5E5] bg-white p-6 shadow-[0_8px_24px_rgba(17,17,17,0.02)]">
          <div className="mb-5 font-sans text-[10px] font-bold uppercase tracking-[0.2em] text-[#666666]">Content blocks</div>

          <div className="space-y-3">
            {lesson.blocks.map((block) => (
              <div key={block.id} className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-[0.18em] text-[#666666]">{block.type}</span>
                  <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.18em] text-[#111111]">Step {block.step ?? 1}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[#666666]">{summarizeBlock(block)}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
