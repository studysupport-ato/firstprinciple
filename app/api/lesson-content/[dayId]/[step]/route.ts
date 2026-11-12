import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/client";
import { createAssetSupabaseRepository } from "@/lib/content/assetRepository";
import { createQuestionRepository } from "@/lib/questions/repository";
import { parseContentBlocks } from "@/lib/content/repository";
import { verifyLessonStep } from "@/lib/content/lessonContentUrls";
import type { Question } from "@/lib/content/types/question";

/**
 * One step of a published lesson, at a signed and versioned address (see lessonContentUrls).
 * The address changes whenever the lesson changes, so the response is cached by the CDN for a
 * year and shared by every student; only the first student after an edit reaches the database.
 */
type Props = { params: Promise<{ dayId: string; step: string }> };

const CACHE = { "Cache-Control": "public, max-age=86400, s-maxage=31536000, immutable" };
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: NextRequest, { params }: Props) {
  const route = await params;
  const step = Number(route.step);
  const version = request.nextUrl.searchParams.get("v") ?? "";
  const signature = request.nextUrl.searchParams.get("s") ?? "";
  if (!Number.isSafeInteger(step) || !version || !signature || !verifyLessonStep(route.dayId, step, version, signature)) {
    return NextResponse.json({ error: "This lesson link is not valid." }, { status: 403, headers: NO_STORE });
  }

  const admin = createSupabaseAdminClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rpc = (admin as any).rpc.bind(admin);
  const [{ data: current }, { data: blocksJson, error }] = await Promise.all([
    rpc("get_day_content_version", { p_day_id: route.dayId }),
    rpc("get_day_step_content", { p_day_id: route.dayId, p_step: step }),
  ]);
  if (error) return NextResponse.json({ error: "Unable to load this lesson step." }, { status: 500, headers: NO_STORE });
  // The lesson changed since this address was handed out: answer, but do not let the old address cache the new content.
  const headers = current === version ? CACHE : NO_STORE;

  const blocks = parseContentBlocks(blocksJson);
  if (!blocks.length) return NextResponse.json({ error: "Lesson step not found." }, { status: 404, headers: NO_STORE });

  const assetIds = Array.from(new Set(blocks.flatMap((block) => (block.type === "image" && block.assetId ? [block.assetId] : []))));
  const questionIds = Array.from(
    new Set(
      blocks
        .filter((block): block is Extract<typeof block, { type: "question" }> => block.type === "question")
        .map((block) => block.questionId)
        .filter(Boolean),
    ),
  );
  const [assets, questions] = await Promise.all([
    assetIds.length ? createAssetSupabaseRepository(() => admin).getAssetsByIds(assetIds) : Promise.resolve([]),
    questionIds.length
      ? createQuestionRepository("supabase", () => admin).listQuestions({ ids: questionIds, visibility: "student", includeDraft: false })
      : Promise.resolve([]),
  ]);

  return NextResponse.json(
    {
      blocks,
      assetsById: Object.fromEntries(assets.map((asset) => [asset.id, asset])),
      questionsById: Object.fromEntries(questions.map((question) => [question.id, question])) as Record<string, Question>,
    },
    { headers },
  );
}
