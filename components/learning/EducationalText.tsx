"use client";

import type { ReactNode } from "react";
import { MathText } from "./blocks/MathText";

/** Renders educator-authored short text with the same inline math support as lesson text. */
export function EducationalText({ text, className }: { text: string; className?: string }) {
  return <span className={className}>{inlineContent(text, "educational-text")}</span>;
}

/** Backwards-compatible name for existing lesson-block imports. */
export function InlineMathText({ text }: { text: string }) {
  return <EducationalText text={text} />;
}

function inlineContent(value: string, keyPrefix: string): ReactNode[] {
  const tokens = value.split(/(\$\$[^$]+\$\$|\$[^$\n]+\$)/g).filter(Boolean);

  return tokens.map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    if (token.startsWith("$$") && token.endsWith("$$")) return <MathText key={key} math={token.slice(2, -2)} block />;
    if (token.startsWith("$") && token.endsWith("$")) return <MathText key={key} math={token.slice(1, -1)} />;
    return <span key={key}>{token}</span>;
  });
}
