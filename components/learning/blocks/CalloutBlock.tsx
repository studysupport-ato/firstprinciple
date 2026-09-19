"use client";

import type { CalloutBlock as CalloutBlockData } from "@/lib/content/types/lesson";

export function CalloutBlock({ text, tone }: CalloutBlockData) {
  const toneClass = tone === "warning" ? "border-[#F5D48A] bg-[#FFFBEB] text-[#92400E]" : tone === "tip" ? "border-[#B7E3CF] bg-[#F0FDF4] text-[#166534]" : "border-[#BFDBFE] bg-[#EFF6FF] text-[#1E40AF]";
  return <div className={`rounded-2xl border px-4 py-3 font-sans text-sm leading-relaxed ${toneClass}`}>{text}</div>;
}
