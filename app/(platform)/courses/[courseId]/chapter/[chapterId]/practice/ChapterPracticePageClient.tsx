"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, CheckCircle2, ChevronLeft, Lightbulb, RotateCcw, Trophy, XCircle } from "lucide-react";
import Link from "next/link";
import katex from "katex";
import type { Difficulty, Question } from "@/lib/content/types/question";
import { createPracticeSession, evaluateQuestionAnswer, getPracticeSummary, type PracticeSession, type PracticeValue } from "@/lib/practice/session";
import { recordPracticeAttempt, recordPracticeStarted } from "@/lib/progress";

function MathText({ math, block = false }: { math: string; block?: boolean }) {
  const html = katex.renderToString(math, { displayMode: block, throwOnError: false });
  return <span dangerouslySetInnerHTML={{ __html: html }} className={`font-serif ${block ? "my-6 block text-center text-xl" : "inline"}`} />;
}

function QuestionRenderer({
  question,
  selectedValue,
  onSelect,
  submitted,
  showHint,
  onToggleHint,
}: {
  question: Question;
  selectedValue: PracticeValue;
  onSelect: (value: PracticeValue) => void;
  submitted: boolean;
  showHint: boolean;
  onToggleHint: () => void;
}) {
  const optionMap = question.options ?? [];

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5">
        <span className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#2563EB]">Practice question</span>
        <h2 className="mt-4 editorial-heading text-2xl md:text-3xl text-[#111111] leading-relaxed">
          {question.prompt.split(/(\$.*?\$)/g).map((part, index) => {
            if (part.startsWith("$") && part.endsWith("$")) {
              return <MathText key={index} math={part.slice(1, -1)} />;
            }
            return <span key={index}>{part}</span>;
          })}
        </h2>
      </div>

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
                  {option.text.split(/(\$.*?\$)/g).map((part, index) => {
                    if (part.startsWith("$") && part.endsWith("$")) {
                      return <MathText key={index} math={part.slice(1, -1)} />;
                    }
                    return <span key={index}>{part}</span>;
                  })}
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
          <input
            type={question.type === "numerical" ? "number" : "text"}
            value={selectedValue === null || selectedValue === undefined ? "" : String(selectedValue)}
            onChange={(event) => onSelect(question.type === "numerical" ? Number(event.target.value) : event.target.value)}
            disabled={submitted}
            placeholder={question.type === "numerical" ? "Enter a number" : "Type your answer"}
            className="w-full rounded-xl border border-[#E5E5E5] bg-[#F7F7F8] px-4 py-3 font-sans text-base text-[#111111] outline-none transition focus:border-[#2563EB]"
          />
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
              {question.hint.split(/(\$.*?\$)/g).map((part, index) => {
                if (part.startsWith("$") && part.endsWith("$")) {
                  return <MathText key={index} math={part.slice(1, -1)} />;
                }
                return <span key={index}>{part}</span>;
              })}
            </p>
          ) : null}
        </div>
      )}

      {submitted ? (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-5"
        >
          <div className="flex items-center gap-2 font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">
            {evaluateQuestionAnswer(question, selectedValue) ? <Check size={14} className="text-[#059669]" /> : <XCircle size={14} className="text-[#E11D48]" />}
            {evaluateQuestionAnswer(question, selectedValue) ? "Correct" : "Feedback"}
          </div>
          <p className="mt-3 font-sans text-sm leading-relaxed text-[#111111]">
            {question.explanation.split(/(\$.*?\$)/g).map((part, index) => {
              if (part.startsWith("$") && part.endsWith("$")) {
                return <MathText key={index} math={part.slice(1, -1)} />;
              }
              return <span key={index}>{part}</span>;
            })}
          </p>
        </motion.div>
      ) : null}
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
}: {
  initialQuestions: Question[];
  courseId: string;
  chapterId: string;
  preview: boolean;
  topic?: string;
  subtopic?: string;
  difficulty?: Difficulty;
  limit: number;
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
    recordPracticeStarted(courseId, chapterId);
  }, [chapterId, courseId, difficulty, initialQuestions, limit, preview, subtopic, topic]);

  const currentQuestion = session?.questionIds[session.currentIndex] ? questions.find((question) => question.id === session.questionIds[session.currentIndex]) ?? null : null;
  const summary = useMemo(() => (session && questions.length ? getPracticeSummary(session, questions) : null), [session, questions]);

  const chapterTitle = chapterId.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Loading</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Preparing your practice set…</h1>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Practice unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">Could not load questions.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">{error}</p>
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            Back to chapter
          </Link>
        </div>
      </div>
    );
  }

  if (!questions.length || !currentQuestion || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="max-w-lg rounded-[30px] border border-[#E5E5E5] bg-white p-10 text-center shadow-sm">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#666666]">Practice unavailable</p>
          <h1 className="mt-4 editorial-heading text-4xl text-[#111111]">No questions are available yet.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#666666]">This chapter does not yet have an active practice set in the hosted question bank.</p>
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
            Back to chapter
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
      setSelectedValue((previous) => {
        const previousSession = session ?? previous;
        return previousSession.answers[nextQuestionId]?.selectedValue ?? null;
      });
      setSubmitted(false);
      setShowHint(false);
      return;
    }

    setSession((previous) => previous ? { ...previous, completed: true, completedAt: new Date().toISOString() } : previous);
    setSessionComplete(true);
  };

  const handleReset = () => {
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F8] p-6">
        <div className="w-full max-w-2xl rounded-[30px] border border-[#E5E5E5] bg-white p-8 shadow-sm md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#F7F7F8]">
            <Trophy className="text-[#2563EB]" size={32} />
          </div>
          <p className="text-center font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#666666]">Practice complete</p>
          <h1 className="mt-4 text-center editorial-heading text-4xl text-[#111111]">Session summary</h1>
          <div className="mt-8 rounded-2xl border border-[#E5E5E5] bg-[#F7F7F8] p-6">
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
            <Link href={`/courses/${courseId}/roadmap`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#111111] px-5 py-3 font-sans text-sm font-semibold text-white transition hover:bg-[#2563EB]">
              Return to Roadmap
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F7F8]">
      <header className="flex h-16 items-center justify-between border-b border-[#E5E5E5] bg-white px-6 md:px-8">
        <div className="flex items-center gap-4">
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="text-[#666666] transition-colors hover:text-[#111111]">
            <ChevronLeft size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#666666]">{chapterTitle}</span>
            <span className="text-[#E5E5E5]">/</span>
            <span className="font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#111111]">Practice</span>
          </div>
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
          <QuestionRenderer
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
                  setSubmitted(false);
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
