import { notFound, redirect } from "next/navigation";
import { LessonExperience } from "./LessonExperience";
import { getPublishedDay } from "@/lib/content/publishedDay";
import { createResourceRepository } from "@/lib/content/resourceRepository";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { createQuestionRepository } from "@/lib/questions/repository";
import type { Question } from "@/lib/content/types/question";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";
import { withServerTimingSpan } from "@/lib/performance/timingSpans";

type LessonPageProps = {
  params: Promise<{ courseId: string; chapterId: string; id: string }>;
  searchParams: Promise<{ preview?: string; week?: string }>;
};

export default async function LessonPage({ params, searchParams }: LessonPageProps) {
  return withServerRouteTiming("lesson", async (timing) => {
  const route = await params;
  const query = await searchParams;

  // Task 40G.4: one authenticated server client serves both the auth guard and
  // the student question read below, so question reads carry the signed-in user's
  // session and are constrained by the `public_questions_select_published` RLS
  // policy instead of silently resolving a service-role client.
  const supabase = await withServerTimingSpan(timing, "supabase_client_create_ms", () => createSupabaseServerClient(timing));

  if (query.preview !== "1") {
    // The authenticated server client is created above (Task 40G.4) and reused here.
    const { data, error } = await withServerTimingSpan(timing, "auth_get_user_ms", () => supabase.auth.getUser());

    if (error || !data.user) {
      const weekQuery = query.week ? `?week=${encodeURIComponent(query.week)}` : "";
      const destination = `/courses/${encodeURIComponent(route.courseId)}/chapter/${encodeURIComponent(route.chapterId)}/lesson/${encodeURIComponent(route.id)}${weekQuery}`;
      redirect(`/courses?auth=required&next=${encodeURIComponent(destination)}`);
    }
  }

  // Task 40G.5C: reuse the request-scoped client created above so the Day read is
  // constrained by the hardened published-only RLS policies.
  const result = await withServerTimingSpan(timing, "published_day_resolution_ms", () =>
    getPublishedDay(route.courseId, query.week, route.id, () => supabase, timing),
  );

  if (result.kind === "not-found") notFound();

  // Task 40G.6C: the request-scoped client created above is supplied explicitly so
  // this student resource/placement read is constrained by the published-only
  // learning_resources / resource_placements RLS policies from Task 40G.6B,
  // instead of silently resolving a service-role client.
  const repository = createResourceRepository("supabase", () => supabase);
  const assetIds = [...new Set(result.lesson.blocks.flatMap((block) => block.type === "image" && block.assetId ? [block.assetId] : []))];
  // Task 40G.7B: the request-scoped client created above is supplied explicitly so
  // this student asset read is constrained by the published-only assets RLS
  // policy (status = 'ready'). The service-role client that used to be passed
  // here was silently ignored by the old repository, which resolved its own
  // module-level browser client instead.
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

  const [assets, supplementaryResources, questions] = await Promise.all([
    withServerTimingSpan(timing, "asset_lookup_consume_ms", () =>
      createAssetSupabaseRepository(() => supabase).getAssetsByIds(assetIds),
    ),
    withServerTimingSpan(timing, "resource_placement_lookup_consume_ms", () =>
      repository.listResourcesForScope(
        { courseId: result.lesson.courseId, weekId: result.lesson.weekId, dayId: result.lesson.id },
        {
          visibility: query.preview === "1" ? "all" : "student",
          includeDraft: query.preview === "1",
        },
      ),
    ),
    withServerTimingSpan(timing, "question_lookup_consume_ms", () =>
      questionIds.length > 0
        ? createQuestionRepository("supabase", () => supabase).listQuestions({
          ids: questionIds,
          visibility: query.preview === "1" ? "all" : "student",
          includeDraft: query.preview === "1",
        })
        : Promise.resolve([]),
    ),
  ]);
  const { assetsById, questionsById } = await withServerTimingSpan(timing, "lesson_reference_mapping_ms", () =>
    Promise.resolve({
      assetsById: Object.fromEntries(assets.map((asset) => [asset.id, asset])),
      questionsById: Object.fromEntries(questions.map((question) => [question.id, question])) as Record<string, Question>,
    }),
  );

  if (timing.sampled) {
    const steps = new Map<number, { blockCount: number; typeCounts: Record<string, number>; visualizerSourceChars: number }>();
    for (const block of result.lesson.blocks) {
      const step = block.step ?? 1;
      const stats = steps.get(step) ?? { blockCount: 0, typeCounts: {}, visualizerSourceChars: 0 };
      stats.blockCount += 1;
      stats.typeCounts[block.type] = (stats.typeCounts[block.type] ?? 0) + 1;
      if (block.type === "visualizer") stats.visualizerSourceChars += block.source.length;
      steps.set(step, stats);
    }
    const orderedSteps = [...steps.entries()].sort(([left], [right]) => left - right);
    const [firstStep, firstStepStats] = orderedSteps[0] ?? [1, { blockCount: 0, typeCounts: {}, visualizerSourceChars: 0 }];
    const laterStats = { blockCount: 0, typeCounts: {} as Record<string, number>, visualizerSourceChars: 0 };
    for (const [, stats] of orderedSteps.slice(1)) {
      laterStats.blockCount += stats.blockCount;
      laterStats.visualizerSourceChars += stats.visualizerSourceChars;
      for (const [type, count] of Object.entries(stats.typeCounts)) {
        laterStats.typeCounts[type] = (laterStats.typeCounts[type] ?? 0) + count;
      }
    }
    console.info(JSON.stringify({
      event: "lesson_payload_shape",
      route: timing.route,
      requestId: timing.requestId,
      blockCount: result.lesson.blocks.length,
      stepCount: orderedSteps.length,
      firstStep,
      firstStepBlockCount: firstStepStats.blockCount,
      firstStepTypeCounts: firstStepStats.typeCounts,
      firstStepVisualizerSourceChars: firstStepStats.visualizerSourceChars,
      laterStepBlockCount: laterStats.blockCount,
      laterStepTypeCounts: laterStats.typeCounts,
      laterStepVisualizerSourceChars: laterStats.visualizerSourceChars,
    }));
  }

  return <LessonExperience lesson={result.lesson} courseId={route.courseId} preview={query.preview === "1"} week={query.week} supplementaryResources={supplementaryResources} assetsById={assetsById} questionsById={questionsById} />;
  });
}
