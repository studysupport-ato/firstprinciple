"use server";

import { AdminUnauthorizedError, requireAdmin } from "@/lib/adminSession";
import { createSupabaseAdminClient } from "@/lib/supabase/client";

export type FlagPreviewBlock =
  | { kind: "heading"; text: string }
  | { kind: "markdown"; markdown: string }
  | { kind: "callout"; text: string }
  | { kind: "visualizer"; title: string }
  | { kind: "quiz"; variant: string; questions: { prompt: string; options: string[]; answerIndex: number; explanation: string }[] }
  | { kind: "other"; label: string };

export type FlagPreview =
  | {
      kind: "lesson";
      title: string;
      step: number | null;
      stepCount: number;
      stepTitle: string;
      blocks: FlagPreviewBlock[];
      studentLink: string | null;
      editorLink: string;
    }
  | {
      kind: "question";
      prompt: string;
      options: { label: string; text: string; correct: boolean }[];
      answer: string | null;
      explanation: string;
      figure: string | null;
      solutionFigure: string | null;
      status: string;
      editorLink: string;
    }
  | { kind: "none"; reason: string };

type Block = { id?: string; type?: string; step?: number; text?: string; markdown?: string; title?: string; variant?: string; questions?: unknown[] };

function figurePath(tags: string[], prefix: string) {
  const key = tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
  return key && /^[a-z0-9][a-z0-9/-]*$/i.test(key) && !key.includes("..") ? `/questions/${key}.svg` : null;
}

function toPreviewBlock(block: Block): FlagPreviewBlock {
  switch (block.type) {
    case "heading":
      return { kind: "heading", text: block.text ?? "" };
    case "markdown":
      return { kind: "markdown", markdown: block.markdown ?? "" };
    case "callout":
      return { kind: "callout", text: block.text ?? "" };
    case "visualizer":
      return { kind: "visualizer", title: block.title ?? "Interactive board" };
    case "quiz":
      return {
        kind: "quiz",
        variant: block.variant ?? "mid",
        questions: (Array.isArray(block.questions) ? block.questions : []).map((raw) => {
          const q = raw as { prompt?: string; options?: string[]; answerIndex?: number; explanation?: string };
          return { prompt: q.prompt ?? "", options: Array.isArray(q.options) ? q.options : [], answerIndex: q.answerIndex ?? -1, explanation: q.explanation ?? "" };
        }),
      };
    default:
      return { kind: "other", label: block.type ?? "block" };
  }
}

/** Admin: what a flag points at, so the reviewer can read it next to the report. */
export async function getFlagPreviewAction(targetKey: string): Promise<FlagPreview> {
  try {
    await requireAdmin();
  } catch (error) {
    if (!(error instanceof AdminUnauthorizedError)) console.error("[flags] Admin guard failed:", error);
    return { kind: "none", reason: "A valid admin session is required." };
  }

  const db = createSupabaseAdminClient();
  try {
    const [type, id, stepText] = String(targetKey).split(":");

    if (type === "question" && id) {
      const { data } = await db.from("questions").select("id,prompt,options,correct_answer,explanation,tags,status").eq("id", id).maybeSingle();
      const row = data as { id: string; prompt: string; options: unknown; correct_answer: unknown; explanation: string; tags: string[] | null; status: string } | null;
      if (!row) return { kind: "none", reason: "This question no longer exists." };
      const options = (Array.isArray(row.options) ? row.options : []) as { id: string; label: string; text: string }[];
      const tags = row.tags ?? [];
      return {
        kind: "question",
        prompt: row.prompt,
        options: options.map((option) => ({ label: option.label, text: option.text, correct: option.id === row.correct_answer })),
        answer: options.length ? null : String(row.correct_answer),
        explanation: row.explanation ?? "",
        figure: figurePath(tags, "figure:"),
        solutionFigure: figurePath(tags, "solution-figure:"),
        status: row.status,
        editorLink: `/admin/questions/${row.id}`,
      };
    }

    if (type === "lesson" && id) {
      const { data } = await db.from("days").select("id,title,course_id,chapter_id,week_id,content_blocks").eq("id", id).maybeSingle();
      const day = data as { id: string; title: string; course_id: string; chapter_id: string | null; week_id: string; content_blocks: Block[] | null } | null;
      if (!day) return { kind: "none", reason: "This lesson no longer exists." };
      const blocks = Array.isArray(day.content_blocks) ? day.content_blocks : [];
      const steps = [...new Set(blocks.map((block) => block.step ?? 1))].sort((a, b) => a - b);
      const parsed = Number.parseInt(stepText ?? "", 10);
      const step = Number.isFinite(parsed) && steps.includes(parsed) ? parsed : null;
      const shown = step === null ? blocks.filter((block) => (block.step ?? 1) === steps[0]) : blocks.filter((block) => (block.step ?? 1) === step);
      const stepTitle = shown.find((block) => block.type === "heading")?.text ?? "";
      const { data: week } = await db.from("weeks").select("week_number").eq("id", day.week_id).maybeSingle();
      const weekNumber = (week as { week_number?: number } | null)?.week_number;
      return {
        kind: "lesson",
        title: day.title,
        step,
        stepCount: steps.length,
        stepTitle,
        blocks: shown.map(toPreviewBlock),
        studentLink: day.chapter_id && weekNumber ? `/courses/${day.course_id}/chapter/${day.chapter_id}/lesson/${day.id}?week=${weekNumber}&preview=1` : null,
        editorLink: `/admin/lessons/${day.id}`,
      };
    }

    return { kind: "none", reason: "Use the link above to open this item." };
  } catch (error) {
    console.error("[flags] Could not load the flagged item:", error);
    return { kind: "none", reason: "The flagged item could not be loaded." };
  }
}
