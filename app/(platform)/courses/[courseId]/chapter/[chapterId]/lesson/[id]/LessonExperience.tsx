"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { completeDay, startDay } from "@/lib/progress";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { SupplementaryResources } from "@/components/learning/SupplementaryResources";
import { getGeoGebraEmbedConfig } from "@/lib/content/resourcePresentation";
import type { LearningResource } from "@/lib/content/types/resource";
import type { Lesson } from "@/lib/content/types/lesson";

export function LessonExperience({ lesson, courseId, preview, week, supplementaryResources }: { lesson: Lesson; courseId: string; preview: boolean; week?: string; supplementaryResources: LearningResource[] }) {
  const [currentStep, setCurrentStep] = useState(0);

  const geoResource = useMemo(() => supplementaryResources.find((resource) => resource.type === "geogebra"), [supplementaryResources]);
  useEffect(() => { if (!preview) startDay(lesson.courseId, lesson.weekId, lesson.id); }, [lesson, preview]);

  const totalSteps = lesson.blocks.reduce((highest, block) => Math.max(highest, block.step ?? 0), 0);
  const isComplete = currentStep === totalSteps - 1;
  const roadmapHref = week ? `/courses/${courseId}/roadmap/week/${week}` : `/courses/${courseId}/roadmap`;
  const chapterLabel = lesson.chapterId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="z-20 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-8">
        <div className="flex items-center gap-4"><Link href={roadmapHref} className="text-[#666666] transition-colors hover:text-[#111111]"><ChevronLeft size={20} /></Link><div className="flex items-center gap-2"><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#666666]">{chapterLabel}</span><span className="text-[#E5E5E5]">/</span><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#111111]">{lesson.title}</span></div></div>
        <div className="flex items-center gap-2">{Array.from({ length: totalSteps }).map((_, index) => <div key={index} className={`h-2 w-2 rounded-full transition-colors duration-300 ${index <= currentStep ? "bg-[#C96B2D]" : "bg-[#E5E5E5]"}`} />)}</div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <div className="relative z-10 flex w-full flex-col justify-between border-r border-[#E5E5E5] bg-white lg:w-[45%]">
          <div className="overflow-y-auto p-12 lg:p-16"><LessonRenderer lesson={lesson} step={currentStep + 1} />{isComplete ? <SupplementaryResources resources={supplementaryResources} /> : null}</div>
          <div className="flex items-center justify-between border-t border-[#E5E5E5] bg-[#F7F7F8] p-8"><button onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0} className="flex items-center gap-2 text-sm font-sans font-medium text-[#666666] transition-colors hover:text-[#111111] disabled:opacity-30"><ChevronLeft size={16} /> Previous</button>{!isComplete ? <button onClick={() => setCurrentStep((step) => Math.min(totalSteps - 1, step + 1))} className="flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#C96B2D]">Continue <ChevronRight size={16} /></button> : <Link href={roadmapHref} onClick={() => { if (!preview) completeDay(lesson.courseId, lesson.weekId, lesson.id); }}><span className="flex items-center gap-2 rounded-full bg-[#059669] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105">Complete Lesson <CheckCircle2 size={16} /></span></Link>}</div>
        </div>
        <div className="hidden w-[55%] items-center justify-center bg-white p-8 lg:flex">{geoResource ? <div className="w-full max-w-[960px]"><GeoGebraProvider config={getGeoGebraEmbedConfig(geoResource.data)} title={geoResource.title} /></div> : <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-dashed border-[#E5E5E5] bg-[#F7F7F8] p-8 text-center text-sm text-[#666666]">No interactive visualization configured for this lesson.</div>}</div>
      </div>
    </div>
  );
}