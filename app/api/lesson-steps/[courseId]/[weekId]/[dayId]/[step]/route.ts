import { NextResponse, type NextRequest } from "next/server";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { getPublishedDayStep } from "@/lib/content/publishedDay";
import { isAuthorizedLessonAdmin } from "@/lib/lessonUnlock";
import { createQuestionRepository } from "@/lib/questions/repository";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { withServerRouteTiming } from "@/lib/performance/serverTiming";
import type { Question } from "@/lib/content/types/question";

type LessonStepRouteProps = {
  params: Promise<{ courseId: string; weekId: string; dayId: string; step: string }>;
};

const NO_STORE_HEADERS = { "Cache-Control": "private, no-store" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

export async function GET(request: NextRequest, { params }: LessonStepRouteProps) {
  return withServerRouteTiming("lesson-step", async (timing) => {
    const route = await params;
    const step = Number(route.step);
    if (!Number.isSafeInteger(step)) return jsonError("Invalid lesson step.", 400);

    const supabase = await createSupabaseServerClient(timing);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!authData.user) return jsonError("Authentication required.", 401);

    const authorizedAdmin = await isAuthorizedLessonAdmin(authData.user.id);
    const result = await getPublishedDayStep(
      route.courseId,
      route.weekId,
      route.dayId,
      step,
      () => supabase,
      timing,
    );
    if (result.kind === "not-found") return jsonError("Lesson step not found.", 404);

    const assetIds = Array.from(
      new Set(result.lesson.blocks.flatMap((block) => block.type === "image" && block.assetId ? [block.assetId] : [])),
    );
    const questionIds = Array.from(
      new Set(
        result.lesson.blocks
          .filter((block): block is Extract<typeof block, { type: "question" }> => block.type === "question")
          .map((block) => block.questionId)
          .filter(Boolean),
      ),
    );
    const preview = request.nextUrl.searchParams.get("preview") === "1" && authorizedAdmin;
    const [assets, questions] = await Promise.all([
      createAssetSupabaseRepository(() => supabase).getAssetsByIds(assetIds),
      questionIds.length > 0
        ? createQuestionRepository("supabase", () => supabase).listQuestions({
            ids: questionIds,
            visibility: preview ? "all" : "student",
            includeDraft: preview,
          })
        : Promise.resolve([]),
    ]);

    return NextResponse.json(
      {
        blocks: result.lesson.blocks,
        assetsById: Object.fromEntries(assets.map((asset) => [asset.id, asset])),
        questionsById: Object.fromEntries(questions.map((question) => [question.id, question])) as Record<string, Question>,
      },
      { headers: NO_STORE_HEADERS },
    );
  });
}
