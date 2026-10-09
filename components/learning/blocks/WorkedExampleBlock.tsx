"use client";

import type { WorkedExampleBlock as WorkedExampleBlockData } from "@/lib/content/types/lesson";
import { EducationalText } from "@/components/learning/EducationalText";
import { MarkdownBlock } from "./MarkdownBlock";

export function WorkedExampleBlock({ title, prompt, solution, markdown }: WorkedExampleBlockData) {
  return (
    <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
      <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Worked example</span>
      <h3 className="mt-2 font-serif text-2xl text-[#111111]"><EducationalText text={title} /></h3>
      {markdown?.trim() ? (
        <div className="mt-3 border-t border-[#E5E5E5] pt-1">
          <MarkdownBlock markdown={markdown} />
        </div>
      ) : (
        <>
          <p className="mt-3 font-sans text-sm leading-relaxed text-[#666666]"><EducationalText text={prompt} /></p>
          <p className="mt-4 border-t border-[#E5E5E5] pt-4 font-sans text-sm leading-relaxed text-[#111111]"><EducationalText text={solution} /></p>
        </>
      )}
    </div>
  );
}
