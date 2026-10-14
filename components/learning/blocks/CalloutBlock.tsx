"use client";

import type { CalloutBlock as CalloutBlockData } from "@/lib/content/types/lesson";
import { MarkdownBlock } from "./MarkdownBlock";

export function CalloutBlock({ text, tone }: CalloutBlockData) {
  // A slim note: a coloured rule down the left and a faint tint, no boxed card.
  const toneClass = tone === "warning" ? "border-[#E9A23B] bg-[#E9A23B]/[0.07]" : tone === "tip" ? "border-[#3FA36B] bg-[#3FA36B]/[0.07]" : "border-[#4A86E8] bg-[#4A86E8]/[0.06]";
  return <div className={`lesson-callout my-3 rounded-r-lg border-l-[3px] py-1 pl-4 pr-3 font-sans text-sm leading-relaxed ${toneClass}`}><MarkdownBlock markdown={text} /></div>;
}
