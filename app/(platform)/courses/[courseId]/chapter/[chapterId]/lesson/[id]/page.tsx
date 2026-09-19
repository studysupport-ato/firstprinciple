"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { completeDay, startDay } from "@/lib/progress";
import { getLesson, getLessonForRoute } from "@/lib/content/access";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { SupplementaryResources } from "@/components/learning/SupplementaryResources";
import { getResourcesForDay } from "@/lib/content/resources";
import { getGeoGebraEmbedConfig } from "@/lib/content/resourcePresentation";

export default function LessonPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const preview = searchParams.get("preview") === "1";

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const defaultLesson = getLesson("math151-argand-plane");

  const lesson = useMemo(() => {
    if (!isHydrated) return defaultLesson;

    return (
      getLessonForRoute(
        params.courseId as string,
        params.chapterId as string,
        params.id as string,
        { includeDraft: preview },
      ) ?? defaultLesson
    );
  }, [defaultLesson, isHydrated, params.courseId, params.chapterId, params.id, preview]);

  const supplementaryResources = useMemo(() => {
    if (!lesson || !isHydrated) return [];
    try {
      return getResourcesForDay(lesson.id, { includeDraft: preview });
    } catch {
      return [];
    }
  }, [isHydrated, lesson, preview]);

  const geoResource = useMemo(() => supplementaryResources.find((resource) => resource.type === "geogebra"), [supplementaryResources]);

  useEffect(() => {
    if (lesson && !preview) startDay(lesson.courseId, lesson.weekId, lesson.id);
  }, [lesson, preview]);

  if (!lesson) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-6 text-center">
        <div className="max-w-md">
          <p className="font-sans text-xs font-semibold uppercase tracking-[0.28em] text-[#666666]">Lesson unavailable</p>
          <h1 className="mt-3 font-serif text-3xl text-[#111111]">This lesson could not be loaded.</h1>
        </div>
      </div>
    );
  }

  const totalSteps = lesson.blocks.reduce((highest, block) => Math.max(highest, block.step ?? 0), 0);
  const isComplete = currentStep === totalSteps - 1;
  const week = searchParams.get("week");
  const roadmapHref = week
    ? `/courses/${params.courseId}/roadmap/week/${week}${preview ? "?preview=1" : ""}`
    : `/courses/${params.courseId}/roadmap${preview ? "?preview=1" : ""}`;
  const chapterLabel = lesson.chapterId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

  const nextStep = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(curr => curr + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(curr => curr - 1);
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      
      {/* Lesson Header */}
      <header className="flex-shrink-0 h-16 border-b border-[#E5E5E5] flex items-center justify-between px-8 bg-white z-20">
        <div className="flex items-center gap-4">
          <Link href={roadmapHref} className="text-[#666666] hover:text-[#111111] transition-colors">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#666666]">
              {chapterLabel}
            </span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold tracking-widest uppercase text-[#111111]">
              {lesson.title}
            </span>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }).map((_, idx) => (
            <div 
              key={idx}
              className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                idx <= currentStep ? "bg-[#2563EB]" : "bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>
      </header>

      {/* Main Lesson Split View */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Side: Content & Interaction */}
        <div className="w-full lg:w-[45%] flex flex-col justify-between border-r border-[#E5E5E5] bg-white relative z-10">
          
          <div className="p-12 lg:p-16 overflow-y-auto">
            <LessonRenderer lesson={lesson} step={currentStep + 1} />
            {isComplete ? <SupplementaryResources resources={supplementaryResources} /> : null}
          </div>

          {/* Navigation Controls */}
          <div className="p-8 border-t border-[#E5E5E5] bg-[#F7F7F8] flex items-center justify-between">
            <button 
              onClick={prevStep}
              disabled={currentStep === 0}
              className="flex items-center gap-2 text-sm font-sans font-medium text-[#666666] disabled:opacity-30 hover:text-[#111111] transition-colors"
            >
              <ChevronLeft size={16} /> Previous
            </button>
            
            {!isComplete ? (
              <button 
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-[#111111] text-white rounded-full text-sm font-semibold hover:bg-[#2563EB] transition-colors shadow-sm"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <Link
                href={roadmapHref}
                onClick={() => {
                  if (!preview) completeDay(lesson.courseId, lesson.weekId, lesson.id);
                }}
              >
                <button className="flex items-center gap-2 px-6 py-3 bg-[#059669] text-white rounded-full text-sm font-semibold hover:scale-105 transition-transform shadow-sm">
                  Complete Lesson <CheckCircle2 size={16} />
                </button>
              </Link>
            )}
          </div>
        </div>

        {/* Right Side: configured GeoGebra resource for this Day */}
        <div className="hidden lg:flex w-[55%] items-center justify-center bg-[#FFFFFF] p-8">
          {geoResource ? (
            <div className="w-full max-w-[960px]">
              <GeoGebraProvider config={getGeoGebraEmbedConfig(geoResource.data)} title={geoResource.title} />
            </div>
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-[28px] border border-dashed border-[#E5E5E5] bg-[#F7F7F8] p-8 text-center text-sm text-[#666666]">
              No interactive visualization configured for this lesson.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
