"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2, ChevronUp, ChevronDown } from "lucide-react";
import Link from "next/link";
import { completeDay, startDay } from "@/lib/progress";
import { LessonRenderer, renderBlock } from "@/components/learning/LessonRenderer";
import { VisualizerBlock, isBoardSource } from "@/components/learning/blocks/VisualizerBlock";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { LessonVideo, SupplementaryResources } from "@/components/learning/SupplementaryResources";
import { getGeoGebraEmbedConfig } from "@/lib/content/resourcePresentation";
import { EducationalText } from "@/components/learning/EducationalText";
import type { LearningResource } from "@/lib/content/types/resource";
import type { Lesson } from "@/lib/content/types/lesson";
import type { Asset } from "@/lib/content/types/asset";
import type { Question } from "@/lib/content/types/question";

const CHECK_MARKER = "data-b2b-check";

export function LessonExperience({ lesson, courseId, preview, week, supplementaryResources, assetsById, questionsById }: { lesson: Lesson; courseId: string; preview: boolean; week?: string; supplementaryResources: LearningResource[]; assetsById?: Record<string, Asset>; questionsById?: Record<string, Question> }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [notesOpen, setNotesOpen] = useState(false);
  useEffect(() => { setNotesOpen(false); }, [currentStep]);

  const geoResource = useMemo(() => supplementaryResources.find((resource) => resource.type === "geogebra"), [supplementaryResources]);
  useEffect(() => { if (!preview) startDay(lesson.courseId, lesson.weekId, lesson.id); }, [lesson, preview]);

  const uniqueSteps = useMemo(() => Array.from(new Set(lesson.blocks.map((block) => block.step ?? 1))).sort((a, b) => a - b), [lesson.blocks]);
  const totalSteps = uniqueSteps.length;
  const isComplete = currentStep >= totalSteps - 1;
  const activeStep = uniqueSteps[currentStep] ?? 1;
  const roadmapHref = week ? `/courses/${courseId}/roadmap/week/${week}` : `/courses/${courseId}/roadmap`;
  const weekLabel = week ? `Week ${week.replace("w", "")}` : "Week";

  // After-lesson check: a board whose source carries CHECK_MARKER must be finished before the day can be
  // completed. The board runs in a sandboxed iframe and reports completion with a postMessage.
  const hasCheck = useMemo(() => lesson.blocks.some((block) => block.type === "visualizer" && typeof block.source === "string" && block.source.includes(CHECK_MARKER)), [lesson.blocks]);
  const checkKey = `b2b-check-done:${lesson.id}`;
  const [checkDone, setCheckDone] = useState(false);
  useEffect(() => {
    try { setCheckDone(window.localStorage.getItem(checkKey) === "1"); } catch { setCheckDone(false); }
  }, [checkKey]);
  useEffect(() => {
    if (!hasCheck) return;
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; status?: string } | null;
      if (!data || data.type !== "b2b-lesson-check" || data.status !== "complete") return;
      setCheckDone(true);
      try { window.localStorage.setItem(checkKey, "1"); } catch { /* storage unavailable: unlocked for this visit only */ }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hasCheck, checkKey]);
  const completeLocked = hasCheck && !checkDone && !preview;

  const renderNavigation = (compact = false) => (
    <div className={`flex items-center justify-between border-t border-[#E5E5E5] bg-white ${compact ? "px-5 py-1.5" : "px-8 py-3"}`}>
      <button onClick={() => setCurrentStep((step) => Math.max(0, step - 1))} disabled={currentStep === 0} className="flex items-center gap-2 text-sm font-sans font-medium text-[#666666] transition-colors hover:text-[#111111] disabled:opacity-30"><ChevronLeft size={16} /> Previous</button>
      {!isComplete ? (
        <button onClick={() => setCurrentStep((step) => Math.min(totalSteps - 1, step + 1))} className={`flex items-center gap-2 rounded-full bg-[#111111] px-6 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#FFBE00] hover:text-[#111111]`}>Continue <ChevronRight size={16} /></button>
      ) : completeLocked ? (
        <button type="button" disabled aria-disabled="true" className={`flex cursor-not-allowed items-center gap-2 rounded-full bg-[#E5E5E5] px-6 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-[#555555]`}>Answer the check to complete the day</button>
      ) : (
        <Link href={roadmapHref} onClick={() => { if (!preview) completeDay(lesson.courseId, lesson.weekId, lesson.id); }}><span className={`flex items-center gap-2 rounded-full bg-[#059669] px-6 ${compact ? "py-2" : "py-3"} text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105`}>Complete Day <CheckCircle2 size={16} /></span></Link>
      )}
    </div>
  );

  const activeBlocks = useMemo(() => lesson.blocks.filter((block) => block.step === activeStep), [lesson.blocks, activeStep]);
  
  const hasBlocks = activeBlocks.length > 0;
  const hasTextContent = activeBlocks.some((b) => !["image", "video", "interactive"].includes(b.type));
  
  const hasSideContent = Boolean(geoResource) && (!hasBlocks || hasTextContent);

  // Board mode: a step that carries a board gives the whole learning space to it.
  // Every other block in the step (markdown, callouts, worked examples, questions) moves into the notes whiteboard.
  const boardBlock = !geoResource ? activeBlocks.find((block) => block.type === "visualizer" && isBoardSource(block.source)) : undefined;
  const noteBlocks = boardBlock ? activeBlocks.filter((block) => block !== boardBlock) : [];
  const hasNotes = noteBlocks.length > 0 || (isComplete && supplementaryResources.length > 0);
  const isFullWidthInteractive = hasSideContent && !hasBlocks;

  return (
    <div className="flex h-screen flex-col bg-white">
      <header className="z-20 flex h-9 flex-shrink-0 items-center justify-between border-b border-[#E5E5E5] bg-white px-5">
        <div className="flex items-center gap-4"><Link href={roadmapHref} className="text-[#666666] transition-colors hover:text-[#111111]"><ChevronLeft size={16} /></Link><div className="flex items-center gap-2"><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#666666]">{weekLabel}</span><span className="text-[#E5E5E5]">/</span><span className="font-sans text-[10px] font-bold uppercase tracking-widest text-[#111111]"><EducationalText text={lesson.title} /></span></div></div>
        <div className="flex items-center gap-2">{Array.from({ length: totalSteps }).map((_, index) => <div key={index} className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${index <= currentStep ? "bg-[#FFBE00]" : "bg-[#E5E5E5]"}`} />)}</div>
      </header>
      {boardBlock && boardBlock.type === "visualizer" ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-[#12335A]">
            <VisualizerBlock key={boardBlock.id} {...boardBlock} fill />
            {hasNotes ? (
              <>
                <button
                  type="button"
                  onClick={() => setNotesOpen(true)}
                  aria-expanded={notesOpen}
                  className="absolute bottom-5 left-6 z-20 flex h-[46px] items-center gap-2 rounded-full border-2 border-[#EAF2FF]/50 bg-[#12335A]/90 px-5 font-sans text-sm font-extrabold text-[#EAF2FF] transition-colors hover:border-[#FFC700]"
                >
                  <ChevronUp size={16} /> Notes
                </button>
                <div
                  onClick={() => setNotesOpen(false)}
                  className={`absolute inset-0 z-30 bg-[#050E1C]/55 transition-opacity duration-300 ${notesOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
                />
                <section
                  aria-label="Lesson notes"
                  aria-hidden={!notesOpen}
                  className={`absolute inset-x-0 bottom-0 z-40 flex h-[88%] flex-col rounded-t-[22px] border-t-[6px] border-[#C9CED6] bg-[#FBFAF5] shadow-[0_-14px_40px_rgba(0,0,0,0.45)] transition-transform duration-500 ease-out ${notesOpen ? "translate-y-0" : "invisible translate-y-[104%]"}`}
                >
                  <div className="relative flex flex-shrink-0 items-center justify-between border-b-2 border-[#D9D4C4] px-8 pb-3 pt-5 lg:px-12">
                    <div className="absolute left-1/2 top-2 h-[5px] w-14 -translate-x-1/2 rounded-full bg-[#C3C7CF]" />
                    <h2 className="font-sans text-lg font-extrabold text-[#18233A]">Lesson notes</h2>
                    <button type="button" onClick={() => setNotesOpen(false)} className="flex items-center gap-1.5 rounded-full border-2 border-[#18233A] px-4 py-1.5 font-sans text-sm font-extrabold text-[#18233A]">
                      <ChevronDown size={16} /> Back to the board
                    </button>
                  </div>
                  <div className="flex flex-col gap-6 overflow-y-auto px-8 py-8 lg:px-12">
                    {noteBlocks.map((block) => (
                      <div key={block.id}>{renderBlock(block, assetsById, questionsById)}</div>
                    ))}
                    {isComplete ? <><LessonVideo resources={supplementaryResources} /><SupplementaryResources resources={supplementaryResources} /></> : null}
                  </div>
                </section>
              </>
            ) : null}
          </div>
          {renderNavigation(true)}
        </div>
      ) : (
      <div className="flex flex-1 overflow-hidden">
        {!isFullWidthInteractive && (
          <div className={`relative z-10 flex flex-col justify-between border-r border-[#E5E5E5] bg-white ${hasSideContent ? "w-full lg:w-[45%]" : "w-full"}`}>
            <div className="overflow-y-auto p-12 lg:p-16">
              <LessonRenderer lesson={lesson} step={activeStep} assetsById={assetsById} questionsById={questionsById} />
              {isComplete ? <><LessonVideo resources={supplementaryResources} /><SupplementaryResources resources={supplementaryResources} /></> : null}
            </div>
            {renderNavigation()}
          </div>
        )}
        {hasSideContent && (
          <div className={`${isFullWidthInteractive ? "flex w-full flex-col" : "hidden w-[55%] lg:flex"} items-center justify-center bg-white`}>
            <div className={`w-full ${isFullWidthInteractive ? "flex-1 p-8" : "max-w-[960px] p-8"}`}>
              <GeoGebraProvider config={getGeoGebraEmbedConfig(geoResource!.data)} title={geoResource!.title} />
            </div>
            {isFullWidthInteractive && (
              <div className="w-full flex flex-col">
                {isComplete ? <div className="px-12 pb-8 lg:px-16"><LessonVideo resources={supplementaryResources} /><SupplementaryResources resources={supplementaryResources} /></div> : null}
                {renderNavigation()}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
