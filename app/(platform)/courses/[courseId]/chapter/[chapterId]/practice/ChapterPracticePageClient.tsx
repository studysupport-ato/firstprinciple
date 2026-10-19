"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronLeft, CloudCheck, Lightbulb, Lock, Play, RotateCcw, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import { EducationalText } from "@/components/learning/EducationalText";
import type { Difficulty, Question } from "@/lib/content/types/question";
import { createPracticeSession, evaluateQuestionAnswer, getPracticeSummary, type PracticeSession, type PracticeValue } from "@/lib/practice/session";
import { listMyPracticeAttempts, recordPracticeAttempt, recordPracticeStarted } from "@/lib/progress";
import { getVideoSolution, type VideoSolution } from "@/lib/questions/videoSolutions";
import { buildYouTubeEmbedUrl, buildYouTubeWatchUrl } from "@/lib/youtube";
import { FlagButton } from "@/components/flags/FlagButton";
import { courseCodeLabel } from "@/lib/flags/shared";

/** A short plain-text title for a flagged question (maths and markup stripped). */
function questionFlagTitle(prompt: string) {
  const plain = (prompt ?? "").replace(/\$([^$]*)\$/g, (_, maths: string) => maths.replace(/\\[a-zA-Z]+/g, " ").replace(/[{}^_]/g, "")).replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
  return plain.length > 110 ? `${plain.slice(0, 107)}…` : plain || "Question";
}

/** " · from KNUST EE 151 exam, December 2006" when the explanation names its source. */
function questionSourceLabel(explanation?: string) {
  const match = /Source:\s*([^\n]+?)\.?\s*$/.exec(explanation ?? "");
  return match ? ` · from ${match[1].slice(0, 80)}` : "";
}

/**
 * "Watch the solution": the worked video for a question that has one. It
 * stays locked until the student checks an answer (or chooses to watch
 * anyway), then embeds the YouTube video and credits the channel and the
 * textbook the problem comes from.
 */
function VideoSolutionPanel({ solution, submitted }: { solution: VideoSolution; submitted: boolean }) {
  const [revealed, setRevealed] = useState(false);
  const unlocked = submitted || revealed;
  const { video } = solution;
  const embed = `${buildYouTubeEmbedUrl(video.youtubeId)}${video.start ? `&start=${video.start}` : ""}`;
  const watch = `${buildYouTubeWatchUrl(video.youtubeId)}${video.start ? `&t=${video.start}s` : ""}`;
  const meta = [video.channel, video.minutes ? `${video.minutes} min` : null, video.part].filter(Boolean).join(" · ");

  return (
    <section aria-label="Video solution" className="space-y-4 rounded-[24px] bg-[#1A1814] p-5 text-[#F6EFDC] md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-[#E9BC3A]">Watch the solution</p>
          <h2 className="font-sans text-[17px] font-semibold leading-snug text-[#F6EFDC]">{video.title}</h2>
          <p className="font-sans text-[13px] text-[#D9D1BC]">{meta}</p>
        </div>
        {!unlocked ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex min-h-[44px] items-center rounded-full border border-[#E9BC3A] px-4 font-sans text-[14px] font-semibold text-[#E9BC3A] hover:bg-[#2C2820]"
          >
            Show me anyway
          </button>
        ) : null}
      </div>
      {unlocked ? (
        <div className="aspect-video overflow-hidden rounded-2xl bg-black">
          <iframe
            src={embed}
            title={`Video solution: ${video.title}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      ) : (
        <div className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl bg-[#2C2820] px-6 text-center">
          <Lock size={28} className="text-[#E9BC3A]" aria-hidden />
          <p className="font-sans text-[17px] font-semibold">Have a go first</p>
          <p className="max-w-sm font-sans text-[14px] text-[#D9D1BC]">The video unlocks when you check your answer. You can also watch it now.</p>
        </div>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3 border-t border-[#3A352C] pt-4">
        <p className="max-w-xl font-sans text-[12px] leading-relaxed text-[#D9D1BC]">
          Problem from {solution.source}. Video by {video.channel} on YouTube. Figure redrawn for Back2Basics.
        </p>
        <a
          href={watch}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 font-sans text-[13px] font-semibold text-[#E9BC3A] hover:underline"
        >
          <Play size={14} aria-hidden /> Open on YouTube <ArrowUpRight size={14} aria-hidden />
        </a>
      </div>
    </section>
  );
}

function QuestionRenderer({
  question,
  selectedValue,
  onSelect,
  submitted,
  showHint,
  onToggleHint,
  number,
  total,
}: {
  number: number;
  total: number;
  question: Question;
  selectedValue: PracticeValue;
  onSelect: (value: PracticeValue) => void;
  submitted: boolean;
  showHint: boolean;
  onToggleHint: () => void;
}) {
  const optionMap = question.options ?? [];
  // A prompt written as several paragraphs carries a reading passage or
  // instruction first; only its last paragraph is the question itself.
  const promptParagraphs = question.prompt.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const leading = promptParagraphs.slice(0, -1);
  // A short lead-in ("Choose the pattern of the given sentence.") is an
  // instruction shown inside the question card; anything longer is a reading
  // passage shown in its own box above it.
  const isInstruction = leading.length > 0 && leading.join(" ").length <= 220;
  const promptParts = {
    passage: isInstruction ? [] : leading,
    instruction: isInstruction ? leading.join(" ") : "",
    question: promptParagraphs[promptParagraphs.length - 1] ?? question.prompt,
  };
  const correctOption = question.type === "multiple-choice" ? optionMap.find((option) => option.id === question.correctAnswer) : undefined;
  // Skip explanations that only repeat the answer letter or are the import
  // placeholder; the correct answer line above already covers them.
  const explanationText = trimAnswerEcho(question.explanation?.trim() ?? "", correctOption);
  const solution = getVideoSolution(question.tags);
  // A redrawn diagram attached with "**Figure:**" (no video solution).
  const figureKey = question.tags?.find((tag) => tag.startsWith("figure:"))?.slice("figure:".length);
  const figure = solution
    ? { src: solution.figure, alt: solution.figureAlt }
    : figureKey
      ? { src: `/questions/${figureKey}.svg`, alt: "Diagram for this question" }
      : null;
  const hasExplanation =
    Boolean(explanationText) &&
    !/^no explanation was included/i.test(explanationText) &&
    !(correctOption && /^[a-z]\.?$/i.test(explanationText));

  return (
    <div className="space-y-8">
      <section aria-label={`Question ${number} of ${total}`} className="space-y-4">
        {promptParts.passage.length ? (
          <div className="max-h-[420px] space-y-3 overflow-y-auto rounded-xl border border-[#E8E2D2] bg-[#FBF8EF] p-4 font-sans text-[15px] leading-relaxed text-[#26231C]">
            {promptParts.passage.map((paragraph, index) => (
              <p key={index} className="whitespace-pre-line">
                <EducationalText text={paragraph} />
              </p>
            ))}
          </div>
        ) : null}
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#1A1814] px-3 py-1 font-sans text-[11px] font-bold uppercase tracking-[0.14em] text-[#F6EFDC]">
              Question {number}
            </span>
            <span className="whitespace-nowrap font-sans text-[12px] font-medium text-[#666666]">of {total}</span>
            <span className="ml-auto flex items-center gap-2">
              {solution ? (
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#1A1814] px-3 py-1 font-sans text-[11px] font-semibold text-[#F6EFDC]">
                  <Play size={12} className="text-[#E9BC3A]" aria-hidden /> Video solution
                </span>
              ) : null}
              <FlagButton
                compact
                label="Flag question"
                target={{
                  type: "question",
                  key: `question:${question.id}`,
                  title: questionFlagTitle(question.prompt),
                  location: [courseCodeLabel(question.courseId), question.topic, question.subtopic].filter(Boolean).join(" · ") + questionSourceLabel(question.explanation),
                  link: `/admin/questions/${question.id}`,
                  courseId: question.courseId,
                }}
              />
            </span>
          </div>
          {promptParts.instruction ? (
            <p className="mt-3 font-sans text-sm leading-relaxed text-[#555555]">
              <EducationalText text={promptParts.instruction} />
            </p>
          ) : null}
          <p className="mt-2 whitespace-pre-line font-sans text-[17px] font-normal leading-relaxed text-[#111111] md:text-[18px]">
            <EducationalText text={promptParts.question} />
          </p>
          {figure ? (
            <figure className="mt-4 rounded-xl border border-[#E5E5E5] bg-white p-3">
              <a href={figure.src} target="_blank" rel="noreferrer" title="Open the figure full size">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={figure.src} alt={figure.alt} className="mx-auto h-auto w-full max-w-[560px]" />
              </a>
              <figcaption className="mt-1 text-center font-sans text-[11px] text-[#888888] md:hidden">Tap the figure to enlarge it</figcaption>
            </figure>
          ) : null}
        </div>
      </section>

      {question.type === "multiple-choice" && optionMap.length > 0 ? (
        <div className="space-y-3">
          {optionMap.map((option) => {
            const isSelected = selectedValue === option.id;
            const isCorrect = option.id === question.correctAnswer;
            let stateClass = "border-[#E5E5E5] bg-white hover:border-[#111111]";

            if (submitted) {
              if (isCorrect) stateClass = "border-[#059669] bg-[#ECFDF5]";
              else if (isSelected) stateClass = "border-[#E11D48] bg-[#FEF2F2]";
              else stateClass = "border-[#E5E5E5] bg-white opacity-50";
            } else if (isSelected) {
              stateClass = "border-[#2563EB] bg-[#EFF6FF] ring-1 ring-[#2563EB]";
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={submitted}
                className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all ${stateClass}`}
              >
                <span className="font-sans text-base text-[#111111]">
                  <span className="mr-3 font-semibold text-[#666666]">{option.label}</span>
                  <EducationalText text={option.text} />
                </span>
                {submitted && isCorrect && <CheckCircle2 className="text-[#059669]" size={20} />}
                {submitted && isSelected && !isCorrect && <XCircle className="text-[#E11D48]" size={20} />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white px-5 py-4">
          <label className="mb-2 block font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">Your answer</label>
          <div className="flex items-center gap-3">
            <input
              type={question.type === "numerical" ? "number" : "text"}
              step={question.type === "numerical" ? "any" : undefined}
              value={selectedValue === null || selectedValue === undefined ? "" : String(selectedValue)}
              onChange={(event) =>
                onSelect(
                  question.type === "numerical"
                    ? event.target.value === ""
                      ? null
                      : Number(event.target.value)
                    : event.target.value,
                )
              }
              disabled={submitted}
              placeholder={question.type === "numerical" ? "Enter a number" : "Type your answer"}
              className="w-full min-w-0 rounded-xl border border-[#E5E5E5] bg-transparent px-4 py-3 font-sans text-base text-[#111111] outline-none transition focus:border-[#2563EB]"
            />
            {question.type === "numerical" && solution?.unit ? (
              <span className="shrink-0 font-sans text-base font-semibold text-[#555555]">{solution.unit}</span>
            ) : null}
          </div>
        </div>
      )}

      {question.hint && (
        <div className="rounded-2xl border border-[#E5E5E5] bg-white p-4">
          <button
            type="button"
            onClick={onToggleHint}
            className="flex items-center gap-2 font-sans text-xs font-bold uppercase tracking-[0.2em] text-[#666666]"
          >
            <Lightbulb size={14} />
            {showHint ? "Hide hint" : "Show hint"}
          </button>
          {showHint ? (
            <p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]">
              <EducationalText text={question.hint} />
            </p>
          ) : null}
        </div>
      )}

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-transparent p-5"
        >
          <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">
            {evaluateQuestionAnswer(question, selectedValue) ? <Check size={14} className="text-[#059669]" /> : <XCircle size={14} className="text-[#E11D48]" />}
            {evaluateQuestionAnswer(question, selectedValue) ? "Correct" : question.type === "short-answer" ? "Compare with the model answer" : "Not quite"}
          </div>
          {correctOption ? (
            <p className="mt-3 font-sans text-sm font-semibold text-[#111111]">
              Correct answer: {correctOption.label}. <EducationalText text={correctOption.text} />
            </p>
          ) : null}
          {question.type === "numerical" ? (
            <p className="mt-3 font-sans text-sm font-semibold text-[#111111]">
              Correct answer: {String(question.correctAnswer)}
              {solution?.unit ? ` ${solution.unit}` : ""}
            </p>
          ) : null}
          {hasExplanation ? (
            <p className="mt-2 whitespace-pre-line font-sans text-sm leading-relaxed text-[#111111]">
              <EducationalText text={explanationText} />
            </p>
          ) : null}
        </motion.div>
      ) : null}

      {solution ? <VideoSolutionPanel key={question.id} solution={solution} submitted={submitted} /> : null}
    </div>
  );
}

export function ChapterPracticePageClient({
  initialQuestions,
  courseId,
  chapterId,
  preview,
  topic,
  subtopic,
  difficulty,
  limit,
  returnHref,
  returnLabel,
  title,
}: {
  initialQuestions: Question[];
  courseId: string;
  chapterId: string;
  preview: boolean;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
  limit: number;
  /** Where the back links go; defaults to the chapter page. */
  returnHref?: string;
  returnLabel?: string;
  /** Header label; defaults to the chapter name. */
  title?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [selectedValue, setSelectedValue] = useState<PracticeValue>(null);
  const [showHint, setShowHint] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Saved progress: answers already recorded for this set (from practice
  // attempts) are restored so the student continues where they stopped.
  const [restoredCount, setRestoredCount] = useState(0);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const resetKey = `b2b-practice-reset:${courseId}:${chapterId}:${topic ?? ""}:${subtopic ?? ""}:${difficulty ?? ""}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const selected = initialQuestions.filter((question) => {
      if (courseId && question.courseId !== courseId) return false;
      if (chapterId && question.chapterId !== chapterId) return false;
      if (topic && question.topic !== topic) return false;
      if (subtopic && question.subtopic !== subtopic) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      return true;
    }).slice(0, limit);

    setQuestions(selected);

    if (!selected.length) {
      setSession(null);
      setSessionComplete(false);
      return;
    }

    const nextSession = createPracticeSession(selected.map((question) => question.id));
    setSession(nextSession);
    setSelectedValue(null);
    setSubmitted(false);
    setShowHint(false);
    setSessionComplete(false);
    setRestoredCount(0);
    void recordPracticeStarted(courseId, chapterId).catch(() => undefined);

    let cancelled = false;
    void (async () => {
      try {
        const resetAt = readResetAt(resetKey);
        const ids = new Set(nextSession.questionIds);
        const attempts = (await listMyPracticeAttempts(courseId))
          .filter((attempt) => ids.has(attempt.questionId) && (!resetAt || attempt.answeredAt > resetAt))
          .sort((first, second) => second.answeredAt.localeCompare(first.answeredAt));
        if (cancelled || !attempts.length) return;

        const answers: PracticeSession["answers"] = {};
        for (const attempt of attempts) {
          if (answers[attempt.questionId]) continue; // newest attempt wins
          answers[attempt.questionId] = {
            questionId: attempt.questionId,
            selectedValue: attempt.answer as PracticeValue,
            submitted: true,
            isCorrect: attempt.isCorrect,
            answeredAt: attempt.answeredAt,
          };
        }
        const firstOpen = nextSession.questionIds.findIndex((id) => !answers[id]);
        const resumeIndex = firstOpen === -1 ? nextSession.questionIds.length - 1 : firstOpen;
        const resumeAnswer = answers[nextSession.questionIds[resumeIndex]];
        setSession({ ...nextSession, answers, currentIndex: resumeIndex });
        setSelectedValue(resumeAnswer?.selectedValue ?? null);
        setSubmitted(Boolean(resumeAnswer?.submitted));
        setRestoredCount(Object.keys(answers).length);
        setLastSavedAt(attempts[0].answeredAt);
      } catch (loadError) {
        // Saved progress is a convenience; practice still works without it.
        console.warn("[Practice] could not load saved progress.", loadError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chapterId, courseId, difficulty, initialQuestions, limit, preview, subtopic, topic, resetKey]);

  const currentQuestion = session?.questionIds[session.currentIndex] ? questions.find((question) => question.id === session.questionIds[session.currentIndex]) ?? null : null;
  const summary = useMemo(() => (session && questions.length ? getPracticeSummary(session, questions) : null), [session, questions]);

  const chapterTitle = title ?? chapterId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const backHref = returnHref ?? `/courses/${courseId}/chapter/${chapterId}`;
  const backLabel = returnLabel ?? "Back to chapter";

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Loading</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Preparing your practice set…</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Practice unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Could not load questions.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">{error}</p>
          <Link href={backHref} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  if (!questions.length || !currentQuestion || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Practice unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">No questions are available yet.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">This chapter does not yet have an active practice set in the hosted question bank.</p>
          <Link href={backHref} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            {backLabel}
          </Link>
        </div>
      </div>
    );
  }

  const currentIndex = session.currentIndex + 1;
  const isCorrect = evaluateQuestionAnswer(currentQuestion, selectedValue);

  const handleSelect = (value: PracticeValue) => {
    if (submitted) return;
    setSelectedValue(value);
  };

  const handleSubmit = async () => {
    if (selectedValue === null || selectedValue === undefined || submitted) return;

    const nextAnswer = {
      questionId: currentQuestion.id,
      selectedValue,
      submitted: true,
      isCorrect: isCorrect,
      answeredAt: new Date().toISOString(),
    };

    setSession((previous) => {
      if (!previous) return previous;
      return {
        ...previous,
        answers: {
          ...previous.answers,
          [currentQuestion.id]: nextAnswer,
        },
      };
    });

    try {
      await recordPracticeAttempt({
        questionId: currentQuestion.id,
        courseId,
        answer: selectedValue,
        isCorrect,
        marksAvailable: currentQuestion.marks,
      });
      setSubmitted(true);
      setLastSavedAt(new Date().toISOString());
    } catch (error) {
      console.error("[Practice] failed to persist attempt.", error);
      setError("Your answer was evaluated, but the attempt could not be saved. Please try again.");
    }
  };

  const handleNext = () => {
    if (!session) return;
    if (session.currentIndex < session.questionIds.length - 1) {
      const nextIndex = session.currentIndex + 1;
      const nextQuestionId = session.questionIds[nextIndex];
      setSession((previous) => previous ? { ...previous, currentIndex: nextIndex } : previous);
      setSelectedValue(session.answers[nextQuestionId]?.selectedValue ?? null);
      setSubmitted(Boolean(session.answers[nextQuestionId]?.submitted));
      setShowHint(false);
      return;
    }

    setSession((previous) => previous ? { ...previous, completed: true, completedAt: new Date().toISOString() } : previous);
    setSessionComplete(true);
  };

  const handleReset = () => {
    writeResetAt(resetKey, new Date().toISOString());
    setRestoredCount(0);
    setLastSavedAt(null);
    const freshQuestions = initialQuestions.filter((question) => {
      if (courseId && question.courseId !== courseId) return false;
      if (chapterId && question.chapterId !== chapterId) return false;
      if (topic && question.topic !== topic) return false;
      if (subtopic && question.subtopic !== subtopic) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      return true;
    }).slice(0, limit);

    const nextSession = createPracticeSession(freshQuestions.map((question) => question.id));
    setQuestions(freshQuestions);
    setSession(nextSession);
    setSelectedValue(null);
    setSubmitted(false);
    setShowHint(false);
    setSessionComplete(false);
  };

  if (sessionComplete && summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-transparent p-6">
        <div className="w-full max-w-2xl rounded-[30px] border border-[#E5E5E5] bg-white p-8 shadow-sm md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-transparent">
            <Trophy className="text-[#2563EB]" size={32} />
          </div>
          <p className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#666666]">Practice complete</p>
          <h1 className="mt-4 text-center editorial-heading text-4xl text-[#111111]">Session summary</h1>
          <div className="mt-8 rounded-2xl border border-[#E5E5E5] bg-transparent p-6">
            <div className="flex items-end justify-center gap-2">
              <span className="font-sans text-6xl font-black text-[#111111]">{summary.correctCount}</span>
              <span className="mb-2 font-sans text-xl text-[#666666]">/ {summary.total}</span>
            </div>
            <p className="mt-3 text-center font-sans text-sm text-[#666666]">Accuracy: {summary.percentage}%</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={handleReset} className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white px-5 py-3 font-sans text-sm font-semibold text-[#111111] transition hover:border-[#111111]">
              <RotateCcw size={16} /> Practice again
            </button>
            <Link href={returnHref ?? `/courses/${courseId}/roadmap`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
              {returnHref ? backLabel : "Return to Roadmap"}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-transparent">
      <header className="flex h-16 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 md:px-8">
        <div className="flex items-center gap-4">
          <Link href={backHref} className="text-[#666666] transition-colors hover:text-[#111111]">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">{chapterTitle}</span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#111111]">Practice</span>
          </div>
        </div>
        <div className="flex items-center gap-3 md:hidden">
          <span className="font-sans text-xs font-semibold text-[#666666]">{currentIndex} / {session.questionIds.length}</span>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <span className="inline-flex items-center gap-1.5 font-sans text-xs text-[#666666]" title="Your answers are saved as you go">
            <CloudCheck size={15} className="text-[#059669]" />
            {lastSavedAt ? "Progress saved" : "Saves as you go"}
          </span>
          <Link href={backHref} className="rounded-full border border-[#E5E5E5] px-4 py-1.5 font-sans text-xs font-semibold text-[#111111] transition hover:border-[#111111]">
            Save &amp; exit
          </Link>
        </div>
        <div className="hidden w-64 items-center gap-3 md:flex">
          <span className="font-sans text-xs font-semibold text-[#666666]">{currentIndex} / {session.questionIds.length}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#E5E5E5]">
            <div className="h-full rounded-full bg-[#111111] transition-all duration-300" style={{ width: `${(currentIndex / session.questionIds.length) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-4xl rounded-[30px] border border-[#E5E5E5] bg-white p-6 shadow-sm md:p-10">
          {restoredCount > 0 ? (
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#FBF3D5] px-4 py-3 font-sans text-sm text-[#1A1814]">
              <span>
                Welcome back — your progress was saved. {restoredCount} of {session.questionIds.length} answered.
              </span>
              <button type="button" onClick={handleReset} className="inline-flex items-center gap-1.5 rounded-full border border-[#1A1814]/30 px-3 py-1.5 text-xs font-semibold hover:border-[#1A1814]">
                <RotateCcw size={13} /> Start over
              </button>
            </div>
          ) : null}
          <QuestionRenderer
            number={currentIndex}
            total={session.questionIds.length}
            question={currentQuestion}
            selectedValue={selectedValue}
            onSelect={handleSelect}
            submitted={submitted}
            showHint={showHint}
            onToggleHint={() => setShowHint((previous) => !previous)}
          />

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#E5E5E5] pt-6">
            <button
              type="button"
              onClick={() => {
                if (!session) return;
                if (session.currentIndex > 0) {
                  const previousIndex = session.currentIndex - 1;
                  const previousQuestionId = session.questionIds[previousIndex];
                  setSession((previous) => previous ? { ...previous, currentIndex: previousIndex } : previous);
                  setSelectedValue(session.answers[previousQuestionId]?.selectedValue ?? null);
                  setSubmitted(Boolean(session.answers[previousQuestionId]?.submitted));
                  setShowHint(false);
                }
              }}
              disabled={session.currentIndex === 0}
              className="rounded-full border border-[#E5E5E5] px-5 py-3 font-sans text-sm font-semibold text-[#666666] transition hover:border-[#111111] hover:text-[#111111] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            {!submitted ? (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={selectedValue === null || selectedValue === undefined}
                className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-7 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Check answer <ArrowRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-7 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]"
              >
                {session.currentIndex === session.questionIds.length - 1 ? "Finish session" : "Next question"} <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function readResetAt(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeResetAt(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); starting over still works for this visit.
  }
}

/**
 * Explanations often begin by restating the answer ("b. will be (first
 * conditional…)"). The correct answer is already shown above, so drop that
 * echo and keep the reasoning.
 */
function trimAnswerEcho(text: string, option?: { label: string; text: string }) {
  if (!option || !text) return text;
  let rest = text;
  const letter = new RegExp(`^${option.label}(?:/[a-d])?[.)]\\s*`, "i");
  if (!letter.test(rest)) return text;
  rest = rest.replace(letter, "");
  const optionText = option.text.trim().replace(/[.]+$/, "");
  if (optionText && rest.toLowerCase().startsWith(optionText.toLowerCase())) rest = rest.slice(optionText.length);
  rest = rest.replace(/^[\s.,;:–—-]+/, "").trim();
  if (rest.startsWith("(") && rest.endsWith(")")) rest = rest.slice(1, -1).trim();
  if (!rest) return "";
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}
