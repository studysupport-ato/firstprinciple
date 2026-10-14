"use client";

import type { CalloutBlock as CalloutBlockData } from "@/lib/content/types/lesson";
import { MarkdownBlock } from "./MarkdownBlock";

export function CalloutBlock({ text, tone }: CalloutBlockData) {
  // A note or an answer: ordinary centred text inside a very thin grey outline.
  return <div className={`lesson-callout lesson-callout-${tone ?? "info"} my-3 rounded-lg px-4 py-1.5 text-center`}><MarkdownBlock markdown={text} /></div>;
}
