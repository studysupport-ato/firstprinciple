"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ChevronLeft, ListOrdered, Moon, Sun, X } from "lucide-react";
import { FlagButton } from "@/components/flags/FlagButton";
import { courseCodeLabel } from "@/lib/flags/shared";
import Link from "next/link";
import { completeDay, startDay } from "@/lib/progress";
import { LessonRenderer } from "@/components/learning/LessonRenderer";
import { isBoardSource, isCanvasSource } from "@/components/learning/blocks/VisualizerBlock";
import { LessonSideContext } from "@/components/learning/LessonContext";
import { GeoGebraProvider } from "@/components/learning/GeoGebraProvider";
import { LessonVideo, SupplementaryResources } from "@/components/learning/SupplementaryResources";
import { getGeoGebraEmbedConfig } from "@/lib/content/resourcePresentation";
import { EducationalText } from "@/components/learning/EducationalText";
import type { LearningResource } from "@/lib/content/types/resource";
import type { ContentBlock, Lesson } from "@/lib/content/types/lesson";
import type { Asset } from "@/lib/content/types/asset";
import type { Question } from "@/lib/content/types/question";

type LessonExperienceProps = {
  lesson: Lesson;
  steps?: Array<{ step: number; title: string }>;
  courseId: string;
  preview: boolean;
  testingMode?: boolean;
  week?: string;
  supplementaryResources: LearningResource[];
  assetsById?: Record<string, Asset>;
  questionsById?: Record<string, Question>;
  /** A visitor without an account is reading this topic's free first lesson. */
  freePreview?: boolean;
};

type StepResponse = {
  blocks: ContentBlock[];
  assetsById: Record<string, Asset>;
  questionsById: Record<string, Question>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseStepResponse(value: unknown): StepResponse {
  if (!isRecord(value) || !Array.isArray(value.blocks) || !isRecord(value.assetsById) || !isRecord(value.questionsById)) {
    throw new Error("The lesson step response was invalid.");
  }
  if (!value.blocks.every((block) => isRecord(block) && typeof block.id === "string" && typeof block.type === "string")) {
    throw new Error("The lesson step content was invalid.");
  }
  return {
    blocks: value.blocks as ContentBlock[],
    assetsById: value.assetsById as Record<string, Asset>,
    questionsById: value.questionsById as Record<string, Question>,
  };
}

function formatSectionLabel(chapterId: string) {
  return chapterId
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

type LessonTheme = "paper" | "dark" | "blue" | "wine" | "purple" | "green";

const THEME_BACKGROUNDS: Record<LessonTheme, { backgroundColor: string; backgroundImage: string; backgroundSize: string }> = {
  paper: {
    backgroundColor: "#FBF6E9",
    backgroundImage: "radial-gradient(rgba(26,24,20,0.16) 1px, transparent 1.5px)",
    backgroundSize: "22px 22px",
  },
  dark: {
    backgroundColor: "#1A1814",
    backgroundImage: "radial-gradient(rgba(255,255,255,0.14) 1px, transparent 1.5px)",
    backgroundSize: "22px 22px",
  },
  blue: {
    backgroundColor: "#14305C",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)",
    backgroundSize: "28px 28px",
  },
  purple: {
    backgroundColor: "#2A1A5E",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)",
    backgroundSize: "32px 32px",
  },
  green: {
    backgroundColor: "#0F3D2E",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)",
    backgroundSize: "32px 32px",
  },
  wine: {
    backgroundColor: "#3B1019",
    backgroundImage:
      "linear-gradient(rgba(255,255,255,.045) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.045) 1px,transparent 1px),radial-gradient(80% 70% at 50% 0%,#52182A 0%,rgba(59,16,25,0) 70%)",
    backgroundSize: "32px 32px,32px 32px,100% 100%",
  },
};

// Videos and questions sit on the wine print, visualizers on the blue grid,
// everything else on the dotted paper (which can switch to dark mode).
// The blue-print look for visualizers is switched on week by week as lessons are redone.
const BLUEPRINT_WEEKS = ["math151-week-1", "math151-week-2", "math151-week-3"];

function themeForStep(blocks: ContentBlock[], dark: boolean, blueprint: boolean): LessonTheme {
  const quiz = blocks.find((block) => block.type === "quiz");
  if (quiz && quiz.type === "quiz") return quiz.variant === "end" ? "green" : "purple";
  if (blocks.some((block) => block.type === "question")) return "purple";
  if (blocks.some((block) => block.type === "video")) return "wine";
  // A visualizer only colours the page when it has the page to itself (see visualizerBackground).
  // Next to other blocks it keeps its own colours inside its frame, on the normal lesson page.
  const onlyVisualizers = blocks.length > 0 && blocks.every((block) => block.type === "visualizer");
  if (onlyVisualizers && blocks.some((block) => block.type === "visualizer" && !isCanvasSource(block.source) && (block.source.includes("data-b2b-check") || blueprint || block.fit || !isBoardSource(block.source)))) return "blue";
  return dark ? "dark" : "paper";
}

/** The background colour a visualizer paints itself with, read from its source. */
function visualizerColor(source: string): string | null {
  const patterns = [
    /--board\s*:\s*(#[0-9a-f]{3,8})\b/i,
    /#[\w-]+\s*\{[^}]*?\bbackground(?:-color)?\s*:\s*(#[0-9a-f]{3,8})\b/i,
    /\bbackground(?:-color)?\s*:\s*(#[0-9a-f]{3,8})\b/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function isLightColor(colour: string) {
  let channels: number[];
  const rgb = colour.match(/rgba?\(([^)]+)\)/);
  if (rgb) channels = rgb[1].split(",").slice(0, 3).map((part) => Number(part.trim()) / 255);
  else {
    const full = colour.length === 4 ? `#${colour[1]}${colour[1]}${colour[2]}${colour[2]}${colour[3]}${colour[3]}` : colour.slice(0, 7);
    channels = [1, 3, 5].map((at) => parseInt(full.slice(at, at + 2), 16) / 255);
  }
  const [r, g, b] = channels;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

function plainHeading(text: string) {
  return text.replace(/\$+/g, "").replace(/[*_`#]/g, "").trim();
}

export function LessonExperience({
  lesson,
  steps: providedSteps,
  courseId,
  preview,
  testingMode = false,
  week,
  supplementaryResources,
  assetsById,
  questionsById,
  freePreview = false,
}: LessonExperienceProps) {
  // If steps are not provided (e.g. anonymous free preview with full lesson blocks), compute from lesson.blocks
  const fallbackSteps = useMemo(() => {
    const unique = Array.from(new Set(lesson.blocks.map((block) => block.step ?? 1))).sort((a, b) => a - b);
    return unique.map((step, index) => {
      const heading = lesson.blocks.find((block) => (block.step ?? 1) === step && block.type === "heading");
      const title = heading && heading.type === "heading" ? plainHeading(heading.text) : `Step ${index + 1}`;
      return { step, title };
    });
  }, [lesson.blocks]);

  const effectiveSteps = providedSteps ?? (fallbackSteps.length > 0 ? fallbackSteps : [{ step: 1, title: "Step 1" }]);
  const initialStepNumber = effectiveSteps[0]?.step ?? 1;

  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);

  // Initial step cache
  const [blocksByStep, setBlocksByStep] = useState<Record<number, ContentBlock[]>>(() => {
    if (providedSteps) {
      return { [initialStepNumber]: lesson.blocks };
    }
    // Anonymous free preview: all steps are present in lesson.blocks
    const byStep: Record<number, ContentBlock[]> = {};
    for (const block of lesson.blocks) {
      const s = block.step ?? 1;
      byStep[s] = byStep[s] ?? [];
      byStep[s].push(block);
    }
    return byStep;
  });

  const blocksByStepRef = useRef<Map<number, ContentBlock[]>>(
    new Map(
      providedSteps
        ? [[initialStepNumber, lesson.blocks]]
        : Object.entries(blocksByStep).map(([s, blocks]) => [Number(s), blocks]),
    ),
  );

  const pendingStepRequests = useRef(new Map<number, Promise<StepResponse>>());
  const [stepAssetsById, setStepAssetsById] = useState(assetsById ?? {});
  const [stepQuestionsById, setStepQuestionsById] = useState(questionsById ?? {});
  const [loadingStep, setLoadingStep] = useState<number | null>(null);
  const [failedStepIndex, setFailedStepIndex] = useState<number | null>(null);
  const [stepLoadError, setStepLoadError] = useState<string | null>(null);

  const [boardFullscreen, setBoardFullscreen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem("b2b-lesson-dark") === "1") setDarkMode(true);
    } catch {
      /* storage unavailable: stay on the light page */
    }
  }, []);

  const toggleDarkMode = () => {
    setDarkMode((value) => {
      const next = !value;
      try {
        window.localStorage.setItem("b2b-lesson-dark", next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => { window.performance.mark("b2b-lesson-hydrated"); }, []);

  const geoResource = useMemo(
    () => supplementaryResources.find((resource) => resource.type === "geogebra"),
    [supplementaryResources],
  );

  useEffect(() => {
    if (!preview && !testingMode && !freePreview) {
      startDay(lesson.courseId, lesson.weekId, lesson.id);
    }
  }, [lesson, preview, testingMode, freePreview]);

  const uniqueSteps = useMemo(() => effectiveSteps.map(({ step }) => step), [effectiveSteps]);
  const totalSteps = effectiveSteps.length;
  const isComplete = currentStep >= totalSteps - 1;
  const activeStep = uniqueSteps[currentStep] ?? initialStepNumber;
  const roadmapHref = week ? `/courses/${courseId}/roadmap/week/${week}` : `/courses/${courseId}/roadmap`;
  const weekLabel = week ? `Week ${week.replace("w", "")}` : "Week";
  const sectionLabel = formatSectionLabel(lesson.chapterId);

  const activeBlocks = useMemo(
    () => blocksByStep[activeStep] ?? [],
    [blocksByStep, activeStep],
  );
  const activeLesson = useMemo(() => ({ ...lesson, blocks: activeBlocks }), [lesson, activeBlocks]);

  const blueprint = BLUEPRINT_WEEKS.includes(lesson.weekId);
  const baseTheme = themeForStep(activeBlocks, darkMode, blueprint);
  // A visualizer with a page to itself: the whole page takes the visualizer's own background colour.
  const pageVisualizer = activeBlocks.length > 0 && activeBlocks.every((block) => block.type === "visualizer") ? activeBlocks[0] : null;
  // The visualizer reports its colour as it changes (a board turns green for an analogy, purple to check);
  // until it does, the colour is read from its source.
  const [liveColor, setLiveColor] = useState<{ step: number; color: string } | null>(null);
  useEffect(() => {
    const onColor = (event: Event) => {
      const color = (event as CustomEvent<string>).detail;
      if (typeof color === "string") setLiveColor({ step: activeStep, color });
    };
    window.addEventListener("b2b-visualizer-color", onColor);
    return () => window.removeEventListener("b2b-visualizer-color", onColor);
  }, [activeStep]);
  const pageColor =
    baseTheme === "blue" && pageVisualizer && pageVisualizer.type === "visualizer"
      ? (liveColor?.step === activeStep ? liveColor.color : null) ?? visualizerColor(pageVisualizer.source)
      : null;
  const theme: LessonTheme = pageColor && isLightColor(pageColor) ? "paper" : baseTheme;
  const pageBackground = pageColor ? { ...THEME_BACKGROUNDS[theme], backgroundColor: pageColor, transition: "background-color 0.6s ease" } : THEME_BACKGROUNDS[theme];
  const stepTitles = useMemo(
    () => effectiveSteps.map(({ title }, index) => plainHeading(title) || `Step ${index + 1}`),
    [effectiveSteps],
  );

  const navigateToStep = useCallback(async (index: number) => {
    if (index < 0 || index >= effectiveSteps.length || loadingStep !== null) return;
    const stepNumber = effectiveSteps[index].step;
    setStepLoadError(null);
    setFailedStepIndex(null);

    if (!blocksByStepRef.current.has(stepNumber)) {
      setLoadingStep(stepNumber);
      try {
        let pending = pendingStepRequests.current.get(stepNumber);
        if (!pending) {
          if (typeof window !== "undefined" && window.performance) {
            window.performance.mark(`b2b-lesson-step-${stepNumber}-request-start`);
          }
          pending = (async () => {
            const response = await fetch(
              `/api/lesson-steps/${encodeURIComponent(lesson.courseId)}/${encodeURIComponent(lesson.weekId)}/${encodeURIComponent(lesson.id)}/${stepNumber}${preview ? "?preview=1" : ""}`,
              { cache: "no-store" },
            );
            const responseText = await response.text();
            let payload: unknown;
            try {
              payload = JSON.parse(responseText);
            } catch {
              payload = undefined;
            }
            if (!response.ok) {
              const message = isRecord(payload) && typeof payload.error === "string" ? payload.error : "Unable to load this lesson step.";
              throw new Error(message);
            }
            return parseStepResponse(payload);
          })();
          pendingStepRequests.current.set(stepNumber, pending);
        }

        const loaded = await pending;
        if (typeof window !== "undefined" && window.performance) {
          window.performance.mark(`b2b-lesson-step-${stepNumber}-content-ready`);
        }
        blocksByStepRef.current.set(stepNumber, loaded.blocks);
        setBlocksByStep((existing) => ({ ...existing, [stepNumber]: loaded.blocks }));
        setStepAssetsById((existing) => ({ ...existing, ...loaded.assetsById }));
        setStepQuestionsById((existing) => ({ ...existing, ...loaded.questionsById }));
      } catch (error) {
        setStepLoadError(error instanceof Error ? error.message : "Unable to load this lesson step.");
        setFailedStepIndex(index);
        return;
      } finally {
        pendingStepRequests.current.delete(stepNumber);
        setLoadingStep(null);
      }
    }

    setCurrentStep(index);
  }, [effectiveSteps, lesson.courseId, lesson.id, lesson.weekId, loadingStep, preview]);

  const hasBlocks = activeBlocks.length > 0;
  const hasTextContent = activeBlocks.some((block) => !["image", "video", "interactive"].includes(block.type));
  const hasGeoSide = Boolean(geoResource) && (!hasBlocks || hasTextContent);
  const isFullWidthInteractive = hasGeoSide && !hasBlocks;

  // Split layout: blocks marked pane "side" (and quiz feedback) fill the right-hand card.
  const hasSideBlocks = activeBlocks.some((block) => block.pane === "side");
  const hasQuiz = activeBlocks.some((block) => block.type === "quiz");
  const hasSidePane = !hasGeoSide && (hasSideBlocks || hasQuiz);
  const hasVisualizerFit = activeBlocks.some((block) => block.type === "visualizer" && !isCanvasSource(block.source) && (blueprint || block.fit));
  // A page that is only a visualizer runs edge to edge, with no padding or card around it.
  const visualizerPage = hasVisualizerFit && !hasSidePane && activeBlocks.every((block) => block.type === "visualizer");
  // A visualizer in the right-hand card: the text column keeps most of the width.
  const hasSideVisualizer = activeBlocks.some((block) => block.type === "visualizer" && block.pane === "side");

  const [sideSlot, setSideSlot] = useState<HTMLElement | null>(null);
  const [quizDone, setQuizDone] = useState<Record<string, boolean>>({});
  const reportQuiz = useCallback((blockId: string, done: boolean) => {
    setQuizDone((prev) => (prev[blockId] === done ? prev : { ...prev, [blockId]: done }));
  }, []);
  const quizIds = activeBlocks.filter((block) => block.type === "quiz").map((block) => block.id);
  const quizPending = !preview && quizIds.some((id) => !quizDone[id]);

  const [stepsOpen, setStepsOpen] = useState(false);
  const [maxStep, setMaxStep] = useState(0);
  useEffect(() => {
    setMaxStep((value) => Math.max(value, currentStep));
    setStepsOpen(false);
  }, [currentStep]);

  const sideContextValue = useMemo(() => ({ sideSlot, reportQuiz }), [sideSlot, reportQuiz]);

  const renderNavigation = () => (
    <nav
      aria-label="Lesson steps"
      className="lesson-nav flex min-h-14 flex-shrink-0 items-center justify-between gap-3 px-3 py-3 md:px-6"
    >
      <button
        type="button"
        onClick={() => void navigateToStep(Math.max(0, currentStep - 1))}
        disabled={currentStep === 0 || loadingStep !== null}
        className="lesson-nav-prev flex min-h-12 items-center gap-1.5 rounded-xl border px-4 font-sans text-sm font-semibold transition-colors disabled:opacity-35"
      >
        <ChevronLeft size={16} /> Previous
      </button>
      {!isComplete ? (
        <button
          type="button"
          disabled={quizPending || loadingStep !== null}
          onClick={() => void navigateToStep(Math.min(totalSteps - 1, currentStep + 1))}
          className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#E9BC3A] px-7 font-sans text-sm font-bold text-[#1A1814] transition-colors hover:bg-[#F0BC21] disabled:opacity-40 md:max-w-[220px] md:flex-none"
        >
          {quizPending ? "Finish the questions" : "Continue"} <span aria-hidden>›</span>
        </button>
      ) : quizPending ? (
        <span className="flex min-h-11 items-center rounded-full bg-white/20 px-6 font-sans text-sm font-semibold opacity-70">
          Finish the test to complete
        </span>
      ) : (
        <Link
          href={roadmapHref}
          onClick={() => {
            if (!preview && !testingMode && !freePreview) {
              completeDay(lesson.courseId, lesson.weekId, lesson.id);
            }
          }}
        >
          <span className="flex min-h-11 items-center gap-2 rounded-full bg-[#059669] px-6 font-sans text-sm font-semibold text-white transition-opacity hover:opacity-90">
            Complete Day <CheckCircle2 size={16} />
          </span>
        </Link>
      )}
    </nav>
  );

  const stepsButton = totalSteps > 1 ? (
    <div className="relative">
      <button
        type="button"
        onClick={() => setStepsOpen((open) => !open)}
        aria-expanded={stepsOpen}
        className="lesson-steps-btn flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-3 font-sans text-xs font-semibold transition-colors"
      >
        <ListOrdered size={13} />
        Steps {currentStep + 1} of {totalSteps}
      </button>
      {stepsOpen ? (
        <div role="dialog" aria-label="Lesson steps" className="lesson-steps-pop absolute right-0 top-9 z-50 w-[300px] max-w-[85vw] rounded-2xl border p-2 shadow-xl">
          <div className="flex items-center justify-between px-3 pb-1 pt-1">
            <p className="font-sans text-sm font-semibold">In this lesson</p>
            <button type="button" aria-label="Close steps" onClick={() => setStepsOpen(false)}><X size={14} /></button>
          </div>
          <ol className="flex flex-col gap-1">
            {uniqueSteps.map((step, index) => (
              <li key={step}>
                <button
                  type="button"
                  disabled={index > maxStep || loadingStep !== null}
                  onClick={() => void navigateToStep(index)}
                  aria-current={index === currentStep ? "step" : undefined}
                  className="lesson-steps-item flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left font-sans text-[14px] disabled:opacity-45"
                >
                  <span className="lesson-steps-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold">{index + 1}</span>
                  <span className="min-w-0">{stepTitles[index]}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </div>
  ) : null;

  return (
    <LessonSideContext.Provider value={sideContextValue}>
    <div
      className={`flex flex-col ${preview ? "h-[calc(100dvh-76px)] md:h-[calc(100dvh-48px)]" : "h-[calc(100dvh-28px)] md:h-screen"}`}
      style={{
        background: "#FBFAF5",
        // Lessons keep their own type: Inter for UI text, Newsreader for reading.
        ["--font-sans" as string]: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
        fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <header className="z-20 flex h-9 flex-shrink-0 items-center border-b border-[#E3DED3] bg-white px-3 md:h-12 md:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={roadmapHref}
            aria-label="Back to course roadmap"
            className="flex h-8 w-8 shrink-0 items-center text-[#333333] transition-colors hover:text-[#111111]"
          >
            <ChevronLeft size={18} />
          </Link>
          <span className="shrink-0 font-sans text-xs font-semibold text-[#4A463F]">
            {weekLabel}
          </span>
          <span className="shrink-0 text-[#B6B0A4]">/</span>
          <span className="truncate font-sans text-xs font-semibold text-[#25231F]">
            <EducationalText text={sectionLabel} />
          </span>
        </div>
        <button
          type="button"
          onClick={toggleDarkMode}
          aria-pressed={darkMode}
          className="ml-auto mr-2 flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-[#D9D4C7] px-3 font-sans text-xs font-semibold text-[#25231F] transition-colors hover:border-[#111111]"
        >
          {darkMode ? <Sun size={13} /> : <Moon size={13} />}
          <span className="hidden sm:inline">{darkMode ? "Light mode" : "Dark mode"}</span>
        </button>
        <div
          data-testid="lesson-step-indicator"
          data-current-step={currentStep}
          aria-label={`Step ${currentStep + 1} of ${totalSteps}`}
          className="mr-3 hidden shrink-0 items-center gap-1.5 sm:flex"
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
        {!preview ? (
          <div className="mr-2 shrink-0">
            <FlagButton
              compact
              target={{
                type: "lesson",
                key: `lesson:${lesson.id}:${activeStep}`,
                title: stepTitles[currentStep] ?? `Step ${currentStep + 1}`,
                location: `${courseCodeLabel(courseId)} · ${weekLabel} · ${plainHeading(lesson.title) || "Lesson"} · Step ${currentStep + 1} of ${totalSteps}`,
                link: `/admin/lessons/${lesson.id}`,
                courseId,
              }}
            />
          </div>
        ) : null}
        <div className="lesson-steps-host text-[#25231F]">{stepsButton}</div>
      </header>

      {freePreview ? (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-x-4 gap-y-2 bg-[#1A1814] px-4 py-2.5 font-sans text-[13px] text-[#F6EFDC] md:px-6">
          <span className="min-w-0 flex-1">
            <span className="font-bold text-[#E9BC3A]">Open lesson.</span> You can view this lesson without signing up. To access the rest of the lessons, sign up for free.
          </span>
          <Link
            href={`/courses?auth=required&next=${encodeURIComponent(`/courses/${courseId}/chapter/${lesson.chapterId}/lesson/${lesson.id}${week ? `?week=${week}` : ""}`)}`}
            className="inline-flex min-h-[36px] shrink-0 items-center rounded-full bg-[#E9BC3A] px-4 text-[13px] font-bold text-[#1A1814] transition hover:bg-[#F2CC5C]"
          >
            Sign up free
          </Link>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isFullWidthInteractive ? (
          <section
            aria-label={`Lesson step ${currentStep + 1}`}
            data-lesson-theme={theme}
            className={`lesson-themed ${blueprint ? "lesson-blueprint" : ""} relative ${boardFullscreen ? "z-[60]" : "z-10"} flex min-h-0 flex-col ${hasGeoSide ? "w-full lg:w-[45%]" : "w-full"}`}
            style={pageBackground}
          >
            <div
              aria-label={`Lesson progress: step ${currentStep + 1} of ${totalSteps}`}
              className="lesson-step-progress flex w-full flex-shrink-0 gap-1.5 px-4 pt-3 md:px-10 lg:px-14"
            >
              {uniqueSteps.map((step, index) => (
                <span
                  key={step}
                  aria-hidden
                  className={`h-[3px] flex-1 rounded-full ${index <= currentStep ? "bg-[#E9BC3A]" : "bg-[#D9D6CF]"}`}
                />
              ))}
            </div>
            <div className={`flex min-h-0 flex-1 flex-col ${visualizerPage ? "gap-0 overflow-hidden p-0" : "gap-4 overflow-y-auto overscroll-contain touch-pan-y px-4 pb-20 pt-4 md:px-10 md:py-8 lg:flex-row lg:gap-8 lg:overflow-hidden lg:px-14 lg:py-8"}`}>
              <div
                className={`min-w-0 shrink-0 lg:min-h-0 lg:shrink lg:overflow-y-auto lg:overscroll-contain ${
                  hasSidePane ? (hasSideVisualizer ? "lg:flex-[5]" : hasVisualizerFit ? "lg:flex-[3]" : "lg:flex-[11]") : "flex-1"
                }`}
              >
                <div className={`lesson-guided-content mr-auto ${hasVisualizerFit || hasSideVisualizer || blueprint ? "max-w-none w-full" : "max-w-[680px]"}`}>
                  {loadingStep !== null ? (
                    <p role="status" className="mb-4 rounded-xl border border-[#D9D4C7] bg-white/80 px-4 py-3 text-sm">
                      Loading step {effectiveSteps.findIndex(({ step }) => step === loadingStep) + 1}…
                    </p>
                  ) : null}
                  {stepLoadError ? (
                    <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#B45309]/30 bg-white px-4 py-3 text-sm">
                      <span>{stepLoadError}</span>
                      {failedStepIndex !== null ? (
                        <button
                          type="button"
                          onClick={() => void navigateToStep(failedStepIndex)}
                          className="rounded-full border border-[#B45309]/40 px-4 py-2 font-semibold"
                        >
                          Retry
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <LessonRenderer
                    lesson={activeLesson}
                    step={activeStep}
                    pane={hasSidePane ? "main" : undefined}
                    hideProgress
                    blueprint={blueprint}
                    assetsById={stepAssetsById}
                    questionsById={stepQuestionsById}
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
              {hasSidePane ? (
                <aside
                  aria-label="Notes"
                  className={`lesson-side-card lesson-guided-content min-w-0 shrink-0 rounded-2xl border p-5 lg:min-h-0 lg:shrink lg:overflow-y-auto lg:overscroll-contain ${
                    hasSideVisualizer ? "lg:flex-[3]" : hasVisualizerFit ? "lg:flex-[2]" : "lg:flex-[9]"
                  }`}
                >
                  <div ref={setSideSlot} className="flex flex-col gap-3" />
                  <LessonRenderer
                    lesson={activeLesson}
                    step={activeStep}
                    pane="side"
                    hideProgress
                    blueprint={blueprint}
                    assetsById={stepAssetsById}
                    questionsById={stepQuestionsById}
                    deferGeoGebra
                  />
                </aside>
              ) : null}
            </div>
            {renderNavigation()}
          </section>
        ) : null}

        {hasGeoSide ? (
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

    </div>
    </LessonSideContext.Provider>
  );
}
