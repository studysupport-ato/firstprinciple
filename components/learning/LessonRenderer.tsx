"use client";

import type { ContentBlock, Lesson } from "@/lib/content/types";
import type { Asset } from "@/lib/content/types/asset";
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
import { VisualizerBlock } from "./blocks/VisualizerBlock";

function renderBlock(block: ContentBlock, assetsById?: Record<string, Asset>) {
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
      return <QuestionBlock {...block} />;
    case "markdown":
      return <MarkdownBlock {...block} />;
    default:
      return <div className="font-sans text-xs text-[#999999]">Unsupported content block.</div>;
  }
}

export function LessonRenderer({ lesson, step, assetsById }: { lesson: Lesson; step: number; assetsById?: Record<string, Asset> }) {
  const blocks = (lesson?.blocks ?? []).filter((block) => block.step === step);
  const uniqueSteps = Array.from(new Set((lesson?.blocks ?? []).map(b => b.step ?? 1))).sort((a, b) => a - b);
  const totalSteps = uniqueSteps.length;
  const displayStep = uniqueSteps.indexOf(step) + 1 || 1;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${lesson.id}-${step}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col gap-6"
      >
        <span className="font-sans text-xs font-semibold uppercase tracking-wider text-[#111111]">
          Step {displayStep} of {totalSteps}
        </span>
        {blocks.map((block) => (
          <div key={block.id}>{renderBlock(block, assetsById)}</div>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}
