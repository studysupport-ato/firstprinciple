"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ChevronLeft, RotateCcw, Trophy } from "lucide-react";
import Link from "next/link";
import { EducationalText } from "@/components/learning/EducationalText";

import type { Difficulty, Question } from "@/lib/content/types/question";
import { createPracticeSession, evaluateQuestionAnswer, getPracticeSummary, type PracticeSession, type PracticeValue } from "@/lib/practice/session";
import { recordPracticeAttempt, recordPracticeStarted } from "@/lib/progress";

// ── Option row letter mapping ───────────────────────────────────────────────
const OPTION_LETTERS = ["A", "B", "C", "D", "E"];

function QuestionRenderer({
  question,
  selectedValue,
  onSelect,
  submitted,
}: {
  question: Question;
  selectedValue: PracticeValue;
  onSelect: (value: PracticeValue) => void;
  submitted: boolean;
}) {
  const optionMap = question.options ?? [];

  return (
    <div className="space-y-4">
      {/* Question prompt */}
      <h2 className="font-sans text-[28px] font-black leading-[1.15] text-[#F6EFDC] md:text-[26px] md:font-bold md:leading-snug">
        <EducationalText text={question.prompt} />
      </h2>

      {/* Options */}
      {question.type === "multiple-choice" && optionMap.length > 0 ? (
        <div className="mt-6 space-y-3">
          {optionMap.map((option, idx) => {
            const isSelected = selectedValue === option.id;
            const isCorrect = option.id === question.correctAnswer;

            let rowClass = "border-[#3A3428] bg-[#26231C] hover:border-[#E9BC3A]/40";
            let badgeClass = "bg-[#3A3428] text-[#F6EFDC]/70";
            let labelClass = "text-[#F6EFDC]";
            let statusLabel: React.ReactNode = null;

            if (submitted) {
              if (isCorrect) {
                rowClass = "border-[#22c55e] bg-[#26231C]";
                badgeClass = "bg-[#22c55e] text-white";
                labelClass = "text-[#F6EFDC]";
                statusLabel = <span className="ml-auto shrink-0 font-bold text-[#22c55e] text-[13px]">Correct</span>;
              } else if (isSelected && !isCorrect) {
                rowClass = "border-[#3A3428] bg-[#26231C] opacity-60";
                badgeClass = "bg-[#3A3428] text-[#F6EFDC]/50";
                labelClass = "text-[#F6EFDC]/60";
              } else {
                rowClass = "border-[#3A3428] bg-[#26231C] opacity-40";
                badgeClass = "bg-[#3A3428] text-[#F6EFDC]/40";
                labelClass = "text-[#F6EFDC]/50";
              }
            } else if (isSelected) {
              rowClass = "border-[#E9BC3A] bg-[#26231C]";
              badgeClass = "bg-[#E9BC3A] text-[#1A1814]";
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onSelect(option.id)}
                disabled={submitted}
                className={`flex w-full items-center gap-4 rounded-[14px] border px-5 py-4 text-left transition-all ${rowClass}`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-black ${badgeClass}`}>
                  {OPTION_LETTERS[idx]}
                </span>
                <span className={`flex-1 font-sans text-[16px] font-semibold italic ${labelClass}`}>
                  <EducationalText text={option.text} />
                </span>
                {statusLabel}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="mt-6 rounded-[14px] border border-[#3A3428] bg-[#26231C] px-5 py-4">
          <label className="mb-2 block font-sans text-[10px] font-bold uppercase tracking-[0.22em] text-[#F6EFDC]/50">
            Your answer
          </label>
          <input
            type={question.type === "numerical" ? "number" : "text"}
            value={selectedValue === null || selectedValue === undefined ? "" : String(selectedValue)}
            onChange={(e) => onSelect(question.type === "numerical" ? Number(e.target.value) : e.target.value)}
            disabled={submitted}
            placeholder={question.type === "numerical" ? "Enter a number" : "Type your answer"}
            className="w-full bg-transparent font-sans text-base text-[#F6EFDC] outline-none placeholder:text-[#F6EFDC]/30"
          />
        </div>
      )}

      {/* Explanation after submit */}
      {submitted && question.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-[14px] border border-[#3A3428] bg-[#26231C] px-5 py-4"
        >
          <p className="font-sans text-[14px] leading-relaxed text-[#F6EFDC]/90">
            <span className="font-black text-[#93C5FD]">Why:</span>{" "}
            <EducationalText text={question.explanation} />
          </p>
        </motion.div>
      )}
    </div>
  );
}

export default function PracticeExperience({
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
  const [submitted, setSubmitted] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerSaved, setAnswerSaved] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const selected = initialQuestions.filter((q) => {
      if (courseId && q.courseId !== courseId) return false;
      if (chapterId && q.chapterId !== chapterId) return false;
      if (topic && q.topic !== topic) return false;
      if (subtopic && q.subtopic !== subtopic) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      return true;
    }).slice(0, limit);

    setQuestions(selected);

    if (!selected.length) {
      setSession(null);
      setSessionComplete(false);
      return;
    }

    const nextSession = createPracticeSession(selected.map((q) => q.id));
    setSession(nextSession);
    setSelectedValue(null);
    setSubmitted(false);
    setSessionComplete(false);
    setAnswerSaved(false);
    recordPracticeStarted(courseId, chapterId);
  }, [chapterId, courseId, difficulty, initialQuestions, limit, preview, subtopic, topic]);

  const currentQuestion = session?.questionIds[session.currentIndex]
    ? questions.find((q) => q.id === session.questionIds[session.currentIndex]) ?? null
    : null;
  const summary = useMemo(() => (session && questions.length ? getPracticeSummary(session, questions) : null), [session, questions]);
  const chapterTitle = chapterId.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  const resetSession = () => {
    const freshQuestions = initialQuestions.filter((q) => {
      if (courseId && q.courseId !== courseId) return false;
      if (chapterId && q.chapterId !== chapterId) return false;
      if (topic && q.topic !== topic) return false;
      if (subtopic && q.subtopic !== subtopic) return false;
      if (difficulty && q.difficulty !== difficulty) return false;
      return true;
    }).slice(0, limit);
    setQuestions(freshQuestions);
    setSession(createPracticeSession(freshQuestions.map((q) => q.id)));
    setSelectedValue(null);
    setSubmitted(false);
    setSessionComplete(false);
    setAnswerSaved(false);
  };

  if (!mounted) return null;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1814] p-6">
        <p className="font-sans text-[14px] text-[#F6EFDC]/60">Preparing your questions…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1814] p-6">
        <div className="max-w-lg rounded-[24px] bg-[#26231C] p-10 text-center">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#F6EFDC]/50">Practice unavailable</p>
          <h1 className="mt-4 font-sans text-3xl font-black text-[#F6EFDC]">Could not load questions.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#F6EFDC]/60">{error}</p>
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8F6500] px-6 py-3 font-sans text-sm font-semibold text-[#F6EFDC] transition hover:brightness-110">
            Back to chapter
          </Link>
        </div>
      </div>
    );
  }

  if (!questions.length || !currentQuestion || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1814] p-6">
        <div className="max-w-lg rounded-[24px] bg-[#26231C] p-10 text-center">
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.28em] text-[#F6EFDC]/50">Practice unavailable</p>
          <h1 className="mt-4 font-sans text-3xl font-black text-[#F6EFDC]">No questions available yet.</h1>
          <p className="mt-4 font-sans text-sm leading-relaxed text-[#F6EFDC]/60">This chapter doesn&apos;t have an active practice set yet.</p>
          <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#8F6500] px-6 py-3 font-sans text-sm font-semibold text-[#F6EFDC] transition hover:brightness-110">
            Back to chapter
          </Link>
        </div>
      </div>
    );
  }

  // ── Session complete ────────────────────────────────────────────────────────
  if (sessionComplete && summary) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1A1814] p-6">
        <div className="w-full max-w-2xl rounded-[24px] bg-[#26231C] p-8 text-center md:p-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#E9BC3A]/10">
            <Trophy className="text-[#E9BC3A]" size={32} />
          </div>
          <p className="font-sans text-[10px] font-bold uppercase tracking-[0.24em] text-[#F6EFDC]/50">Practice complete</p>
          <h1 className="mt-4 font-sans text-4xl font-black text-[#F6EFDC]">Session summary</h1>
          <div className="mt-8 rounded-[16px] border border-[#3A3428] p-6">
            <div className="flex items-end justify-center gap-2">
              <span className="font-sans text-6xl font-black text-[#F6EFDC]">{summary.correctCount}</span>
              <span className="mb-2 font-sans text-xl text-[#F6EFDC]/50">/ {summary.total}</span>
            </div>
            <p className="mt-3 font-sans text-sm text-[#F6EFDC]/60">Accuracy: {summary.percentage}%</p>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={resetSession}
              className="flex flex-1 items-center justify-center gap-2 rounded-full border border-[#3A3428] px-5 py-3 font-sans text-sm font-semibold text-[#F6EFDC] transition hover:border-[#E9BC3A]"
            >
              <RotateCcw size={16} /> Practice again
            </button>
            <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#8F6500] px-5 py-3 font-sans text-sm font-semibold text-[#F6EFDC] transition hover:brightness-110">
              Back to chapter
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const currentIndex = session.currentIndex + 1;
  const isCorrect = evaluateQuestionAnswer(currentQuestion, selectedValue);
  const totalQuestions = session.questionIds.length;

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
      isCorrect,
      answeredAt: new Date().toISOString(),
    };

    setSession((prev) => {
      if (!prev) return prev;
      return { ...prev, answers: { ...prev.answers, [currentQuestion.id]: nextAnswer } };
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
      setAnswerSaved(true);
    } catch (err) {
      console.error("[Practice] failed to persist attempt.", err);
      setError("Your answer was evaluated, but could not be saved.");
    }
  };

  const handleNext = () => {
    if (!session) return;
    if (session.currentIndex < session.questionIds.length - 1) {
      const nextIndex = session.currentIndex + 1;
      const nextQuestionId = session.questionIds[nextIndex];
      setSession((prev) => prev ? { ...prev, currentIndex: nextIndex } : prev);
      setSelectedValue(() => session.answers[nextQuestionId]?.selectedValue ?? null);
      setSubmitted(!!session.answers[nextQuestionId]?.submitted);
      setAnswerSaved(!!session.answers[nextQuestionId]?.submitted);
      return;
    }
    setSession((prev) => prev ? { ...prev, completed: true, completedAt: new Date().toISOString() } : prev);
    setSessionComplete(true);
  };

  const handlePrev = () => {
    if (!session || session.currentIndex === 0) return;
    const prevIndex = session.currentIndex - 1;
    const prevQuestionId = session.questionIds[prevIndex];
    setSession((prev) => prev ? { ...prev, currentIndex: prevIndex } : prev);
    setSelectedValue(session.answers[prevQuestionId]?.selectedValue ?? null);
    setSubmitted(!!session.answers[prevQuestionId]?.submitted);
    setAnswerSaved(!!session.answers[prevQuestionId]?.submitted);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#1A1814]">
      {/* ── TOP HEADER BAR ── */}
      <header className="flex h-16 md:h-14 items-center justify-between bg-[#111108] px-5 md:px-8">
        <Link href={`/courses/${courseId}/chapter/${chapterId}`} className="text-[#F6EFDC]/80 transition hover:text-[#F6EFDC]">
          <ChevronLeft size={22} strokeWidth={2.5} />
        </Link>
        <div className="flex flex-col items-center">
          <div className="font-sans text-[10px] font-black uppercase tracking-widest text-[#F6EFDC]/60 md:hidden">
            PRACTICE SESSION
          </div>
          <div className="font-sans text-[15px] font-bold text-[#F6EFDC] md:text-[12px] md:text-[#F6EFDC]/60">
            {chapterTitle}
          </div>
        </div>
        <div className="font-sans text-[15px] font-bold text-[#F6EFDC] md:text-[13px] md:text-[#F6EFDC]/70">
          <span className="hidden md:inline">Question </span>{currentIndex}<span className="hidden md:inline"> of </span><span className="md:hidden">/</span>{totalQuestions}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex flex-1 justify-center px-5 py-8 md:px-10 md:py-12">
        <div className="w-full max-w-2xl">
          <div className="rounded-[20px] bg-[#26231C] p-6 md:p-8">
            {/* CHECK YOUR UNDERSTANDING label */}
            <p className="mb-4 font-sans text-[10px] font-black uppercase tracking-[0.2em] text-[#F6EFDC]/60">
              Check your understanding
            </p>

            {/* Segmented progress bar */}
            <div className="mb-6 flex gap-1.5">
              {Array.from({ length: totalQuestions }).map((_, i) => {
                const qId = session.questionIds[i];
                const answered = !!session.answers[qId]?.submitted;
                const answeredCorrect = answered && evaluateQuestionAnswer(
                  questions.find(q => q.id === qId) ?? currentQuestion,
                  session.answers[qId]?.selectedValue
                );
                let segColor = "bg-[#3A3428]";
                if (answered) {
                  segColor = answeredCorrect ? "bg-[#22c55e]" : "bg-[#E9BC3A]";
                } else if (i === session.currentIndex) {
                  segColor = "bg-[#E9BC3A]";
                }
                return <div key={i} className={`h-[5px] flex-1 rounded-full transition-all duration-300 ${segColor}`} />;
              })}
            </div>

            <QuestionRenderer
              question={currentQuestion}
              selectedValue={selectedValue}
              onSelect={handleSelect}
              submitted={submitted}
            />
          </div>
        </div>
      </main>

      {/* ── BOTTOM NAV BAR ── */}
      <footer className="border-t-0 md:border-t md:border-[#3A3428] bg-[#1A1814] px-5 py-5 md:px-6 md:py-4">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={handlePrev}
            disabled={session.currentIndex === 0}
            className="shrink-0 rounded-full border border-[#E9BC3A] px-6 py-3 font-sans text-[15px] font-bold text-[#F6EFDC] transition hover:bg-[#E9BC3A]/10 disabled:opacity-30 disabled:cursor-not-allowed md:px-6 md:py-2.5 md:text-[14px] md:text-[#E9BC3A]"
          >
            Previous
          </button>

          <span className="hidden font-sans text-[13px] font-medium text-[#F6EFDC]/60 md:inline">
            {answerSaved ? "Answer saved" : ""}
          </span>

          {!submitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={selectedValue === null || selectedValue === undefined}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#8F6500] px-6 py-3 font-sans text-[15px] font-bold text-[#F6EFDC] transition hover:brightness-110 disabled:opacity-30 disabled:cursor-not-allowed md:w-auto md:py-2.5 md:text-[14px]"
            >
              Check answer <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleNext}
              className="flex w-full items-center justify-center rounded-full bg-[#8F6500] px-6 py-3 font-sans text-[15px] font-bold text-[#F6EFDC] transition hover:brightness-105 md:w-auto md:bg-[#E9BC3A] md:py-2.5 md:text-[14px] md:text-[#1A1814]"
            >
              {session.currentIndex === session.questionIds.length - 1 ? "Complete Day" : "Next question"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
