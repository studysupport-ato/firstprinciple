import { notFound, redirect } from "next/navigation";
import { LessonExperience } from "./LessonExperience";
import { getPublishedDay } from "@/lib/content/publishedDay";
import { createResourceRepository } from "@/lib/content/resourceRepository";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { createQuestionRepository } from "@/lib/questions/repository";
import type { Question } from "@/lib/content/types/question";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type LessonPageProps = {
  params: Promise<{ courseId: string; chapterId: string; id: string }>;
  searchParams: Promise<{ preview?: string; week?: string }>;
};

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  const route = await params;
  const query = await searchParams;

  // Task 40G.4: one authenticated server client serves both the auth guard and
  // the student question read below, so question reads carry the signed-in user's
  // session and are constrained by the `public_questions_select_published` RLS
  // policy instead of silently resolving a service-role client.
  const supabase = await createSupabaseServerClient();

  if (query.preview !== "1") {
    // The authenticated server client is created above (Task 40G.4) and reused here.
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      const weekQuery = query.week ? `?week=${encodeURIComponent(query.week)}` : "";
      const destination = `/courses/${encodeURIComponent(route.courseId)}/chapter/${encodeURIComponent(route.chapterId)}/lesson/${encodeURIComponent(route.id)}${weekQuery}`;
      redirect(`/courses?auth=required&next=${encodeURIComponent(destination)}`);
    }
  }

  const result = await getPublishedDay(route.courseId, query.week, route.id);

  if (result.kind === "not-found") notFound();

  const repository = createResourceRepository("supabase");
  const assetIds = [...new Set(result.lesson.blocks.flatMap((block) => block.type === "image" && block.assetId ? [block.assetId] : []))];
  const assets = await createAssetSupabaseRepository(createSupabaseAdminClient).getAssetsByIds(assetIds);
  const assetsById = Object.fromEntries(assets.map((asset) => [asset.id, asset]));
  const supplementaryResources = await repository.listResourcesForScope(
    { dayId: result.lesson.id },
    {
      visibility: query.preview === "1" ? "all" : "student",
      includeDraft: query.preview === "1",
    },
  );

  // Task 40F.3 — student-facing concept-check questions come from the Supabase
  // question bank, not the local Math 151 fixtures. Collect every question id
  // referenced by this day and resolve them in ONE bounded query (never one
  // request per QuestionBlock). Student visibility is enforced by the
  // repository; preview keeps its existing draft visibility.
  const questionIds = Array.from(
    new Set(
      (result.lesson.blocks ?? [])
        .filter((block): block is Extract<typeof block, { type: "question" }> => block.type === "question")
        .map((block) => block.questionId)
        .filter(Boolean),
    ),
  );

  let questionsById: Record<string, Question> = {};
  if (questionIds.length > 0) {
    // Task 40G.4: the authenticated server client is supplied explicitly so the
      // `public_questions_select_published` RLS policy constrains this student read.
      const repository = createQuestionRepository("supabase", () => supabase);
      const questions = await repository.listQuestions({
      ids: questionIds,
      visibility: query.preview === "1" ? "all" : "student",
      includeDraft: query.preview === "1",
    });
    questionsById = Object.fromEntries(questions.map((question) => [question.id, question]));
  }

  return <LessonExperience lesson={result.lesson} courseId={route.courseId} preview={query.preview === "1"} week={query.week} supplementaryResources={supplementaryResources} assetsById={assetsById} questionsById={questionsById} />;
}
