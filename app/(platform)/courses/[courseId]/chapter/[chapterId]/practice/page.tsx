import { notFound } from "next/navigation";
import type { Difficulty } from "@/lib/content/types/question";
import { createQuestionRepository } from "@/lib/questions/repository";
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
  const repository = createQuestionRepository("supabase");

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
