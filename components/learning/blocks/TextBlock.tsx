"use client";

import type { TextBlock as TextBlockData } from "@/lib/content/types/lesson";
import { InlineMathText } from "./MarkdownBlock";

import { MathText } from "./MathText";

export function TextBlock({ body }: TextBlockData) {
  return (
    <div className="editorial-body text-[#111111]">
      <InlineMathText text={body} />
    </div>
  );
}
