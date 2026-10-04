import { notFound } from "next/navigation";
import type { Difficulty } from "@/lib/content/types/question";
import { createQuestionRepository } from "@/lib/questions/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChapterPracticePageClient } from "./ChapterPracticePageClient";

export type PracticePageProps = {
  params: Promise<{ courseId: string; chapterId: string }>;
  searchParams: Promise<{ preview?: string; topic?: string; subtopic?: string; difficulty?: string; limit?: string }>;
};

export default async function PracticePage({ params, searchParams }: PracticePageProps) {
  const route = await params;
  const query = await searchParams;
  const preview = query.preview === "1";
  const difficulty = (query.difficulty as Difficulty | undefined) ?? undefined;
  const limit = Number(query.limit ?? "5");
  // Task 40G.4: the authenticated server client is supplied explicitly so the
  // `public_questions_select_published` RLS policy constrains this student read.
  const client = await createSupabaseServerClient();
  const repository = createQuestionRepository("supabase", () => client);

  const initialQuestions = await repository.listQuestions({
    courseId: route.courseId,
    chapterId: route.chapterId,
    topic: query.topic,
    subtopic: query.subtopic,
    difficulty,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 5,
    visibility: "student",
    includeDraft: preview,
  });

  if (!initialQuestions.length) {
    notFound();
  }

  return (
    <ChapterPracticePageClient
      initialQuestions={initialQuestions}
      courseId={route.courseId}
      chapterId={route.chapterId}
      preview={preview}
      topic={query.topic}
      subtopic={query.subtopic}
      difficulty={difficulty}
      limit={Number.isFinite(limit) && limit > 0 ? limit : 5}
    />
  );
}
