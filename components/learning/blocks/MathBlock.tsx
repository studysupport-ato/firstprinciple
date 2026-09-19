"use client";

import type { MathBlock as MathBlockData } from "@/lib/content/types/lesson";
import { MathText } from "./MathText";

export function MathBlock({ expression, display = false }: MathBlockData) {
  return <MathText math={expression} block={display} />;
}
