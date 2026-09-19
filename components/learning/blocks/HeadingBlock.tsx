"use client";

import type { HeadingBlock as HeadingBlockData } from "@/lib/content/types/lesson";

export function HeadingBlock({ text, level = 2 }: HeadingBlockData) {
  const className = "editorial-heading mb-2 text-4xl";
  if (level === 4) return <h4 className={className}>{text}</h4>;
  if (level === 3) return <h3 className={className}>{text}</h3>;
  return <h2 className={className}>{text}</h2>;
}
