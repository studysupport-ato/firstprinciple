"use client";

import { Fragment, useState } from "react";
import type { ContentBlock, Lesson } from "@/lib/content/types";
import type { Asset } from "@/lib/content/types/asset";
import type { Question } from "@/lib/content/types/question";
import { AnimatePresence, motion } from "framer-motion";
import { CalloutBlock } from "./blocks/CalloutBlock";
import { HeadingBlock } from "./blocks/HeadingBlock";
import { ImageBlock, VideoBlock } from "./blocks/MediaBlocks";
import { InteractiveBlock } from "./blocks/InteractiveBlock";
import { MathBlock } from "./blocks/MathBlock";
import { MarkdownBlock } from "./blocks/MarkdownBlock";
import { QuestionBlock } from "./blocks/QuestionBlock";
import { TextBlock } from "./blocks/TextBlock";
import { WorkedExampleBlock } from "./blocks/WorkedExampleBlock";
import { QuizBlock } from "./blocks/QuizBlock";
import { isBoardSource, isCanvasSource, VisualizerBlock } from "./blocks/VisualizerBlock";

export function renderBlock(block: ContentBlock, assetsById?: Record<string, Asset>, questionsById?: Record<string, Question>) {
  switch (block.type) {
    case "heading":
      return <HeadingBlock {...block} />;
    case "text":
      return <TextBlock {...block} />;
    case "math":
      return <MathBlock {...block} />;
    case "worked-example":
      return <WorkedExampleBlock {...block} />;
    case "callout":
      return <CalloutBlock {...block} />;
    case "image":
      return <ImageBlock {...block} asset={block.assetId ? assetsById?.[block.assetId] : undefined} />;
    case "video":
      return <VideoBlock {...block} />;
    case "interactive":
      return <InteractiveBlock {...block} />;
    case "visualizer":
      return <VisualizerBlock {...block} />;
    case "question":
      return <QuestionBlock {...block} question={questionsById?.[block.questionId]} />;
    case "markdown":
      return <MarkdownBlock {...block} />;
    case "quiz":
      return <QuizBlock {...block} />;
    default:
      return <div className="font-sans text-xs text-[#999999]">Unsupported content block.</div>;
  }
}

function LessonContentBlock({
  block,
  assetsById,
  questionsById,
  deferGeoGebra,
  onFullscreenChange,
}: {
  block: ContentBlock;
  assetsById?: Record<string, Asset>;
  questionsById?: Record<string, Question>;
  deferGeoGebra: boolean;
  onFullscreenChange?: (open: boolean) => void;
}) {
  const [geoGebraOpened, setGeoGebraOpened] = useState(false);
  const isDeferredGeoGebra = deferGeoGebra && block.type === "interactive" && block.provider === "geogebra";

  if (isDeferredGeoGebra && !geoGebraOpened) {
    return (
      <button
        type="button"
        onClick={() => setGeoGebraOpened(true)}
        className="inline-flex min-h-11 items-center rounded-full border border-[#B8B2A5] bg-white px-4 py-2 text-sm font-semibold text-[#26231D] transition-colors hover:border-[#111111]"
      >
        Open interactive activity
      </button>
    );
  }

  if (block.type === "visualizer" && isBoardSource(block.source)) {
    return (
      <div
        data-testid="lesson-board"
        className="my-1 w-full"
      >
        <VisualizerBlock {...block} fill onFullscreenChange={onFullscreenChange} />
      </div>
    );
  }

  return renderBlock(block, assetsById, questionsById);
}

export function LessonRenderer({
  lesson,
  step,
  assetsById,
  questionsById,
  deferGeoGebra = false,
  onFullscreenChange,
  pane,
  hideProgress = false,
  blueprint = false,
}: {
  lesson: Lesson;
  step: number;
  /** Render only one half of a split step. Omit to render every block. */
  pane?: "main" | "side";
  /** The lesson page draws its own progress strip when a step is split. */
  hideProgress?: boolean;
  /** Student lesson page: every visualizer gets the blue-print page and expands to fit. */
  blueprint?: boolean;
  assetsById?: Record<string, Asset>;
  questionsById?: Record<string, Question>;
  deferGeoGebra?: boolean;
  onFullscreenChange?: (open: boolean) => void;
}) {
  const blocks = (lesson?.blocks ?? []).filter(
    (block) => (block.step ?? 1) === step && (!pane || (block.pane ?? "main") === pane),
  );
  const uniqueSteps = Array.from(new Set((lesson?.blocks ?? []).map(b => b.step ?? 1))).sort((a, b) => a - b);
  const currentStepIndex = Math.max(0, uniqueSteps.indexOf(step));
  const progress = (
    <div
      aria-label={`Lesson progress: step ${currentStepIndex + 1} of ${uniqueSteps.length}`}
      className="lesson-step-progress flex w-full gap-1.5"
    >
      {uniqueSteps.map((lessonStep, index) => (
        <span
          key={lessonStep}
          aria-hidden
          className={`h-[3px] flex-1 rounded-full ${index <= currentStepIndex ? "bg-[#E9BC3A]" : "bg-[#D9D6CF]"}`}
        />
      ))}
    </div>
  );

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${lesson.id}-${step}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="lesson-guided-step flex flex-col gap-6"
      >
        {hideProgress || blocks[0]?.type === "heading" ? null : progress}
        {blocks.map((block) => (
          <Fragment key={block.id}>
            <div
              data-testid="lesson-content-block"
              data-block-id={block.id}
              data-block-type={block.type}
              className={pane === "side" && (block.type === "callout" || block.type === "worked-example") ? "lesson-note" : undefined}
            >
              {pane === "side" && (block.type === "callout" || block.type === "worked-example") ? (
                <div className="lesson-note-label">Additional note</div>
              ) : null}
              <LessonContentBlock
                block={blueprint && block.type === "visualizer" && !isCanvasSource(block.source) ? { ...block, fit: true } : block}
                assetsById={assetsById}
                questionsById={questionsById}
                deferGeoGebra={deferGeoGebra}
                onFullscreenChange={onFullscreenChange}
              />
            </div>
            {!hideProgress && block === blocks[0] && block.type === "heading" ? progress : null}
          </Fragment>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
