"use client";

import type { HeadingBlock as HeadingBlockData } from "@/lib/content/types/lesson";
import { InlineMathText } from "./MarkdownBlock";


export function HeadingBlock({ text, level = 2, variant }: HeadingBlockData) {
  if (variant === "subtopic") {
    return (
      <div className="lesson-subtopic">
        <h3><InlineMathText text={text} /></h3>
      </div>
    );
  }
  const className = "editorial-heading mb-2 text-4xl";
  if (level === 4) return <h4 className={className}><InlineMathText text={text} /></h4>;
  if (level === 3) return <h3 className={className}><InlineMathText text={text} /></h3>;
  return <h2 className={className}><InlineMathText text={text} /></h2>;
}
