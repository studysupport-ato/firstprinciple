"use client";

import type { QuestionBlock as QuestionBlockData } from "@/lib/content/types/lesson";
import type { Question } from "@/lib/content/types/question";
import { EducationalText } from "@/components/learning/EducationalText";


export function QuestionBlock({ questionId, question }: QuestionBlockData & { question?: Question }) {
  // Task 40F.3: the question is resolved server-side from the Supabase
  // question bank by the lesson route. A missing/withdrawn question keeps the
  // existing "Question unavailable." state — it never falls back to fixtures.
  if (!question) return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-4 font-sans text-sm text-[#666666]">Question unavailable.</div>;
  return <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5"><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#2563EB]">Concept check</span><p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]"><EducationalText text={question.prompt} /></p><p className="mt-3 font-sans text-xs text-[#666666]">{question.marks} mark · {question.difficulty}</p></div>;
}
