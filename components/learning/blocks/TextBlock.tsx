"use client";

import type { TextBlock as TextBlockData } from "@/lib/content/types/lesson";
import { MathText } from "./MathText";

export function TextBlock({ body }: TextBlockData) {
  return (
    <div className="editorial-body text-[#111111]">
      {body.split(/(\$.*?\$)/g).map((part, index) =>
        part.startsWith("$") && part.endsWith("$")
          ? <MathText key={index} math={part.slice(1, -1)} />
          : <span key={index}>{part}</span>,
      )}
    </div>
  );
}
