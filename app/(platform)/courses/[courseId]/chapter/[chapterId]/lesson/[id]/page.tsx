import { notFound, redirect } from "next/navigation";
import { LessonExperience } from "./LessonExperience";
import { getPublishedDay, getPublishedDayMetadata, getPublishedDayStep, type PublishedDayStep } from "@/lib/content/publishedDay";
import { createResourceRepository } from "@/lib/content/resourceRepository";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { createQuestionRepository } from "@/lib/questions/repository";
import type { Question } from "@/lib/content/types/question";
import type { Lesson } from "@/lib/content/types/lesson";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";
import { withServerTimingSpan } from "@/lib/performance/timingSpans";
import { isFreeLesson } from "@/lib/content/freeLessons";
import { isAuthorizedLessonAdmin } from "@/lib/lessonUnlock";

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

    const { data: authData, error: authError } = await withServerTimingSpan(timing, "auth_get_user_ms", () => supabase.auth.getUser());
    const authUser = !authError && authData?.user ? authData.user : null;

    // Verify admin authorization server-side. Query params alone never grant preview.
    const authorizedAdmin = authUser ? await isAuthorizedLessonAdmin(authUser.id) : false;
    const preview = query.preview === "1" && authorizedAdmin;

    let freePreview = false;
    if (!authUser && !preview) {
      // The first lesson of each topic is open to visitors without an account.
      freePreview = await isFreeLesson(supabase, route.courseId, route.id);
      if (!freePreview) {
        const weekQuery = query.week ? `?week=${encodeURIComponent(query.week)}` : "";
        const destination = `/courses/${encodeURIComponent(route.courseId)}/chapter/${encodeURIComponent(route.chapterId)}/lesson/${encodeURIComponent(route.id)}${weekQuery}`;
        redirect(`/courses?auth=required&next=${encodeURIComponent(destination)}`);
      }
    }

    let lesson: Lesson;
    let steps: PublishedDayStep[] | undefined;
    let testingMode = false;

    if (freePreview) {
      // Anonymous visitor reading the first free lesson:
      // Must NOT call the authenticated-only RPC or step API. Read full published day.
      const result = await withServerTimingSpan(timing, "published_day_resolution_ms", () =>
        getPublishedDay(route.courseId, query.week, route.id, () => supabase, timing),
      );
      if (result.kind === "not-found") notFound();
      if (result.unavailable) redirect(`/courses/${encodeURIComponent(route.courseId)}`);
      lesson = result.lesson;
    } else {
      // Authenticated student or authorized admin preview:
      // Resolve hierarchy and progression metadata first to prevent locked lessons from transferring body blocks.
      const metadataResult = await withServerTimingSpan(timing, "published_day_metadata_resolution_ms", () =>
        getPublishedDayMetadata(route.courseId, query.week, route.id, () => supabase, timing),
      );
      if (metadataResult.kind === "not-found") notFound();

      // Fetch initial step via typed invoker RPC
      const result = await withServerTimingSpan(timing, "published_day_first_step_resolution_ms", () =>
        getPublishedDayStep(route.courseId, metadataResult.lesson.weekId, route.id, null, () => supabase, timing),
      );
      if (result.kind === "not-found") notFound();
      lesson = result.lesson;
      steps = result.steps;
      testingMode = result.testingMode;
    }

    // Request-scoped client is supplied explicitly so resource/asset/question reads
    // are constrained by RLS policies.
    const repository = createResourceRepository("supabase", () => supabase);
    const assetIds = [...new Set(lesson.blocks.flatMap((block) => block.type === "image" && block.assetId ? [block.assetId] : []))];
    const questionIds = Array.from(
      new Set(
        (lesson.blocks ?? [])
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
          { courseId: lesson.courseId, weekId: lesson.weekId, dayId: lesson.id },
          {
            visibility: preview ? "all" : "student",
            includeDraft: preview,
          },
        ),
      ),
      withServerTimingSpan(timing, "question_lookup_consume_ms", () =>
        questionIds.length > 0
          ? createQuestionRepository("supabase", () => supabase).listQuestions({
              ids: questionIds,
              visibility: preview ? "all" : "student",
              includeDraft: preview,
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
      const loadedStep = steps?.[0]?.step ?? 1;
      const typeCounts: Record<string, number> = {};
      let visualizerSourceChars = 0;
      for (const block of lesson.blocks) {
        typeCounts[block.type] = (typeCounts[block.type] ?? 0) + 1;
        if (block.type === "visualizer") visualizerSourceChars += block.source.length;
      }
      console.info(JSON.stringify({
        event: "lesson_payload_shape",
        route: timing.route,
        requestId: timing.requestId,
        stepCount: steps ? steps.length : 1,
        loadedStep,
        loadedStepBlockCount: lesson.blocks.length,
        loadedStepTypeCounts: typeCounts,
        loadedStepVisualizerSourceChars: visualizerSourceChars,
      }));
    }

    return (
      <LessonExperience
        key={lesson.id}
        lesson={lesson}
        steps={steps}
        courseId={route.courseId}
        preview={preview}
        testingMode={testingMode}
        week={query.week}
        supplementaryResources={supplementaryResources}
        assetsById={assetsById}
        questionsById={questionsById}
        freePreview={freePreview}
      />
    );
  });
}
