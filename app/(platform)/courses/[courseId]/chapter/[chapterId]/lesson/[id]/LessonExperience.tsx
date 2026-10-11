"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronLeft, MessageCircle } from "lucide-react";
import Link from "next/link";
import { completeDay, startDay } from "@/lib/progress";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { LessonVideo, SupplementaryResources } from "@/components/learning/SupplementaryResources";
import { getGeoGebraEmbedConfig } from "@/lib/content/resourcePresentation";
import { EducationalText } from "@/components/learning/EducationalText";
import type { LearningResource } from "@/lib/content/types/resource";
import type { Lesson } from "@/lib/content/types/lesson";
import type { Asset } from "@/lib/content/types/asset";
import type { Question } from "@/lib/content/types/question";

type LessonExperienceProps = {
  lesson: Lesson;
  courseId: string;
  preview: boolean;
  week?: string;
  supplementaryResources: LearningResource[];
  assetsById?: Record<string, Asset>;
  questionsById?: Record<string, Question>;
};

function formatSectionLabel(chapterId: string) {
  return chapterId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function LessonExperience({
  lesson,
  courseId,
  preview,
  week,
  supplementaryResources,
  assetsById,
  questionsById,
}: LessonExperienceProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [boardFullscreen, setBoardFullscreen] = useState(false);
  useEffect(() => { window.performance.mark("b2b-lesson-hydrated"); }, []);

  const geoResource = useMemo(
    () => supplementaryResources.find((resource) => resource.type === "geogebra"),
    [supplementaryResources],
  );
  useEffect(() => {
    if (!preview) startDay(lesson.courseId, lesson.weekId, lesson.id);
  }, [lesson, preview]);

  const uniqueSteps = useMemo(
    () => Array.from(new Set(lesson.blocks.map((block) => block.step ?? 1))).sort((a, b) => a - b),
    [lesson.blocks],
  );
  const totalSteps = uniqueSteps.length;
  const isComplete = currentStep >= totalSteps - 1;
  const activeStep = uniqueSteps[currentStep] ?? 1;
  const roadmapHref = week ? `/courses/${courseId}/roadmap/week/${week}` : `/courses/${courseId}/roadmap`;
  const weekLabel = week ? `Week ${week.replace("w", "")}` : "Week";
  const sectionLabel = formatSectionLabel(lesson.chapterId);
  const activeBlocks = useMemo(
    () => lesson.blocks.filter((block) => (block.step ?? 1) === activeStep),
    [lesson.blocks, activeStep],
  );

  const hasBlocks = activeBlocks.length > 0;
  const hasTextContent = activeBlocks.some((block) => !["image", "video", "interactive"].includes(block.type));
  const hasSideContent = Boolean(geoResource) && (!hasBlocks || hasTextContent);
  const isFullWidthInteractive = hasSideContent && !hasBlocks;

  const renderNavigation = () => (
    <nav
      aria-label="Lesson steps"
      className="flex min-h-14 flex-shrink-0 items-center justify-between border-t border-[#E3DED3] bg-white px-3 py-2 md:px-6"
    >
      <button
        type="button"
        onClick={() => setCurrentStep((step) => Math.max(0, step - 1))}
        disabled={currentStep === 0}
        className="flex min-h-11 items-center gap-1.5 px-2 font-sans text-sm font-medium text-[#666666] transition-colors hover:text-[#111111] disabled:opacity-35"
      >
        <ChevronLeft size={16} /> Previous
      </button>
      {!isComplete ? (
        <button
          type="button"
          onClick={() => setCurrentStep((step) => Math.min(totalSteps - 1, step + 1))}
          className="flex min-h-11 items-center gap-2 rounded-full bg-[#111111] px-7 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#333333]"
        >
          Continue <span aria-hidden>›</span>
        </button>
      ) : (
        <Link
          href={roadmapHref}
          onClick={() => { if (!preview) completeDay(lesson.courseId, lesson.weekId, lesson.id); }}
        >
          <span className="flex min-h-11 items-center gap-2 rounded-full bg-[#059669] px-6 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Complete Day <CheckCircle2 size={16} />
          </span>
        </Link>
      )}
    </nav>
  );

  return (
    <div
      className={`flex flex-col ${preview ? "h-[calc(100dvh-76px)] md:h-[calc(100dvh-48px)]" : "h-[calc(100dvh-28px)] md:h-screen"}`}
      style={{ background: "#FBFAF5" }}
    >
      <header className="z-20 flex h-9 flex-shrink-0 items-center justify-between border-b border-[#E3DED3] bg-white px-3 md:h-12 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={roadmapHref}
            aria-label="Back to course roadmap"
            className="flex h-8 w-8 shrink-0 items-center text-[#333333] transition-colors hover:text-[#111111]"
          >
            <ChevronLeft size={18} />
          </Link>
          <span className="shrink-0 font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#4A463F]">
            {weekLabel}
          </span>
          <span className="shrink-0 text-[#B6B0A4]">/</span>
          <span className="truncate font-sans text-[10px] font-semibold uppercase tracking-[0.12em] text-[#25231F]">
            <EducationalText text={sectionLabel} />
          </span>
        </div>
        <div
          data-testid="lesson-step-indicator"
          data-current-step={currentStep}
          aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
          className="ml-2 flex shrink-0 items-center gap-1.5"
        >
          {uniqueSteps.map((step, index) => (
            <span
              key={step}
              aria-hidden
              className={`h-1.5 w-1.5 rounded-full transition-colors duration-300 ${
                index <= currentStep ? "bg-[#E9BC3A]" : "bg-[#D9D6CF]"
              }`}
            />
          ))}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isFullWidthInteractive ? (
          <section
            aria-label={`Lesson step ${currentStep + 1}`}
            className={`relative ${boardFullscreen ? "z-[60]" : "z-10"} flex min-h-0 flex-col ${hasSideContent ? "w-full lg:w-[45%]" : "w-full"}`}
            style={{
              backgroundColor: "#FBFAF5",
              backgroundImage: "radial-gradient(circle, rgba(150, 139, 115, 0.22) 1px, transparent 1px)",
              backgroundSize: "20px 20px",
            }}
          >
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-3 py-3 md:px-10 md:py-8 lg:px-16 lg:py-12">
              <div className="lesson-guided-content mx-auto max-w-[640px]">
                <LessonRenderer
                  lesson={lesson}
                  step={activeStep}
                  assetsById={assetsById}
                  questionsById={questionsById}
                  deferGeoGebra
                  onFullscreenChange={setBoardFullscreen}
                />
                {isComplete ? (
                  <div className="mt-4 flex flex-col gap-4">
                    <LessonVideo resources={supplementaryResources} />
                    <SupplementaryResources resources={supplementaryResources} />
                  </div>
                ) : null}
              </div>
            </div>
            {renderNavigation()}
          </section>
        ) : null}

        {hasSideContent ? (
          <aside className={`${isFullWidthInteractive ? "flex w-full flex-col" : "hidden w-[55%] lg:flex"} items-center justify-center bg-white`}>
            <div className={`w-full ${isFullWidthInteractive ? "flex-1 p-8" : "max-w-[960px] p-8"}`}>
              <GeoGebraProvider config={getGeoGebraEmbedConfig(geoResource!.data)} title={geoResource!.title} />
            </div>
            {isFullWidthInteractive ? (
              <div className="w-full">
                {isComplete ? (
                  <div className="px-12 pb-8 lg:px-16">
                    <LessonVideo resources={supplementaryResources} />
                    <SupplementaryResources resources={supplementaryResources} />
                  </div>
                ) : null}
                {renderNavigation()}
              </div>
            ) : null}
          </aside>
        ) : null}
      </div>

      <button
        type="button"
        aria-label="Open chat"
        className="fixed bottom-[72px] right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-[#E9BC3A] shadow-[0_4px_16px_rgba(0,0,0,0.20)] transition-transform hover:scale-105 active:scale-95 md:bottom-[80px]"
      >
        <MessageCircle size={20} strokeWidth={2} className="text-[#1A1814]" />
      </button>
    </div>
  );
}
