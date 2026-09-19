import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminTable } from "@/components/admin/AdminTable";
import { AdminStatusBadge } from "@/components/admin/AdminStatusBadge";
import { getQuestions } from "@/lib/content/access";
import { hasQuestionOverride } from "@/lib/content/overrides";
import Link from "next/link";

export default function AdminQuestionsPage() {
  const rows = getQuestions().map((question) => ({
    id: question.id,
    prompt: question.prompt,
    topic: question.topic,
    difficulty: question.difficulty,
    type: question.type,
    status: question.metadata?.status ?? "published",
    hasOverride: hasQuestionOverride(question.id),
  }));

  return (
    <div>
      <AdminPageHeader
        title="Questions"
        description="Author, review, and locally override the shared question bank used by learning practice and assessments."
        actionLabel="Create question"
        actionHref="/admin/questions/new"
      />

      <AdminTable
        columns={[
          {
            key: "prompt",
            label: "Prompt",
            render: (row) => (
              <Link href={`/admin/questions/${row.id}`} className="font-medium text-[#111111] transition-colors hover:text-[#2563EB]">
                {row.prompt.slice(0, 80)}
              </Link>
            ),
          },
          { key: "topic", label: "Topic" },
          { key: "difficulty", label: "Difficulty" },
          { key: "type", label: "Type" },
          {
            key: "status",
            label: "Status",
            render: (row) => <AdminStatusBadge status={row.hasOverride ? "Local override" : row.status} />,
          },
        ]}
        rows={rows}
        emptyMessage="No questions yet"
        emptyDescription="Questions added to the local bank will appear here for preview and curation."
      />
    </div>
  );
}
