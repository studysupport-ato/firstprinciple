"use client";

import type { QuestionBlock as QuestionBlockData } from "@/lib/content/types/lesson";
import { getQuestion } from "@/lib/content/access";
import { EducationalText } from "@/components/learning/EducationalText";


export function QuestionBlock({ questionId }: QuestionBlockData) {
  const question = getQuestion(questionId);
  if (!question) return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 font-sans text-sm text-[#666666]">Question unavailable.</div>;
  return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5"><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Concept check</span><p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]"><EducationalText text={question.prompt} /></p><p className="mt-3 font-sans text-xs text-[#666666]">{question.marks} mark · {question.difficulty}</p></div>;
}
